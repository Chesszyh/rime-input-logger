local fcitx = require('fcitx')
local root = os.getenv('RIME_COMMIT_LOG_ROOT') or ((os.getenv('HOME') or '.') .. '/.local/share/personal-input-analytics')
local serial = 0
local session = tostring(os.time()) .. '-' .. tostring({}):gsub('table: ', '')
os.execute("mkdir -p '" .. root:gsub("'", "'\\''") .. "/activity'")
local function boundary(reason)
    serial = serial + 1
    local id = session .. ':' .. serial .. ':' .. reason
    local offset = os.date('%z')
    local now = os.date('%Y-%m-%dT%H:%M:%S') .. offset:sub(1,3) .. ':' .. offset:sub(4,5)
    local log = io.open(root .. '/activity/' .. now:sub(1,10) .. '.jsonl', 'a')
    if log then
        log:write(string.format('{"kind":"%s","occurredAt":"%s","focusId":"%s"}\n', reason, now, id))
        log:close()
    end
    local file = io.open(root .. '/focus.state.tmp', 'w')
    if file then
        file:write(session .. ':' .. serial .. ':' .. reason, '\n')
        file:close()
        os.rename(root .. '/focus.state.tmp', root .. '/focus.state')
    end
end
function journal_focus_in() boundary('focus_in') end
function journal_focus_out() boundary('focus_out') end
function journal_input_method() boundary('input_method') end
fcitx.watchEvent(fcitx.EventType.FocusIn, 'journal_focus_in')
fcitx.watchEvent(fcitx.EventType.FocusOut, 'journal_focus_out')
fcitx.watchEvent(fcitx.EventType.SwitchInputMethod, 'journal_input_method')
boundary('start')
