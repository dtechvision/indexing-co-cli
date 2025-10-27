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

// Note: List all filters endpoint doesn't exist
// Use GET /filters/{name} to list values for a specific filter

// Command to list all filters (returns filter names)
export const filtersListCommand = Command.make("list", { apiKey: apiKeyOption }, (args) =>
  Effect.gen(function*() {
    const client = yield* HttpClient.HttpClient
    const key = yield* getApiKey(args.apiKey)

    const request = HttpClientRequest.get("https://app.indexing.co/dw/filters").pipe(
      HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key))
    )

    const response = yield* client.execute(request).pipe(
      Effect.flatMap((response) => response.json),
      Effect.catchAll((error) => {
        return Console.error(`Failed to fetch filters: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      })
    )

    yield* Console.log("Filters fetched successfully:")
    yield* Console.log(JSON.stringify(response, null, 2))
  }))

// Command to remove values from a filter
export const filtersRemoveCommand = Command.make(
  "remove",
  {
    apiKey: apiKeyOption,
    name: Args.text({ name: "name" }).pipe(Args.withDescription("Name of the filter")),
    values: Options.text("values").pipe(
      Options.repeated,
      Options.withDescription("Contract addresses to remove from the filter")
    )
  },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* getApiKey(args.apiKey)

      const values = Array.from(args.values) // Options.repeated returns an Effect Chunk; convert to array
      if (values.length === 0) {
        yield* Console.error("At least one --values flag is required")
        return yield* Effect.fail(new Error("No values provided"))
      }

      const requestBody = {
        values
      }

      const requestBase = HttpClientRequest.del(`https://app.indexing.co/dw/filters/${args.name}`).pipe(
        HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key))
      )
      const request = yield* HttpClientRequest.bodyJson(requestBody)(requestBase)

      const response = yield* client.execute(request).pipe(
        Effect.flatMap((response) => response.json),
        Effect.catchAll((error) => {
          return Console.error(`Failed to remove values from filter: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

      yield* Console.log(`Values removed from filter '${args.name}' successfully:`)
      yield* Console.log(JSON.stringify(response, null, 2))
    })
)

// Command to create a filter
export const filtersCreateCommand = Command.make(
  "create",
  {
    apiKey: apiKeyOption,
    name: Args.text({ name: "name" }).pipe(Args.withDescription("Name of the filter")),
    values: Options.text("values").pipe(
      Options.repeated,
      Options.withDescription("Contract addresses to include in the filter")
    )
  },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* getApiKey(args.apiKey)

      const values = Array.from(args.values) // Options.repeated returns an Effect Chunk; convert to array
      if (values.length === 0) {
        yield* Console.error("At least one --values flag is required")
        return yield* Effect.fail(new Error("No values provided"))
      }

      const requestBody = {
        values
      }

      const requestBase = HttpClientRequest.post(`https://app.indexing.co/dw/filters/${args.name}`).pipe(
        HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key))
      )
      const request = yield* HttpClientRequest.bodyJson(requestBody)(requestBase)

      const response = yield* client.execute(request).pipe(
        Effect.flatMap((response) => response.json),
        Effect.catchAll((error) => {
          return Console.error(`Failed to create filter: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

      yield* Console.log(`Filter '${args.name}' created successfully:`)
      yield* Console.log(JSON.stringify(response, null, 2))
    })
)

// Main filters command with subcommands
export const filtersCommand = Command.make("filters").pipe(
  Command.withSubcommands([filtersCreateCommand, filtersRemoveCommand, filtersListCommand])
)
