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

// Command to list all filters or get details of a specific filter
export const filtersListCommand = Command.make(
  "list",
  {
    apiKey: apiKeyOption,
    name: Args.text({ name: "name" }).pipe(
      Args.optional,
      Args.withDescription("Name of the filter to get details for (omit to list all filters)")
    ),
    all: Options.boolean("all").pipe(
      Options.withDefault(false),
      Options.withDescription("List all filters (ignores name argument)")
    ),
    pageToken: Options.text("page-token").pipe(
      Options.optional,
      Options.withDescription("Pagination token for results")
    ),
    prefix: Options.text("prefix").pipe(
      Options.optional,
      Options.withDescription("Filter values by prefix (e.g., 0x123)")
    ),
    includeTimestamps: Options.boolean("include-timestamps").pipe(
      Options.withDefault(false),
      Options.withDescription("Include timestamps for when filter values were added")
    )
  },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* getApiKey(args.apiKey)

      // If --all flag is set or no name provided, list all filters
      if (args.all || Option.isNone(args.name)) {
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
      } else {
        // Get details of a specific filter
        const filterName = args.name.value

        // Build URL with query parameters
        const queryParams = new URLSearchParams()
        if (Option.isSome(args.pageToken)) {
          queryParams.set("pageToken", args.pageToken.value)
        }
        if (Option.isSome(args.prefix)) {
          queryParams.set("prefix", args.prefix.value)
        }
        if (args.includeTimestamps) {
          queryParams.set("includeTimestamps", "true")
        }

        const queryString = queryParams.toString()
        const url = `https://app.indexing.co/dw/filters/${filterName}${queryString ? `?${queryString}` : ""}`

        const request = HttpClientRequest.get(url).pipe(
          HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key))
        )

        const response = yield* client.execute(request).pipe(
          Effect.flatMap((response) => response.json),
          Effect.catchAll((error) => {
            return Console.error(`Failed to fetch filter '${filterName}': ${error}`).pipe(
              Effect.flatMap(() => Effect.fail(error))
            )
          })
        )

        yield* Console.log(`Filter '${filterName}' values:`)
        yield* Console.log(JSON.stringify(response, null, 2))
      }
    })
)

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

      const httpResponse = yield* client.execute(request).pipe(
        Effect.catchAll((error) => {
          return Console.error(`Failed to remove values from filter: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

      if (httpResponse.status < 200 || httpResponse.status >= 300) {
        const errorBody = yield* Effect.catchAll(httpResponse.text, () => Effect.succeed(""))
        const messageSuffix = errorBody !== "" ? `: ${errorBody}` : ""
        yield* Console.error(
          `Failed to remove values from filter '${args.name}': received status ${httpResponse.status}${messageSuffix}`
        )
        return yield* Effect.fail(new Error(`Filter removal failed with status ${httpResponse.status}`))
      }

      const response = yield* httpResponse.json.pipe(
        Effect.catchAll((error) => {
          return Console.error(`Failed to parse filter removal response: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

      if (typeof response === "object" && response !== null && "error" in response && response.error) {
        const errorMessage = String((response as { error: unknown }).error)
        yield* Console.error(`Failed to remove values from filter '${args.name}': ${errorMessage}`)
        return yield* Effect.fail(new Error(`Filter removal failed: ${errorMessage}`))
      }

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

      const httpResponse = yield* client.execute(request).pipe(
        Effect.catchAll((error) => {
          return Console.error(`Failed to create filter: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

      if (httpResponse.status < 200 || httpResponse.status >= 300) {
        const errorBody = yield* Effect.catchAll(httpResponse.text, () => Effect.succeed(""))
        const messageSuffix = errorBody !== "" ? `: ${errorBody}` : ""
        yield* Console.error(
          `Failed to create filter '${args.name}': received status ${httpResponse.status}${messageSuffix}`
        )
        return yield* Effect.fail(new Error(`Filter creation failed with status ${httpResponse.status}`))
      }

      const response = yield* httpResponse.json.pipe(
        Effect.catchAll((error) => {
          return Console.error(`Failed to parse filter creation response: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

      if (typeof response === "object" && response !== null && "error" in response && response.error) {
        const errorMessage = String((response as { error: unknown }).error)
        yield* Console.error(`Failed to create filter '${args.name}': ${errorMessage}`)
        return yield* Effect.fail(new Error(`Filter creation failed: ${errorMessage}`))
      }

      yield* Console.log(`Filter '${args.name}' created successfully:`)
      yield* Console.log(JSON.stringify(response, null, 2))
    })
)

// Main filters command with subcommands
export const filtersCommand = Command.make("filters").pipe(
  Command.withSubcommands([filtersCreateCommand, filtersRemoveCommand, filtersListCommand])
)
