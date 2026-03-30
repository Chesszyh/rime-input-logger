import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/.git/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/.worktrees/**",
    ],
  },
});
