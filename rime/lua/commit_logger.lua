local logger = {}

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

    local now = iso_now()
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
    if env.commit_connection then
        env.commit_connection:disconnect()
    end
end

return logger
