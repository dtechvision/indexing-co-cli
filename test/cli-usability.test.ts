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

  it("skips values for options listed in optionsWithValues", () => {
    // This tests the fix for the bug where --transformation value was treated as positional
    const message = validateArgumentOrder([
      "pipelines",
      "create",
      "--transformation",
      "example-transformation",
      "--filter",
      "example-filter",
      "--filter-keys",
      "contract_address",
      "--networks",
      "BASE_SEPOLIA",
      "--webhook-url",
      "https://example.com/api/webhooks/events",
      "example-pipeline"
    ])
    expect(message).toBeUndefined()
  })

  it("warns when an unknown option would otherwise swallow the positional arg", () => {
    // Unknown options might be boolean flags, so don't treat the next token as a value
    // when it looks like the final positional argument.
    const message = validateArgumentOrder([
      "pipelines",
      "create",
      "--unknown-flag",
      "my-pipeline",
      "--filter",
      "f"
    ])
    // --filter is a known option, so we get the specific error message
    expect(message).toContain("must come before positional arguments")
  })
})
