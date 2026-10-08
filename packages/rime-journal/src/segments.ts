import type { RimeCommitJournalEntry } from "./index";

export interface JournalSegment {
  occurredAt: string;
  endedAt: string;
  text: string;
  charCount: number;
  schemaId: string;
  entries: RimeCommitJournalEntry[];
}

// Commit logs cannot observe edits or focus changes in the destination application.
export function groupJournalEntries(
  entries: RimeCommitJournalEntry[],
  gapSeconds = 15,
): JournalSegment[] {
  const segments: JournalSegment[] = [];
  for (const entry of entries) {
    const last = segments.at(-1);
    const gap = last
      ? Date.parse(entry.occurredAt) - Date.parse(last.endedAt)
      : Infinity;
    if (
      !last ||
      gap > gapSeconds * 1000 ||
      gap < 0 ||
      entry.dateKey !== last.entries[0].dateKey ||
      entry.schemaId !== last.schemaId ||
      /[。！？!?\n][”’」』）)]*$/u.test(last.text)
    ) {
      segments.push({
        occurredAt: entry.occurredAt,
        endedAt: entry.occurredAt,
        text: entry.text,
        charCount: entry.charCount,
        schemaId: entry.schemaId,
        entries: [entry],
      });
    } else {
      last.text += entry.text;
      last.charCount += entry.charCount;
      last.endedAt = entry.occurredAt;
      last.entries.push(entry);
    }
  }
  return segments;
}
