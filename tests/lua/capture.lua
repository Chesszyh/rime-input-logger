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
logger.fini(env)
assert(disconnected)
