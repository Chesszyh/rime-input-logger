import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { journalApi } from "./server/journal-api";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root,
  plugins: [react(), journalApi()],
  server: {
    open: false,
    host: "127.0.0.1"
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
