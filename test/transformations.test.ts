import * as Command from "@effect/cli/Command"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as NodePath from "@effect/platform-node/NodePath"
import * as NodeTerminal from "@effect/platform-node/NodeTerminal"
import * as HttpClient from "@effect/platform/HttpClient"
import type * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { transformationsShowCommand } from "../src/commands/transformations.js"

const run = Command.run({
  name: "indexingco-cli-test",
  version: "0.0.0-test",
  executable: "indexingco"
})

const okResponse = (request: HttpClientRequest.HttpClientRequest) =>
  HttpClientResponse.fromWeb(
    request,
    new Response("export const value = 1", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
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

describe("transformations commands", () => {
  it.effect("transformations show fetches code for the requested transformation", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => {
        captured.push(request)
      })

      const program = run(transformationsShowCommand)(["--api-key", "test-key", "demo"])

      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      yield* Effect.provide(program, layer)

      expect(captured.length).toBe(1)
      const request = captured[0]
      expect(request.method).toBe("GET")
      expect(request.url).toBe("https://app.indexing.co/dw/transformations/demo")
      expect(request.headers["x-api-key"]).toBeDefined()
    }))
})
