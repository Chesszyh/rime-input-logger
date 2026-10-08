package.path = "rime/lua/?.lua;" .. package.path
local logger = dofile("rime/lua/commit_logger.lua")
local callback
local disconnected = false
local context = { input = "shu ru" }
context.commit_notifier = {
    connect = function(_, fn)
        callback = fn
        return { disconnect = function() disconnected = true end }
    end
}
local callbacks = {}
for _, name in ipairs({"update_notifier", "option_update_notifier", "unhandled_key_notifier"}) do
    context[name] = {connect = function(_, fn)
        callbacks[name] = fn
        return {disconnect = function() end}
    end}
end
local config = {
    get_string = function(_, key)
        if key == "schema/schema_id" then return "journal_test" end
        if key == "commit_logger/root" then return arg[1] end
    end,
    get_bool = function() return false end
}
local env = { engine = { schema = { config = config }, context = context } }
logger.init(env)
assert(logger.func(nil, env) == 2)
local function commit(text, input)
    context.input = input
    context.get_commit_text = function() return text end
    callback(context)
end
commit('输入分析 "Rime"\n第二行\t\\😀', "shu ru")
commit("", "")
-- A commit without inputCode must still contain language and character count.
commit("报告", nil)
context.input = "cancelled"
logger.func(nil, env)
context.input = ""
logger.func(nil, env)
commit("新提交", "")
context.is_composing = function() return context.input ~= "" end
context.get_option = function() return true end
context.input = "abc"
callbacks.update_notifier(context)
context.input = ""
callbacks.update_notifier(context)
local function key(code, ctrl, release)
    return {keycode = code, ctrl = function() return ctrl or false end,
        alt = function() return false end, super = function() return false end,
        release = function() return release or false end}
end
callbacks.unhandled_key_notifier(context, key(97))
callbacks.unhandled_key_notifier(context, key(98))
callbacks.unhandled_key_notifier(context, key(99, true))
callbacks.unhandled_key_notifier(context, key(100, false, true))
callbacks.unhandled_key_notifier(context, key(65288))
callbacks.option_update_notifier(context, "ascii_mode")
logger.fini(env)
assert(disconnected)
