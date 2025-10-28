#!/usr/bin/env node

import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { run } from "./Cli.js"

const rewriteArgs = (argv: ReadonlyArray<string>): Array<string> => {
  if (!argv.includes("--tui")) {
    return [...argv]
  }
  const cleaned = argv.filter((value) => value !== "--tui")
  const insertIndex = 2
  if (cleaned.includes("tui")) {
    return cleaned
  }
  return [...cleaned.slice(0, insertIndex), "tui", ...cleaned.slice(insertIndex)]
}

const MainLive = Layer.mergeAll(
  NodeContext.layer,
  FetchHttpClient.layer
)

run(rewriteArgs(process.argv)).pipe(
  Effect.provide(MainLive),
  NodeRuntime.runMain({ disableErrorReporting: true })
)
