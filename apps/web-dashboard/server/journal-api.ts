import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import {
  buildEventsReport,
  buildWordCloudReport,
  resolveRawDir,
} from "../../../packages/rime-journal/src/index";

import { readActivity } from "../../../packages/rime-journal/src/activity";

const exampleDir = fileURLToPath(
  new URL("../../../examples/journal/raw/", import.meta.url),
);

export function readDashboardJournal(params: URLSearchParams) {
  const source = params.get("source") ?? "local";
  if (!["local", "example"].includes(source)) throw new Error("未知数据源");
  const rawDir =
    source === "example"
      ? exampleDir
      : resolveRawDir({ rawDir: params.get("rawDir") || undefined });
  const activityDir = join(rawDir, "..", "activity");
  const exists = existsSync(rawDir) || existsSync(activityDir);
  const dates = [
    ...new Set(
      [rawDir, activityDir]
        .flatMap((dir) => (existsSync(dir) ? readdirSync(dir) : []))
        .filter((name) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(name))
        .map((name) => name.slice(0, 10)),
    ),
  ]
    .sort()
    .reverse();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date =
    params.get("date") || (source === "example" ? dates[0] : today) || today;
  const options = { rawDir, date, strict: false };
  const events = buildEventsReport({
    ...options,
    limit: Number.MAX_SAFE_INTEGER,
  });
  const report = buildWordCloudReport({ ...options, limit: 20 });
  const activity = readActivity(rawDir, date, events.entries);
  return { source, rawDir, exists, dates, date, events, report, activity };
}

export type JournalDashboardData = ReturnType<typeof readDashboardJournal>;

export function journalMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== "/api/journal") return next();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (
    req.headers["sec-fetch-site"] === "cross-site" ||
    (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)
  ) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: "请从本地仪表盘读取日志" }));
    return;
  }
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "仅支持 GET" }));
    return;
  }
  try {
    res.end(JSON.stringify(readDashboardJournal(url.searchParams)));
  } catch (error) {
    res.statusCode = 400;
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

export function journalApi(): Plugin {
  return {
    name: "rime-journal-api",
    configureServer(server) {
      server.middlewares.use(journalMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(journalMiddleware);
    },
  };
}
