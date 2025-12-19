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
import * as Option from "effect/Option"
import { pipelinesDeleteCommand, pipelinesRemoveCommand, pipelinesRmCommand, pipelinesTestCommand } from "../src/commands/pipelines.js"

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

const cliLayer = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer, NodeTerminal.layer)

beforeAll(() => {
  process.env.API_KEY_INDEXINGCO = "test-key"
})

describe("pipelines commands", () => {
  it.effect("pipelines test requires beat or hash", () =>
    Effect.gen(function*() {
      const client = makeMockHttpClient(() => {})
      const program = run(pipelinesTestCommand)(["--api-key", "test-key", "--network", "base_sepolia", "demo"])
      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      const result = yield* Effect.either(Effect.provide(program, layer))
      expect(result._tag).toBe("Left")
    }))

  it.effect("pipelines test rejects both beat and hash", () =>
    Effect.gen(function*() {
      const client = makeMockHttpClient(() => {})
      const program = run(pipelinesTestCommand)([
        "--api-key",
        "test-key",
        "--network",
        "base_sepolia",
        "--beat",
        "1",
        "--hash",
        "0xabc",
        "demo"
      ])
      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      const result = yield* Effect.either(Effect.provide(program, layer))
      expect(result._tag).toBe("Left")
    }))

  it.effect("pipelines test builds URL with beat", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => captured.push(request))
      const program = run(pipelinesTestCommand)([
        "--api-key",
        "test-key",
        "--network",
        "base_sepolia",
        "--beat",
        "123",
        "demo"
      ])
      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      yield* Effect.provide(program, layer)
      expect(captured.length).toBe(1)
      expect(captured[0].url).toBe("https://app.indexing.co/dw/pipelines/demo/test/base_sepolia/123")
    }))

  it.effect("pipelines test builds URL with hash", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => captured.push(request))
      const program = run(pipelinesTestCommand)([
        "--api-key",
        "test-key",
        "--network",
        "base_sepolia",
        "--hash",
        "0xabc",
        "demo"
      ])
      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      yield* Effect.provide(program, layer)
      expect(captured.length).toBe(1)
      expect(captured[0].url).toBe("https://app.indexing.co/dw/pipelines/demo/test/base_sepolia/0xabc")
    }))

  it.effect("pipelines delete aliases (delete/remove/rm) call DELETE", () =>
    Effect.gen(function*() {
      const captured: Array<HttpClientRequest.HttpClientRequest> = []
      const client = makeMockHttpClient((request) => captured.push(request))

      const runWith = (cmd: Command.Command<typeof pipelinesDeleteCommand>) =>
        run(cmd)(["--api-key", "test-key", "demo-delete"])

      const layer = Layer.merge(cliLayer, Layer.succeed(HttpClient.HttpClient, client))
      yield* Effect.provide(runWith(pipelinesDeleteCommand), layer)
      yield* Effect.provide(runWith(pipelinesRemoveCommand), layer)
      yield* Effect.provide(runWith(pipelinesRmCommand), layer)

      expect(captured.length).toBe(3)
      captured.forEach((req) => {
        expect(req.method).toBe("DELETE")
        expect(req.url).toBe("https://app.indexing.co/dw/pipelines/demo-delete")
      })
    }))
})
