local M = {}
function M.quote(value)
    return '"' .. tostring(value):gsub('[%z\1-\31\\"]', function(c)
        if c == '"' then return '\\"' end
        if c == '\\' then return '\\\\' end
        return string.format('\\u%04x', c:byte())
    end) .. '"'
end
function M.encode(fields)
    local values = {}
    for key, value in pairs(fields) do
        values[#values + 1] = M.quote(key) .. ':' .. ((type(value) == 'number' or type(value) == 'boolean') and tostring(value) or M.quote(value))
    end
    return '{' .. table.concat(values, ',') .. '}'
end
function M.new(root, schema)
    local self = {root = root, schema = schema, sequence = 0, boundary = 0,
        session = tostring(os.time()) .. '-' .. tostring({}):gsub('table: ', '')}
    os.execute("mkdir -p '" .. root:gsub("'", "'\\''") .. "/activity'")
    function self:focus()
        local file = io.open(self.root .. '/focus.state', 'r')
        local value = file and file:read('*l') or nil
        if file then file:close() end
        return value
    end
    function self:stamp()
        self.sequence = self.sequence + 1
        local offset = os.date('%z')
        return {sessionId = self.session, sequence = self.sequence, processClock = os.clock(),
            boundaryId = self.session .. ':' .. self.boundary, focusId = self:focus(),
            occurredAt = os.date('%Y-%m-%dT%H:%M:%S') .. offset:sub(1,3) .. ':' .. offset:sub(4,5)}
    end
    function self:emit(kind, fields)
        local record = self:stamp()
        record.kind, record.schemaId, record.schemaVersion = kind, self.schema, '1.0'
        for k, v in pairs(fields or {}) do record[k] = v end
        local file = io.open(self.root .. '/activity/' .. record.occurredAt:sub(1,10) .. '.jsonl', 'a')
        if file then file:write(M.encode(record), '\n'); file:close() end
        return record
    end
    function self:split(kind)
        self.boundary = self.boundary + 1
        self:emit(kind)
    end
    return self
end
return M
