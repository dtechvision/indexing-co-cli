import { beforeEach, describe, expect, it, vi } from "vitest"
import * as Effect from "effect/Effect"
import { listTransformations } from "../../src/services/transformations.js"
import * as httpModule from "../../src/services/http.js"

describe("transformations service", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("normalizes transformation responses", async () => {
    const payload = {
      transformations: [
        {
          name: "orders-transform",
          status: "ready",
          version: "v2"
        }
      ]
    }

    vi.spyOn(httpModule, "createJsonRequest").mockReturnValue({} as any)
    vi.spyOn(httpModule, "executeJson").mockReturnValue(Effect.succeed(payload))

    const client = { execute: vi.fn() } as any
    const result = await Effect.runPromise(listTransformations(client, "api-key"))

    expect(result.items[0]).toMatchObject({ name: "orders-transform", status: "ready", version: "v2" })
  })
})
