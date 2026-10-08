local logger = {}
local journal_events = require("journal_events")

local function shell_quote(value)
    return "'" .. tostring(value):gsub("'", "'\\''") .. "'"
end

local function expand_home(path)
    local home = os.getenv("HOME") or "."
    return tostring(path):gsub("^~", home)
end

local function json_escape(value)
    return tostring(value)
        :gsub("\\", "\\\\")
        :gsub('"', '\\"')
        :gsub("\b", "\\b")
        :gsub("\f", "\\f")
        :gsub("\n", "\\n")
        :gsub("\r", "\\r")
        :gsub("\t", "\\t")
        :gsub("[%z\1-\31]", function(char)
            return string.format("\\u%04x", string.byte(char))
        end)
end

local function json_field(name, value, raw)
    if value == nil then
        return nil
    end

    if raw then
        return string.format('"%s":%s', name, tostring(value))
    end

    return string.format('"%s":"%s"', name, json_escape(value))
end

local function timezone_offset()
    local value = os.date("%z")
    return value:sub(1, 3) .. ":" .. value:sub(4, 5)
end

local function iso_now()
    return os.date("%Y-%m-%dT%H:%M:%S") .. timezone_offset()
end

local function append_debug(env, message)
    if not env or not env.debug_enabled or not env.debug_path then
        return
    end

    local file = io.open(env.debug_path, "a")
    if file then
        file:write(iso_now(), " ", tostring(message), "\n")
        file:close()
    end
end

local function char_count(text)
    local ok, count = pcall(function()
        local total = 0
        for _ in utf8.codes(text) do
            total = total + 1
        end
        return total
    end)

    if ok then
        return count
    end

    return #text
end

local function detect_language(text)
    local has_han = false
    local has_latin = false

    pcall(function()
        for _, codepoint in utf8.codes(text) do
            if codepoint >= 0x4e00 and codepoint <= 0x9fff then
                has_han = true
            elseif
                (codepoint >= 0x41 and codepoint <= 0x5a)
                or (codepoint >= 0x61 and codepoint <= 0x7a)
            then
                has_latin = true
            end
        end
    end)

    if has_han and has_latin then
        return "mixed"
    end
    if has_han then
        return "zh-CN"
    end
    if has_latin then
        return "en-US"
    end
    return "mixed"
end

local function append_record(env, ctx)
    append_debug(env, "commit_notifier fired")

    local text = ctx:get_commit_text()
    if text == nil or text == "" then
        append_debug(env, "commit skipped: empty commit text")
        return
    end

    local stamp = env.events:stamp()
    local now = stamp.occurredAt
    env.committed = true
    local date_key = now:sub(1, 10)
    local file_path = env.log_dir .. "/" .. date_key .. ".jsonl"
    os.execute("mkdir -p " .. shell_quote(env.log_dir))

    local input_code = ctx.input
    if input_code == nil or input_code == "" then
        input_code = env.last_input
    end

    local fields = {
        json_field("schemaVersion", "1.0"),
        json_field("occurredAt", now),
        json_field("dateKey", date_key),
        json_field("source", "rime"),
        json_field("schemaId", env.schema_id),
        json_field("text", text),
        json_field("textLanguage", detect_language(text)),
        json_field("charCount", char_count(text), true),
        json_field("sessionId", stamp.sessionId),
        json_field("sequence", stamp.sequence, true),
        json_field("processClock", stamp.processClock, true),
        json_field("boundaryId", stamp.boundaryId),
        json_field("focusId", stamp.focusId or "unobserved"),
        json_field("inputCode", input_code)
    }

    env.last_input = nil

    local compact = {}
    for _, field in ipairs(fields) do
        if field then
            table.insert(compact, field)
        end
    end

    local file, err = io.open(file_path, "a")
    if file then
        file:write("{" .. table.concat(compact, ",") .. "}\n")
        file:close()
        append_debug(env, "commit written: " .. file_path)
    else
        append_debug(env, "commit write failed: " .. file_path .. " " .. tostring(err))
    end
end

function logger.init(env)
    local config = env.engine.schema.config
    local configured_root = os.getenv("RIME_COMMIT_LOG_ROOT")
        or config:get_string("commit_logger/root")
        or "~/.local/share/personal-input-analytics"

    env.events = journal_events.new(expand_home(configured_root), config:get_string("schema/schema_id") or "unknown")
    env.composing = false
    env.committed = false
    env.log_dir = expand_home(configured_root) .. "/raw"
    env.debug_path = expand_home(configured_root) .. "/debug.log"
    env.schema_id = config:get_string("schema/schema_id") or "unknown"
    env.debug_enabled = os.getenv("RIME_COMMIT_LOG_DEBUG") == "1"
        or config:get_bool("commit_logger/debug")
    env.last_input = nil
    env.func_debug_count = 0
    os.execute("mkdir -p " .. shell_quote(expand_home(configured_root)))
    append_debug(env, "init schema=" .. env.schema_id .. " log_dir=" .. env.log_dir)
    env.commit_connection = env.engine.context.commit_notifier:connect(function(ctx)
        append_record(env, ctx)
    end)
    env.update_connection = env.engine.context.update_notifier:connect(function(ctx)
        local composing = ctx:is_composing()
        if composing and not env.composing then
            env.committed = false
            env.events:emit("composition_start")
        elseif not composing and env.composing then
            env.events:emit("composition_end", {reason = env.committed and "commit" or "cancel"})
            if not env.committed then env.events:split("cancel_boundary") end
        end
        env.composing = composing
    end)
    env.option_connection = env.engine.context.option_update_notifier:connect(function(_, name)
        if name == "ascii_mode" then env.events:emit("mode_change", {asciiMode = env.engine.context:get_option("ascii_mode")}) end
    end)
    env.unhandled_connection = env.engine.context.unhandled_key_notifier:connect(function(ctx, key)
        if key:release() then return end
        if key:ctrl() or key:alt() or key:super() then
            env.events:split("shortcut_boundary")
            return
        end
        local code = key.keycode
        if ctx:get_option("ascii_mode") and code >= 32 and code <= 126 then
            env.events:emit("english_observation", {text = string.char(code)})
        elseif code == 65288 or code == 65535 or code == 65293 or code == 65289 or (code >= 65360 and code <= 65367) then
            env.events:split("edit_boundary")
        end
    end)
end

function logger.func(_, env)
    local input = env.engine.context.input
    env.last_input = input ~= "" and input or nil
    if input and input ~= "" then
        if env.func_debug_count < 5 then
            env.func_debug_count = env.func_debug_count + 1
            append_debug(env, "processor input=" .. input)
        end
    end

    return 2
end

function logger.fini(env)
    for _, name in ipairs({"commit_connection", "update_connection", "option_connection", "unhandled_connection"}) do
        if env[name] then env[name]:disconnect() end
    end
    env.events:emit("session_end")
end

return logger
