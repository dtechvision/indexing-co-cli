import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as HttpClient from "@effect/platform/HttpClient"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { apiKeyOption, resolveApiKey } from "../config/apiKey.js"
import { createFilter, listFilters, removeFilterValues } from "../services/filters.js"
import type { FilterMutationRequest } from "../services/types.js"

// Note: List all filters endpoint doesn't exist
// Use GET /filters/{name} to list values for a specific filter

// Command to list all filters (returns filter names)
export const filtersListCommand = Command.make("list", { apiKey: apiKeyOption }, (args) =>
  Effect.gen(function*() {
    const client = yield* HttpClient.HttpClient
    const key = yield* resolveApiKey(args.apiKey)

    const filters = yield* listFilters(client, key)

    yield* Console.log("Filters fetched successfully:")
    yield* Console.log(JSON.stringify(filters.raw, null, 2))
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
      const key = yield* resolveApiKey(args.apiKey)

      const request: FilterMutationRequest = {
        name: args.name,
        values: args.values
      }

      const response = yield* removeFilterValues(client, key, request)

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
      const key = yield* resolveApiKey(args.apiKey)

      const request: FilterMutationRequest = {
        name: args.name,
        values: args.values
      }

      const response = yield* createFilter(client, key, request)

      yield* Console.log(`Filter '${args.name}' created successfully:`)
      yield* Console.log(JSON.stringify(response, null, 2))
    })
)

// Main filters command with subcommands
export const filtersCommand = Command.make("filters").pipe(
  Command.withSubcommands([filtersCreateCommand, filtersRemoveCommand, filtersListCommand])
)
