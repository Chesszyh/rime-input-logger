import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RimeCommitJournalEntry, JournalReadError } from "./index";

export interface ActivityEvent {
  kind: string;
  occurredAt: string;
  sessionId?: string;
  sequence?: number;
  processClock?: number;
  boundaryId?: string;
  focusId?: string;
  schemaId?: string;
  text?: string;
  reason?: string;
  asciiMode?: boolean;
}

export function readActivity(
  rawDir: string,
  date: string,
  commits: RimeCommitJournalEntry[],
) {
  const path = join(rawDir, "..", "activity", `${date}.jsonl`);
  const events: ActivityEvent[] = [];
  const errors: JournalReadError[] = [];
  if (existsSync(path))
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (!line.trim()) return;
        try {
          const event = JSON.parse(line);
          if (
            typeof event.kind !== "string" ||
            typeof event.occurredAt !== "string" ||
            !Number.isFinite(Date.parse(event.occurredAt))
          )
            throw new Error("Invalid activity event");
          if (
            event.kind === "english_observation" &&
            (typeof event.text !== "string" ||
              typeof event.sequence !== "number" ||
              typeof event.sessionId !== "string")
          )
            throw new Error("Invalid English observation");
          events.push(event);
        } catch (error) {
          errors.push({
            filePath: path,
            lineNumber: index + 1,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
  const observations: RimeCommitJournalEntry[] = events
    .filter((event) => event.kind === "english_observation")
    .map((event) => ({
      schemaVersion: "1.0",
      source: "rime",
      schemaId: event.schemaId ?? "unknown",
      dateKey: date,
      occurredAt: event.occurredAt,
      text: event.text!,
      charCount: [...event.text!].length,
      textLanguage: "en-US",
      sessionId: event.sessionId,
      sequence: event.sequence,
      processClock: event.processClock,
      boundaryId: event.boundaryId,
      focusId: event.focusId ?? "unobserved",
      observed: true,
    }));
  const timeline = [...commits, ...observations].sort((a, b) => {
    const time = Date.parse(a.occurredAt) - Date.parse(b.occurredAt);
    if (time !== 0) return time;
    if (
      a.processClock !== undefined &&
      b.processClock !== undefined &&
      a.processClock !== b.processClock
    )
      return a.processClock - b.processClock;
    if (a.sessionId && a.sessionId === b.sessionId)
      return (a.sequence ?? 0) - (b.sequence ?? 0);
    return (a.sessionId ?? "").localeCompare(b.sessionId ?? "");
  });
  return { events, errors, timeline };
}
