import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import { apiKeyOption, getApiKey } from "../config.js"

// Command to list all pipelines
export const pipelinesListCommand = Command.make("list", { apiKey: apiKeyOption }, (args) =>
  Effect.gen(function*() {
    const client = yield* HttpClient.HttpClient
    const key = yield* getApiKey(args.apiKey)

    const request = HttpClientRequest.get("https://app.indexing.co/dw/pipelines").pipe(
      HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key))
    )

    const response = yield* client.execute(request).pipe(
      Effect.flatMap((response) => response.json),
      Effect.catchAll((error) => {
        return Console.error(`Failed to fetch pipelines: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      })
    )

    yield* Console.log("Pipelines fetched successfully:")
    yield* Console.log(JSON.stringify(response, null, 2))
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
      const key = yield* getApiKey(args.apiKey)

      // Build headers object for webhook
      const headers = Option.isSome(args.authHeader) && Option.isSome(args.authValue)
        ? { [args.authHeader.value]: args.authValue.value }
        : undefined

      const filterKeys = Array.from(args.filterKeys)
      const networks = Array.from(args.networks)

      const requestBody = {
        name: args.name,
        transformation: args.transformation,
        filter: args.filter,
        filterKeys,
        networks,
        delivery: {
          adapter: "HTTP",
          connection: {
            host: args.webhookUrl,
            ...(headers ? { headers } : {})
          }
        }
      }

      // Add debug logging
      yield* Console.log("Request body:")
      yield* Console.log(JSON.stringify(requestBody, null, 2))

      const requestBase = HttpClientRequest.post("https://app.indexing.co/dw/pipelines").pipe(
        HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key))
      )
      const request = yield* HttpClientRequest.bodyJson(requestBody)(requestBase)

      const httpResponse = yield* client.execute(request).pipe(
        Effect.catchAll((error) => {
          return Console.error(`Failed to create pipeline: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

      if (httpResponse.status < 200 || httpResponse.status >= 300) {
        const errorBody = yield* Effect.catchAll(httpResponse.text, () => Effect.succeed(""))
        const messageSuffix = errorBody !== "" ? `: ${errorBody}` : ""
        yield* Console.error(`Failed to create pipeline: received status ${httpResponse.status}${messageSuffix}`)
        return yield* Effect.fail(new Error(`Pipeline creation failed with status ${httpResponse.status}`))
      }

      const response = yield* httpResponse.json.pipe(
        Effect.catchAll((error) => {
          return Console.error(`Failed to parse pipeline creation response: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

      if (
        typeof response === "object" &&
        response !== null &&
        "error" in response &&
        response.error !== undefined &&
        response.error !== null
      ) {
        const errorMessage = String((response as { error: unknown }).error)
        yield* Console.error(`Failed to create pipeline: ${errorMessage}`)
        return yield* Effect.fail(new Error(`Pipeline creation failed: ${errorMessage}`))
      }

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
      const key = yield* getApiKey(args.apiKey)

      // Build request body
      const requestBody: any = {
        network: args.network,
        value: args.value
      }

      // Add optional parameters if provided
      if (Option.isSome(args.beatStart)) {
        requestBody.beatStart = args.beatStart.value
      }
      if (Option.isSome(args.beatEnd)) {
        requestBody.beatEnd = args.beatEnd.value
      }
      if (args.beats.length > 0) {
        requestBody.beats = args.beats
      }

      const request = HttpClientRequest.post(`https://app.indexing.co/dw/pipelines/${args.name}/backfill`).pipe(
        HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key)),
        HttpClientRequest.setHeader("Content-Type", "application/json"),
        HttpClientRequest.bodyText(JSON.stringify(requestBody))
      )

      const response = yield* client.execute(request).pipe(
        Effect.flatMap((response) => response.json),
        Effect.catchAll((error) => {
          return Console.error(`Failed to backfill pipeline: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

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
    )
  },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* getApiKey(args.apiKey)

      const beat = Option.isSome(args.beat) ? args.beat.value : undefined
      const hash = Option.isSome(args.hash) ? args.hash.value : undefined

      // Validate that either beat or hash is provided
      if (beat === undefined && hash === undefined) {
        yield* Console.error("Either beat or hash must be provided")
        return yield* Effect.fail(new Error("Missing required parameter: beat or hash"))
      }
      if (beat !== undefined && hash !== undefined) {
        yield* Console.error("Provide only one of beat or hash, not both")
        return yield* Effect.fail(new Error("Invalid parameters: both beat and hash provided"))
      }

      // Build URL with appropriate parameter
      let url = `https://app.indexing.co/dw/pipelines/${args.name}/test/${args.network}`
      if (beat !== undefined) {
        url += `/${beat}`
      } else if (hash !== undefined) {
        url += `/${hash}`
      }

      const request = HttpClientRequest.post(url).pipe(
        HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key))
      )

      const response = yield* client.execute(request).pipe(
        Effect.flatMap((response) => response.json),
        Effect.catchAll((error) => {
          return Console.error(`Failed to test pipeline: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

      yield* Console.log(`Pipeline '${args.name}' test result:`)
      yield* Console.log(JSON.stringify(response, null, 2))
    })
)

// Command to delete a pipeline by name
const pipelinesDeleteArgs = {
  apiKey: apiKeyOption,
  name: Args.text({ name: "name" }).pipe(Args.withDescription("Name of the pipeline to delete"))
}

const pipelinesDeleteHandler = (args: {
  apiKey: Option.Option<Redacted.Redacted>
  name: string
}) =>
  Effect.gen(function*() {
    const client = yield* HttpClient.HttpClient
    const key = yield* getApiKey(args.apiKey)

    const request = HttpClientRequest.del(`https://app.indexing.co/dw/pipelines/${args.name}`).pipe(
      HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key))
    )

    const response = yield* client.execute(request).pipe(
      Effect.flatMap((response) => response.json),
      Effect.catchAll((error) => {
        return Console.error(`Failed to delete pipeline: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      })
    )

    yield* Console.log(`Pipeline '${args.name}' deleted successfully:`)
    yield* Console.log(JSON.stringify(response, null, 2))
  })

export const pipelinesDeleteCommand = Command.make("delete", pipelinesDeleteArgs, pipelinesDeleteHandler)
// Aliases to be forgiving: rm/remove behave like delete
export const pipelinesRmCommand = Command.make("rm", pipelinesDeleteArgs, pipelinesDeleteHandler)
export const pipelinesRemoveCommand = Command.make("remove", pipelinesDeleteArgs, pipelinesDeleteHandler)

// Main pipelines command with subcommands
export const pipelinesCommand = Command.make("pipelines").pipe(
  Command.withSubcommands([
    pipelinesListCommand,
    pipelinesCreateCommand,
    pipelinesBackfillCommand,
    pipelinesTestCommand,
    pipelinesDeleteCommand,
    pipelinesRmCommand,
    pipelinesRemoveCommand
  ]),
)
