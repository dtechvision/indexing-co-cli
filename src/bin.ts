#!/usr/bin/env node

import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as Config from "effect/Config"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { run } from "./Cli.js"
import { validateArgumentOrder, validateTopLevelCommand } from "./lib/argGuards.js"

const argv = process.argv.slice(2)

const topLevelError = validateTopLevelCommand(argv)
if (topLevelError) {
  console.error(topLevelError)
  process.exit(1)
}

const orderError = validateArgumentOrder(argv)
if (orderError) {
  console.error(orderError)
  process.exit(1)
}

const MainLive = Layer.mergeAll(
  NodeContext.layer,
  FetchHttpClient.layer
)

// Read config via a shared provider (env). Keeps config resolution consistent across CLI modules.
const configProvider = ConfigProvider.fromEnv()
// Toggle verbose error reporting via CLI_DEV=true.
const isDev = Effect.runSync(
  Effect.withConfigProvider(configProvider)(Config.withDefault(Config.boolean("CLI_DEV"), false))
)

run(process.argv).pipe(
  Effect.withConfigProvider(configProvider),
  Effect.provide(MainLive),
  // Enable detailed error reporting only when CLI_DEV=true.
  NodeRuntime.runMain({ disableErrorReporting: !isDev })
)
