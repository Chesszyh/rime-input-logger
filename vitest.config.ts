import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: [
      "**/.git/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/.worktrees/**",
    ],
  },
});
