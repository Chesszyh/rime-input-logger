import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { journalMiddleware } from "./journal-api";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const port = Number(process.env.RIME_WEB_PORT ?? 38761);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("RIME_WEB_PORT must be between 1024 and 65535");
if (!existsSync(resolve(root, "index.html")))
  throw new Error("Run npm run web:build first");
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
const server = createServer((req, res) => {
  journalMiddleware(req, res, () => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url ?? "/", "http://localhost").pathname,
      );
      const path = resolve(
        root,
        pathname === "/" ? "index.html" : `.${pathname}`,
      );
      if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) {
        res.writeHead(404).end();
        return;
      }
      const content = readFileSync(path);
      res.setHeader(
        "Content-Type",
        mime[extname(path)] ?? "application/octet-stream",
      );
      res.setHeader("Cache-Control", "no-cache");
      res.end(content);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Rime Journal: http://127.0.0.1:${port}`),
);
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
