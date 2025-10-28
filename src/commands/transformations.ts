import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as FileSystem from "@effect/platform/FileSystem"
import * as HttpClient from "@effect/platform/HttpClient"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { apiKeyOption, resolveApiKey } from "../config/apiKey.js"
import { createTransformation, listTransformations, testTransformation } from "../services/transformations.js"
import type { TransformationTestRequest } from "../services/types.js"

// Note: List all transformations endpoint doesn't exist

// Command to list all transformations (returns transformation names)
export const transformationsListCommand = Command.make(
  "list",
  { apiKey: apiKeyOption },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* resolveApiKey(args.apiKey)

      const transformations = yield* listTransformations(client, key)

      yield* Console.log("Transformations fetched successfully:")
      yield* Console.log(JSON.stringify(transformations.raw, null, 2))
    })
)

// Command to test a transformation
export const transformationsTestCommand = Command.make(
  "test",
  {
    apiKey: apiKeyOption,
    network: Options.text("network").pipe(
      Options.withDescription("Network to test against (e.g., base_sepolia, farcaster)")
    ),
    beat: Options.text("beat").pipe(
      Options.optional,
      Options.withDescription("Block beat to test against (e.g., 123)")
    ),
    hash: Options.text("hash").pipe(
      Options.optional,
      Options.withDescription("Hash to test against (e.g., 0x123abc for block hash, or cast hash for Farcaster)")
    ),
    file: Args.file({ name: "file", exists: "yes" }).pipe(
      Args.withDescription("Path to the JavaScript transformation file")
    )
  },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* resolveApiKey(args.apiKey)
      const fs = yield* FileSystem.FileSystem

      // Validate that either beat or hash is provided
      if (Option.isNone(args.beat) && Option.isNone(args.hash)) {
        yield* Console.error("Either --beat or --hash must be provided")
        return yield* Effect.fail(new Error("Missing required parameter: beat or hash"))
      }

      // Read the transformation file
      const fileContent = yield* fs.readFileString(args.file).pipe(
        Effect.catchAll((error) => {
          return Console.error(`Failed to read file ${args.file}: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(new Error(`Failed to read file: ${error}`)))
          )
        })
      )

      const request: TransformationTestRequest = {
        network: args.network,
        ...(Option.isSome(args.beat) ? { beat: args.beat.value } : {}),
        ...(Option.isSome(args.hash) ? { hash: args.hash.value } : {}),
        code: fileContent
      }

      const response = yield* testTransformation(client, key, request)

      yield* Console.log("Transformation test result:")
      yield* Console.log(JSON.stringify(response, null, 2))
    })
)

// Command to create/commit a transformation
export const transformationsCreateCommand = Command.make(
  "create",
  {
    apiKey: apiKeyOption,
    name: Args.text({ name: "name" }).pipe(Args.withDescription("Name of the transformation")),
    file: Args.file({ name: "file", exists: "yes" }).pipe(
      Args.withDescription("Path to the JavaScript transformation file")
    )
  },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* resolveApiKey(args.apiKey)
      const fs = yield* FileSystem.FileSystem

      // Read the transformation file
      const fileContent = yield* fs.readFileString(args.file).pipe(
        Effect.catchAll((error) => {
          return Console.error(`Failed to read file ${args.file}: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(new Error(`Failed to read file: ${error}`)))
          )
        })
      )

      const response = yield* createTransformation(client, key, args.name, fileContent)

      yield* Console.log(`Transformation '${args.name}' created successfully:`)
      yield* Console.log(JSON.stringify(response, null, 2))
    })
)

// Main transformations command with subcommands
export const transformationsCommand = Command.make("transformations").pipe(
  Command.withSubcommands([transformationsListCommand, transformationsTestCommand, transformationsCreateCommand])
)
