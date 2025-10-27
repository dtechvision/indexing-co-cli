import { describe, expect, it } from "@effect/vitest"
import * as Command from "@effect/cli/Command"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as Effect from "effect/Effect"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as NodePath from "@effect/platform-node/NodePath"
import * as NodeTerminal from "@effect/platform-node/NodeTerminal"
import { filtersCreateCommand, filtersRemoveCommand } from "../src/commands/filters.js"

const run = Command.run({
  name: "indexingco-cli-test",
  version: "0.0.0-test",
  executable: "indexingco"
})

const okResponse = (request: HttpClientRequest.HttpClientRequest) =>
  HttpClientResponse.fromWeb(
    request,
    new Response(JSON.stringify({ message: "success" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  )

const makeMockHttpClient = (onRequest: (request: HttpClientRequest.HttpClientRequest) => void) =>
  HttpClient.makeWith(
    (effect) =>
      Effect.flatMap(effect, (request) => {
        onRequest(request)
        return Effect.succeed(okResponse(request))
      }),
    (request) => Effect.succeed(request)
  )

const cliLayer = Layer.mergeAll(
  NodeFileSystem.layer,
  NodePath.layer,
  NodeTerminal.layer
)

describe("filters commands", () => {
  it.effect("filters create serializes repeated values into JSON array", () =>
    Effect.gen(function* () {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => {
        captured.push(request)
      })

      const program = run(filtersCreateCommand)([
        "--api-key",
        "test-key",
        "--values",
        "0xaaa",
        "--values",
        "0xbbb",
        "test-filter-create"
      ])

      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      yield* Effect.provide(program, layer)

      expect(captured.length).toBe(1)
      const request = captured[0]
      expect(request.method).toBe("POST")
      expect(request.url).toBe("https://app.indexing.co/dw/filters/test-filter-create")
      expect(request.headers["x-api-key"]).toBeDefined()
      const body = request.body.toJSON() as { body: string; contentType: string }
      expect(body.contentType).toBe("application/json")
      expect(JSON.parse(body.body)).toStrictEqual({
        values: ["0xaaa", "0xbbb"]
      })
    })
  )

  it.effect("filters remove posts JSON array payload for repeated values", () =>
    Effect.gen(function* () {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => {
        captured.push(request)
      })

      const program = run(filtersRemoveCommand)([
        "--api-key",
        "test-key",
        "--values",
        "0x111",
        "--values",
        "0x222",
        "test-filter-remove"
      ])

      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      yield* Effect.provide(program, layer)

      expect(captured.length).toBe(1)
      const request = captured[0]
      expect(request.method).toBe("DELETE")
      expect(request.url).toBe("https://app.indexing.co/dw/filters/test-filter-remove")
      expect(request.headers["x-api-key"]).toBeDefined()
      const body = request.body.toJSON() as { body: string; contentType: string }
      expect(body.contentType).toBe("application/json")
      expect(JSON.parse(body.body)).toStrictEqual({
        values: ["0x111", "0x222"]
      })
    })
  )
})
