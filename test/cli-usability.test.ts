import { describe, expect, it } from "vitest"
import { validateArgumentOrder, validateTopLevelCommand } from "../src/lib/argGuards.js"

describe("CLI usability guards (pure)", () => {
  it("suggests a top-level command when mistyped", () => {
    const message = validateTopLevelCommand(["pipelins"])
    expect(message).toContain("Unknown command 'pipelins'")
  })

  it("fails when options are placed after positionals and shows an example", () => {
    const message = validateArgumentOrder(["pipelines", "test", "mypipeline", "--network", "base_sepolia"])
    expect(message).toContain("Option '--network' must come before positional arguments")
  })

  it("ignores option values when searching for the first positional arg", () => {
    const message = validateArgumentOrder([
      "pipelines",
      "test",
      "--network",
      "base_sepolia",
      "--beat",
      "34216034",
      "heist-started-vercel-production"
    ])
    expect(message).toBeUndefined()
  })
})
