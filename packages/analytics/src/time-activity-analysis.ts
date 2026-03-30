import type {
  HeatmapCell,
  HourlyBucket,
  InputRecordEvent
} from "../../contracts/src/index";

const usableEvent = (event: InputRecordEvent): boolean =>
  !event.isDeleted && !event.isFiltered && event.normalizedText.trim().length > 0;

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

const getHourAtIsoOffset = (iso: string): number => {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) {
    return 0;
  }

  const offsetMinutes = parseOffsetMinutes(iso);
  const shifted = new Date(timestamp + offsetMinutes * 60 * 1000);

  return shifted.getUTCHours();
};

const twoHourBucketLabel = (hour: number): string => {
  const startHour = Math.floor(hour / 2) * 2;
  const endHour = startHour + 1;

  return `${String(startHour).padStart(2, "0")}:00-${String(endHour).padStart(2, "0")}:59`;
};

export interface TimeActivityResult {
  hourlyBuckets: HourlyBucket[];
  heatmap: HeatmapCell[];
}

export const buildTimeActivity = (
  events: InputRecordEvent[]
): TimeActivityResult => {
  const hourlyBuckets: HourlyBucket[] = Array.from(
    { length: 24 },
    (_, hour) => ({
      hour,
      chars: 0,
      entries: 0
    })
  );

  const heatmapTotals = new Map<string, number>();

  for (const event of events) {
    if (!usableEvent(event)) {
      continue;
    }

    const hour = getHourAtIsoOffset(event.occurredAt);
    hourlyBuckets[hour].chars += event.charCount;
    hourlyBuckets[hour].entries += 1;

    const bucketLabel = twoHourBucketLabel(hour);
    const heatmapKey = `${event.dateKey}|${bucketLabel}`;

    heatmapTotals.set(
      heatmapKey,
      (heatmapTotals.get(heatmapKey) ?? 0) + event.charCount
    );
  }

  const heatmap: HeatmapCell[] = Array.from(heatmapTotals.entries())
    .map(([key, chars]) => {
      const [dateKey, bucketLabel] = key.split("|");

      return {
        dateKey,
        bucketLabel,
        chars
      };
    })
    .sort((left, right) => {
      const dateCompare = left.dateKey.localeCompare(right.dateKey);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return left.bucketLabel.localeCompare(right.bucketLabel);
    });

  return {
    hourlyBuckets,
    heatmap
  };
};
