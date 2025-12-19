import * as Command from "@effect/cli/Command"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as NodePath from "@effect/platform-node/NodePath"
import * as NodeTerminal from "@effect/platform-node/NodeTerminal"
import * as HttpClient from "@effect/platform/HttpClient"
import type * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import { describe, expect, it } from "@effect/vitest"
import { beforeAll } from "vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { filtersCreateCommand, filtersDeleteCommand, filtersRemoveCommand, filtersRmCommand } from "../src/commands/filters.js"

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

const makeMockHttpClient = (onRequest: (request: HttpClientRequest.HttpClientRequest) => void): HttpClient.HttpClient =>
  HttpClient.makeWith(
    (effect) =>
      Effect.flatMap(effect, (request) => {
        onRequest(request)
        return Effect.succeed(okResponse(request))
      }),
    (request) => Effect.succeed(request)
  ) as HttpClient.HttpClient

const cliLayer = Layer.mergeAll(
  NodeFileSystem.layer,
  NodePath.layer,
  NodeTerminal.layer
)

beforeAll(() => {
  process.env.API_KEY_INDEXINGCO = "test-key"
})

describe("filters commands", () => {
  it.effect("filters create serializes repeated values into JSON array", () =>
    Effect.gen(function*() {
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
    }))

  it.effect("filters remove posts JSON array payload for repeated values", () =>
    Effect.gen(function*() {
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
    }))

  it.effect("filters create handles comma-separated values in single flag", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => {
        captured.push(request)
      })

      const program = run(filtersCreateCommand)([
        "--api-key",
        "test-key",
        "--values",
        "0x843A12d6D1FDD63d7fC8EccA2249E5C7623deD32,0x31FF4F78245846C7675389709aDa77e5f25f27F2,0xA549779995A5d6e3fFf907A92D735d70F3aCf96f",
        "test-filter-comma"
      ])

      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      yield* Effect.provide(program, layer)

      expect(captured.length).toBe(1)
      const request = captured[0]
      expect(request.method).toBe("POST")
      expect(request.url).toBe("https://app.indexing.co/dw/filters/test-filter-comma")
      const body = request.body.toJSON() as { body: string; contentType: string }
      expect(body.contentType).toBe("application/json")
      // Should be split into separate array elements, not a single string
      expect(JSON.parse(body.body)).toStrictEqual({
        values: [
          "0x843A12d6D1FDD63d7fC8EccA2249E5C7623deD32",
          "0x31FF4F78245846C7675389709aDa77e5f25f27F2",
          "0xA549779995A5d6e3fFf907A92D735d70F3aCf96f"
        ]
      })
    }))

  it.effect("filters create handles mixed comma-separated and separate flags", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => {
        captured.push(request)
      })

      const program = run(filtersCreateCommand)([
        "--api-key",
        "test-key",
        "--values",
        "0xaaa,0xbbb",
        "--values",
        "0xccc",
        "--values",
        "0xddd,0xeee",
        "test-filter-mixed"
      ])

      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      yield* Effect.provide(program, layer)

      expect(captured.length).toBe(1)
      const request = captured[0]
      const body = request.body.toJSON() as { body: string; contentType: string }
      // Should flatten all values into a single array
      expect(JSON.parse(body.body)).toStrictEqual({
        values: ["0xaaa", "0xbbb", "0xccc", "0xddd", "0xeee"]
      })
    }))

  it.effect("filters remove handles comma-separated values", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => {
        captured.push(request)
      })

      const program = run(filtersRemoveCommand)([
        "--api-key",
        "test-key",
        "--values",
        "0x111,0x222,0x333",
        "test-filter-remove-comma"
      ])

      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      yield* Effect.provide(program, layer)

      expect(captured.length).toBe(1)
      const request = captured[0]
      expect(request.method).toBe("DELETE")
      const body = request.body.toJSON() as { body: string; contentType: string }
      expect(JSON.parse(body.body)).toStrictEqual({
        values: ["0x111", "0x222", "0x333"]
      })
    }))

  it.effect("filters delete alias behaves like remove", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => {
        captured.push(request)
      })

      const program = run(filtersDeleteCommand)(["--api-key", "test-key", "--values", "0xabc", "alias-delete"])
      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      yield* Effect.provide(program, layer)

      expect(captured.length).toBe(1)
      const request = captured[0]
      expect(request.method).toBe("DELETE")
      expect(request.url).toBe("https://app.indexing.co/dw/filters/alias-delete")
    }))

  it.effect("filters rm alias behaves like remove", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => {
        captured.push(request)
      })

      const program = run(filtersRmCommand)(["--api-key", "test-key", "--values", "0xabc", "alias-rm"])
      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      yield* Effect.provide(program, layer)

      expect(captured.length).toBe(1)
      const request = captured[0]
      expect(request.method).toBe("DELETE")
      expect(request.url).toBe("https://app.indexing.co/dw/filters/alias-rm")
    }))

  it.effect("filters create trims whitespace from comma-separated values", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => {
        captured.push(request)
      })

      const program = run(filtersCreateCommand)([
        "--api-key",
        "test-key",
        "--values",
        "0xaaa, 0xbbb , 0xccc",
        "test-filter-whitespace"
      ])

      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      yield* Effect.provide(program, layer)

      expect(captured.length).toBe(1)
      const request = captured[0]
      const body = request.body.toJSON() as { body: string; contentType: string }
      // Should trim whitespace
      expect(JSON.parse(body.body)).toStrictEqual({
        values: ["0xaaa", "0xbbb", "0xccc"]
      })
    }))

  it.effect("filters create fails when no values provided", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => {
        captured.push(request)
      })

      const program = run(filtersCreateCommand)([
        "--api-key",
        "test-key",
        "test-filter-no-values"
      ])

      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      const result = yield* Effect.either(Effect.provide(program, layer))

      // Should fail with error
      expect(result._tag).toBe("Left")
      // Should not make any HTTP requests
      expect(captured.length).toBe(0)
    }))

  it.effect("filters remove fails when no values provided", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => {
        captured.push(request)
      })

      const program = run(filtersRemoveCommand)([
        "--api-key",
        "test-key",
        "test-filter-no-values"
      ])

      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      const result = yield* Effect.either(Effect.provide(program, layer))

      // Should fail with error
      expect(result._tag).toBe("Left")
      // Should not make any HTTP requests
      expect(captured.length).toBe(0)
    }))

  it.effect("filters create handles empty strings after comma splitting", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => {
        captured.push(request)
      })

      const program = run(filtersCreateCommand)([
        "--api-key",
        "test-key",
        "--values",
        "0xaaa,,0xbbb,  ,0xccc",
        "test-filter-empty-strings"
      ])

      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      yield* Effect.provide(program, layer)

      expect(captured.length).toBe(1)
      const request = captured[0]
      const body = request.body.toJSON() as { body: string; contentType: string }
      // Should filter out empty strings
      expect(JSON.parse(body.body)).toStrictEqual({
        values: ["0xaaa", "0xbbb", "0xccc"]
      })
    }))

  it.effect("filters create fails when only empty comma-separated values provided", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => {
        captured.push(request)
      })

      const program = run(filtersCreateCommand)([
        "--api-key",
        "test-key",
        "--values",
        ",,,  ,  ",
        "test-filter-only-empty"
      ])

      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      const result = yield* Effect.either(Effect.provide(program, layer))

      // Should fail with error because after filtering empty strings, no values remain
      expect(result._tag).toBe("Left")
      // Should not make any HTTP requests
      expect(captured.length).toBe(0)
    }))
})
