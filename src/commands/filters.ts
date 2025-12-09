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

// Helper function to parse and validate filter values
// Handles both comma-separated strings and individual values
// Prevents the bug where "0xaaa,0xbbb,0xccc" is treated as a single value
const parseFilterValues = (rawValues: Iterable<string>) =>
  Effect.gen(function*() {
    const values = Array.from(rawValues)

    if (values.length === 0) {
      yield* Console.error("At least one --values flag is required")
      return yield* Effect.fail(new Error("No values provided"))
    }

    // Check if any value contains commas (potential bug)
    const hasCommas = values.some((v) => v.includes(","))

    if (hasCommas) {
      // Split comma-separated values and flatten
      const expandedValues = values.flatMap((v) =>
        v.split(",").map((addr) => addr.trim()).filter((addr) => addr.length > 0)
      )

      // Validate that after filtering empty strings, we still have values
      if (expandedValues.length === 0) {
        yield* Console.error("No valid values provided after parsing comma-separated input")
        return yield* Effect.fail(new Error("No valid values provided"))
      }

      yield* Console.warn(
        "Warning: Detected comma-separated values. Automatically splitting into individual addresses."
      )
      yield* Console.warn(
        `Parsed ${values.length} input(s) into ${expandedValues.length} address(es)`
      )

      return expandedValues
    }

    return values
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
      Options.withDescription("Contract addresses to remove from the filter (supports comma-separated values)")
    )
  },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* getApiKey(args.apiKey)

      // Parse and validate values (handles comma-separated inputs)
      const values = yield* parseFilterValues(args.values)

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
      Options.withDescription("Contract addresses to include in the filter (supports comma-separated values)")
    )
  },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* getApiKey(args.apiKey)

      // Parse and validate values (handles comma-separated inputs)
      const values = yield* parseFilterValues(args.values)

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
