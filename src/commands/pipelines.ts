import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Config from "effect/Config"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"

// Configuration for API key - reads from environment variable
const apiKeyConfig = Config.redacted("API_KEY_INDEXING_CO").pipe(
  Config.withDescription("API key for indexing.co")
)

// CLI option for API key
const apiKeyOption = Options.redacted("api-key").pipe(
  Options.optional,
  Options.withDescription("API key for indexing.co (overrides API_KEY_INDEXING_CO env var)")
)

// Helper function to get API key
const getApiKey = (cliApiKey: Option.Option<Redacted.Redacted>) =>
  Effect.gen(function*() {
    const key = yield* (Option.isSome(cliApiKey)
      ? Effect.succeed(cliApiKey.value)
      : Config.option(apiKeyConfig).pipe(
        Effect.flatMap((maybeKey) =>
          Option.isSome(maybeKey)
            ? Effect.succeed(maybeKey.value)
            : Effect.fail(new Error("API key not found"))
        )
      )).pipe(
        Effect.catchAll(() =>
          Effect.gen(function*() {
            yield* Console.error(
              "API key is required. Set API_KEY_INDEXING_CO environment variable or use --api-key option"
            )
            return yield* Effect.fail(new Error("Missing API key"))
          })
        )
      )
    return key
  })

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
    name: Args.text({ name: "name" }).pipe(Args.withDescription("Name of the pipeline")),
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
      const headers: Record<string, string> = {}
      if (Option.isSome(args.authHeader) && Option.isSome(args.authValue)) {
        headers[args.authHeader.value] = args.authValue.value
      }

      const requestBody = {
        name: args.name,
        transformation: args.transformation,
        filter: args.filter,
        filterKeys: args.filterKeys,
        networks: args.networks,
        delivery: {
          adapter: "HTTP",
          connection: {
            host: args.webhookUrl,
            headers
          }
        }
      }

      const request = HttpClientRequest.post("https://app.indexing.co/dw/pipelines").pipe(
        HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key)),
        HttpClientRequest.setHeader("Content-Type", "application/json"),
        HttpClientRequest.bodyText(JSON.stringify(requestBody))
      )

      const response = yield* client.execute(request).pipe(
        Effect.flatMap((response) => response.json),
        Effect.catchAll((error) => {
          return Console.error(`Failed to create pipeline: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

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
)

// Main pipelines command with subcommands
export const pipelinesCommand = Command.make("pipelines").pipe(
  Command.withSubcommands([
    pipelinesListCommand,
    pipelinesCreateCommand,
    pipelinesBackfillCommand,
    pipelinesDeleteCommand
  ])
)
