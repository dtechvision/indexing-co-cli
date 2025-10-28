import { beforeEach, describe, expect, it, vi } from "vitest"
import * as Effect from "effect/Effect"
import { listFilters } from "../../src/services/filters.js"
import * as httpModule from "../../src/services/http.js"

describe("filters service", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("normalizes filter responses", async () => {
    const payload = {
      filters: [
        {
          name: "contracts",
          values: ["0x123", "0x456"]
        }
      ]
    }

    vi.spyOn(httpModule, "createJsonRequest").mockReturnValue({} as any)
    vi.spyOn(httpModule, "executeJson").mockReturnValue(Effect.succeed(payload))

    const client = { execute: vi.fn() } as any
    const result = await Effect.runPromise(listFilters(client, "api-key"))

    expect(result.items[0]).toMatchObject({ name: "contracts", values: ["0x123", "0x456"] })
  })
})
