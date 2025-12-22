import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["./test/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["./worktree/**", "**/worktree/**", "**/node_modules/**"],
    globals: true,
    coverage: {
      provider: "v8"
    }
  }
})
