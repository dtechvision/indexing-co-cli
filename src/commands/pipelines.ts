import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as HttpClient from "@effect/platform/HttpClient"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { apiKeyOption, resolveApiKey } from "../config/apiKey.js"
import { backfillPipeline, createPipeline, deletePipeline, listPipelines, testPipeline } from "../services/pipelines.js"
import type { PipelineBackfillRequest, PipelineCreateRequest, PipelineTestRequest } from "../services/types.js"

// Command to list all pipelines
export const pipelinesListCommand = Command.make("list", { apiKey: apiKeyOption }, (args) =>
  Effect.gen(function*() {
    const client = yield* HttpClient.HttpClient
    const key = yield* resolveApiKey(args.apiKey)

    const pipelines = yield* listPipelines(client, key)

    yield* Console.log("Pipelines fetched successfully:")
    yield* Console.log(JSON.stringify(pipelines.raw, null, 2))
  }))

// Command to create a pipeline
export const pipelinesCreateCommand = Command.make(
  "create",
  {
    apiKey: apiKeyOption,
    name: Options.text("name").pipe(
      Options.withDescription("Name of the pipeline")
    ),
    transformation: Options.text("transformation").pipe(
      Options.withDescription("Name of the transformation to use")
    ),
    filter: Options.text("filter").pipe(
      Options.withDescription("Name of the filter to use")
    ),
    filterKeys: Options.text("filter-keys").pipe(
      Options.repeated,
      Options.withDescription("Filter keys (e.g., contract_address)")
    ),
    networks: Options.text("networks").pipe(
      Options.repeated,
      Options.withDescription("Networks to monitor (e.g., base_sepolia)")
    ),
    webhookUrl: Options.text("webhook-url").pipe(
      Options.withDescription("Webhook URL for HTTP delivery")
    ),
    authHeader: Options.text("auth-header").pipe(
      Options.optional,
      Options.withDescription("Authorization header for webhook")
    ),
    authValue: Options.text("auth-value").pipe(
      Options.optional,
      Options.withDescription("Authorization header value")
    )
  },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* resolveApiKey(args.apiKey)

      // Build headers object for webhook
      const headers: Record<string, string> = {}
      if (Option.isSome(args.authHeader) && Option.isSome(args.authValue)) {
        headers[args.authHeader.value] = args.authValue.value
      }

      const connection: PipelineCreateRequest["delivery"]["connection"] = Object.keys(headers).length > 0
        ? { host: args.webhookUrl, headers }
        : { host: args.webhookUrl }

      const requestBody: PipelineCreateRequest = {
        name: args.name,
        transformation: args.transformation,
        filter: args.filter,
        filterKeys: args.filterKeys,
        networks: args.networks,
        delivery: {
          adapter: "HTTP",
          connection
        }
      }

      // Add debug logging
      yield* Console.log("Request body:")
      yield* Console.log(JSON.stringify(requestBody, null, 2))
      const response = yield* createPipeline(client, key, requestBody)

      yield* Console.log(`Pipeline '${args.name}' created successfully:`)
      yield* Console.log(JSON.stringify(response, null, 2))
    })
)

// Command to backfill a pipeline
export const pipelinesBackfillCommand = Command.make(
  "backfill",
  {
    apiKey: apiKeyOption,
    name: Args.text({ name: "name" }).pipe(Args.withDescription("Name of the pipeline")),
    network: Options.text("network").pipe(
      Options.withDescription("Network to backfill against (e.g., BASE)")
    ),
    value: Options.text("value").pipe(
      Options.withDescription("Value to filter the backfill against (e.g., 0x123...)")
    ),
    beatStart: Options.integer("beat-start").pipe(
      Options.optional,
      Options.withDescription("The first beat to check (optional)")
    ),
    beatEnd: Options.integer("beat-end").pipe(
      Options.optional,
      Options.withDescription("The last beat to check (optional)")
    ),
    beats: Options.integer("beats").pipe(
      Options.repeated,
      Options.withDescription("A list of beats to explicitly check (optional)")
    )
  },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* resolveApiKey(args.apiKey)

      const requestBody: PipelineBackfillRequest = {
        network: args.network,
        value: args.value,
        ...(Option.isSome(args.beatStart) ? { beatStart: args.beatStart.value } : {}),
        ...(Option.isSome(args.beatEnd) ? { beatEnd: args.beatEnd.value } : {}),
        ...(args.beats.length > 0 ? { beats: args.beats } : {})
      }

      const response = yield* backfillPipeline(client, key, args.name, requestBody)

      yield* Console.log(`Pipeline '${args.name}' backfill initiated successfully:`)
      yield* Console.log(JSON.stringify(response, null, 2))
    })
)

// Command to test a pipeline (e2e testing)
export const pipelinesTestCommand = Command.make(
  "test",
  {
    apiKey: apiKeyOption,
    name: Args.text({ name: "name" }).pipe(Args.withDescription("Name of the pipeline")),
    network: Args.text({ name: "network" }).pipe(
      Args.withDescription("Network to test against (e.g., base_sepolia, farcaster)")
    ),
    beat: Args.text({ name: "beat" }).pipe(
      Args.optional,
      Args.withDescription("Block beat to test against (e.g., 123)")
    ),
    hash: Args.text({ name: "hash" }).pipe(
      Args.optional,
      Args.withDescription("Hash to test against (e.g., 0x123abc for block hash, or cast hash for Farcaster)")
    )
  },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* resolveApiKey(args.apiKey)

      // Validate that either beat or hash is provided
      if (Option.isNone(args.beat) && Option.isNone(args.hash)) {
        yield* Console.error("Either beat or hash must be provided")
        return yield* Effect.fail(new Error("Missing required parameter: beat or hash"))
      }

      const request: PipelineTestRequest = {
        network: args.network,
        ...(Option.isSome(args.beat) ? { beat: args.beat.value } : {}),
        ...(Option.isSome(args.hash) ? { hash: args.hash.value } : {})
      }

      const response = yield* testPipeline(client, key, args.name, request)

      yield* Console.log(`Pipeline '${args.name}' test result:`)
      yield* Console.log(JSON.stringify(response, null, 2))
    })
)

// Command to delete a pipeline by name
export const pipelinesDeleteCommand = Command.make(
  "delete",
  {
    apiKey: apiKeyOption,
    name: Args.text({ name: "name" }).pipe(Args.withDescription("Name of the pipeline to delete"))
  },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* resolveApiKey(args.apiKey)

      const response = yield* deletePipeline(client, key, args.name)

      yield* Console.log(`Pipeline '${args.name}' deleted successfully:`)
      yield* Console.log(JSON.stringify(response, null, 2))
    })
)

// Main pipelines command with subcommands
export const pipelinesCommand = Command.make("pipelines").pipe(
  Command.withSubcommands([
    pipelinesListCommand,
    pipelinesCreateCommand,
    pipelinesBackfillCommand,
    pipelinesTestCommand,
    pipelinesDeleteCommand
  ])
)
