#!/usr/bin/env node

import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as Config from "effect/Config"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { run } from "./Cli.js"

// Check for common argument ordering mistakes
// In @effect/cli, options must come before positional arguments
const checkArgumentOrder = (argv: Array<string>): void => {
  // Known subcommands that should not be treated as positional arguments
  const subcommands = new Set([
    "pipelines",
    "filters",
    "transformations",
    "hello",
    "list",
    "create",
    "delete",
    "remove",
    "backfill",
    "test"
  ])

  // Only check for --api-key as it's the most commonly misplaced option
  const optionPatterns = ["--api-key"]

  // Find the first true positional argument (not a subcommand, not an option)
  let firstPositionalIdx = -1
  let firstPositionalArg = ""

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]

    // Skip options and their values
    if (arg.startsWith("-")) continue

    // Skip known subcommands
    if (subcommands.has(arg)) continue

    // This is a positional argument
    firstPositionalIdx = i
    firstPositionalArg = arg
    break
  }

  // If no positional argument found, nothing to check
  if (firstPositionalIdx === -1) return

  // Check if any option appears after the first positional argument
  for (let j = firstPositionalIdx + 1; j < argv.length; j++) {
    const laterArg = argv[j]
    if (optionPatterns.some((opt) => laterArg === opt || laterArg.startsWith(`${opt}=`))) {
      console.error(`Error: Option '${laterArg}' must come before positional arguments.`)
      console.error(``)
      console.error(`Incorrect: ... ${firstPositionalArg} ${laterArg} ...`)
      console.error(`Correct:   ... ${laterArg} <value> ${firstPositionalArg}`)
      console.error(``)
      console.error(`Tip: You can also set the API_KEY_INDEXINGCO environment variable to avoid passing --api-key.`)
      process.exit(1)
    }

    // Generic catch-all hint: any option after a positional is likely a mistake
    if (laterArg.startsWith("-")) {
      console.error("Hint: Options must come before positional args for this CLI.")
      console.error("Example: indexingco pipelines test --network base_sepolia --beat 123 my_pipeline")
      process.exit(1)
    }
  }
}

checkArgumentOrder(process.argv)

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
