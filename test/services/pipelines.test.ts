import { beforeEach, describe, expect, it, vi } from "vitest"
import * as Effect from "effect/Effect"
import { listPipelines, testPipeline } from "../../src/services/pipelines.js"
import type { PipelineTestRequest } from "../../src/services/types.js"
import * as httpModule from "../../src/services/http.js"

describe("pipelines service", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("normalizes pipeline list responses", async () => {
    const mockPayload = [
      {
        id: "pipe-1",
        name: "orders",
        status: "running",
        filter: "orders-filter",
        transformation: "orders-transform",
        networks: ["base"],
        createdAt: "2024-01-01T00:00:00.000Z",
        paused: false
      }
    ]

    vi.spyOn(httpModule, "createJsonRequest").mockReturnValue({} as any)
    vi.spyOn(httpModule, "executeJson").mockReturnValue(Effect.succeed(mockPayload))

    const client = { execute: vi.fn() } as any
    const result = await Effect.runPromise(listPipelines(client, "api-key"))

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      id: "pipe-1",
      name: "orders",
      status: "running",
      filter: "orders-filter",
      transformation: "orders-transform",
      networks: ["base"]
    })
  })

  it("delegates pipeline tests to executeJson", async () => {
    const executeJsonSpy = vi.spyOn(httpModule, "executeJson").mockReturnValue(Effect.succeed({}))
    vi.spyOn(httpModule, "createJsonRequest").mockReturnValue({} as any)

    const client = { execute: vi.fn() } as any
    const request: PipelineTestRequest = { network: "base", beat: "123" }

    await Effect.runPromise(testPipeline(client, "api-key", "orders", request))

    expect(executeJsonSpy).toHaveBeenCalledTimes(1)
  })
})
