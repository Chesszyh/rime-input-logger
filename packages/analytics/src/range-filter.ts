import type {
  InputRecordEvent,
  InputSession,
  TimeRange
} from "../../contracts/src/index";

const SECOND_MS = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ResolvedRange extends TimeRange {
  startAt: string;
  endAt: string;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const pad = (value: number): string => String(value).padStart(2, "0");

const parseIsoTimestamp = (value: string): number | null => {
  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
};

const parseOffsetMinutes = (value: string): number => {
  if (value.endsWith("Z")) {
    return 0;
  }

  const match = value.match(/([+-])(\d{2}):(\d{2})$/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);

  return sign * (hours * 60 + minutes);
};

const formatOffset = (offsetMinutes: number): string => {
  if (offsetMinutes === 0) {
    return "+00:00";
  }

  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;

  return `${sign}${pad(hours)}:${pad(minutes)}`;
};

const toDatePartsAtOffset = (
  timestamp: number,
  offsetMinutes: number
): DateParts => {
  const shifted = new Date(timestamp + offsetMinutes * 60 * 1000);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds()
  };
};

const fromDatePartsAtOffset = (
  parts: DateParts,
  offsetMinutes: number
): number =>
  Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  ) -
  offsetMinutes * 60 * 1000;

const toIsoAtOffset = (timestamp: number, offsetMinutes: number): string => {
  const parts = toDatePartsAtOffset(timestamp, offsetMinutes);

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(
    parts.minute
  )}:${pad(parts.second)}${formatOffset(offsetMinutes)}`;
};

const dayStartTimestamp = (timestamp: number, offsetMinutes: number): number => {
  const parts = toDatePartsAtOffset(timestamp, offsetMinutes);

  return fromDatePartsAtOffset(
    {
      ...parts,
      hour: 0,
      minute: 0,
      second: 0
    },
    offsetMinutes
  );
};

const dayEndTimestamp = (timestamp: number, offsetMinutes: number): number => {
  const parts = toDatePartsAtOffset(timestamp, offsetMinutes);

  return fromDatePartsAtOffset(
    {
      ...parts,
      hour: 23,
      minute: 59,
      second: 59
    },
    offsetMinutes
  );
};

const resolveOffsetMinutes = (
  range: TimeRange,
  nowIso: string
): number =>
  parseOffsetMinutes(range.startAt ?? range.endAt ?? nowIso);

export const toDateKeyAtOffset = (
  timestamp: number,
  offsetMinutes: number
): string => {
  const parts = toDatePartsAtOffset(timestamp, offsetMinutes);

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
};

export const toDateKeyFromIso = (iso: string): string => {
  const timestamp = parseIsoTimestamp(iso);
  if (timestamp === null) {
    return iso.slice(0, 10);
  }

  const offsetMinutes = parseOffsetMinutes(iso);

  return toDateKeyAtOffset(timestamp, offsetMinutes);
};

export const resolveRangeFromQuery = (
  range: TimeRange,
  nowIso = new Date().toISOString()
): ResolvedRange => {
  const nowTimestamp = parseIsoTimestamp(nowIso) ?? Date.now();
  const offsetMinutes = resolveOffsetMinutes(range, nowIso);

  if (range.preset === "custom" && range.startAt && range.endAt) {
    return {
      ...range,
      startAt: range.startAt,
      endAt: range.endAt
    };
  }

  const todayStart = dayStartTimestamp(nowTimestamp, offsetMinutes);
  const todayEnd = dayEndTimestamp(nowTimestamp, offsetMinutes);

  let start = todayStart;
  let end = todayEnd;

  switch (range.preset) {
    case "today": {
      break;
    }
    case "yesterday": {
      start = todayStart - DAY_MS;
      end = todayEnd - DAY_MS;
      break;
    }
    case "last-7-days": {
      start = todayStart - 6 * DAY_MS;
      break;
    }
    case "last-30-days": {
      start = todayStart - 29 * DAY_MS;
      break;
    }
    case "this-month": {
      const today = toDatePartsAtOffset(nowTimestamp, offsetMinutes);
      start = fromDatePartsAtOffset(
        {
          year: today.year,
          month: today.month,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0
        },
        offsetMinutes
      );
      break;
    }
    case "all-time": {
      start = fromDatePartsAtOffset(
        {
          year: 1970,
          month: 1,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0
        },
        offsetMinutes
      );
      break;
    }
    case "custom":
    default: {
      break;
    }
  }

  return {
    ...range,
    startAt: toIsoAtOffset(start, offsetMinutes),
    endAt: toIsoAtOffset(end, offsetMinutes)
  };
};

export const buildPreviousRange = (current: ResolvedRange): ResolvedRange => {
  const start = parseIsoTimestamp(current.startAt);
  const end = parseIsoTimestamp(current.endAt);
  const offsetMinutes = parseOffsetMinutes(current.startAt);

  if (start === null || end === null || end < start) {
    return {
      ...current
    };
  }

  const duration = end - start;
  const previousEnd = start - SECOND_MS;
  const previousStart = previousEnd - duration;

  return {
    ...current,
    startAt: toIsoAtOffset(previousStart, offsetMinutes),
    endAt: toIsoAtOffset(previousEnd, offsetMinutes)
  };
};

const isWithinRange = (
  occurredAt: string,
  range: ResolvedRange
): boolean => {
  const occurredTimestamp = parseIsoTimestamp(occurredAt);
  const start = parseIsoTimestamp(range.startAt);
  const end = parseIsoTimestamp(range.endAt);

  if (
    occurredTimestamp === null ||
    start === null ||
    end === null
  ) {
    return false;
  }

  return occurredTimestamp >= start && occurredTimestamp <= end;
};

export const filterRecordsByResolvedRange = (
  records: InputRecordEvent[],
  range: ResolvedRange
): InputRecordEvent[] =>
  records.filter((item) => isWithinRange(item.occurredAt, range));

export const filterSessionsByResolvedRange = (
  sessions: InputSession[],
  range: ResolvedRange
): InputSession[] =>
  sessions.filter((item) => isWithinRange(item.startedAt, range));

export const listDateKeysInResolvedRange = (range: ResolvedRange): string[] => {
  const start = parseIsoTimestamp(range.startAt);
  const end = parseIsoTimestamp(range.endAt);

  if (start === null || end === null || end < start) {
    return [];
  }

  const offsetMinutes = parseOffsetMinutes(range.startAt);
  const startDay = dayStartTimestamp(start, offsetMinutes);
  const endDay = dayStartTimestamp(end, offsetMinutes);

  const dateKeys: string[] = [];
  for (let cursor = startDay; cursor <= endDay; cursor += DAY_MS) {
    dateKeys.push(toDateKeyAtOffset(cursor, offsetMinutes));
  }

  return dateKeys;
};
