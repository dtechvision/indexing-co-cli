import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as FileSystem from "@effect/platform/FileSystem"
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

// Note: List all transformations endpoint doesn't exist

// Command to list all transformations (returns transformation names)
export const transformationsListCommand = Command.make(
  "list",
  { apiKey: apiKeyOption },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* getApiKey(args.apiKey)

      const request = HttpClientRequest.get("https://app.indexing.co/dw/transformations").pipe(
        HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key))
      )

      const response = yield* client.execute(request).pipe(
        Effect.flatMap((response) => response.json),
        Effect.catchAll((error) => {
          return Console.error(`Failed to fetch transformations: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

      yield* Console.log("Transformations fetched successfully:")
      yield* Console.log(JSON.stringify(response, null, 2))
    })
)

// Command to test a transformation
export const transformationsTestCommand = Command.make(
  "test",
  {
    apiKey: apiKeyOption,
    network: Options.text("network").pipe(
      Options.withDescription("Network to test against (e.g., base_sepolia)")
    ),
    beat: Options.text("beat").pipe(
      Options.withDescription("Block beat to test against")
    ),
    file: Args.file({ name: "file", exists: "yes" }).pipe(
      Args.withDescription("Path to the JavaScript transformation file")
    )
  },
  (args) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const key = yield* getApiKey(args.apiKey)
      const fs = yield* FileSystem.FileSystem

      // Read the transformation file
      const fileContent = yield* fs.readFileString(args.file).pipe(
        Effect.catchAll((error) => {
          return Console.error(`Failed to read file ${args.file}: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(new Error(`Failed to read file: ${error}`)))
          )
        })
      )

      const url = `https://app.indexing.co/dw/transformations/test?network=${args.network}&beat=${args.beat}`

      const response = yield* Effect.gen(function*() {
        const request = yield* HttpClientRequest.post(url).pipe(
          HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key)),
          HttpClientRequest.setHeader("Content-Type", "application/json"),
          HttpClientRequest.bodyJson({ code: fileContent })
        )

        const httpResponse = yield* client.execute(request)
        return yield* httpResponse.json
      }).pipe(
        Effect.catchAll((error) => {
          return Console.error(`Failed to test transformation: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

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
      const key = yield* getApiKey(args.apiKey)
      const fs = yield* FileSystem.FileSystem

      // Read the transformation file
      const fileContent = yield* fs.readFileString(args.file).pipe(
        Effect.catchAll((error) => {
          return Console.error(`Failed to read file ${args.file}: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(new Error(`Failed to read file: ${error}`)))
          )
        })
      )

      const url = `https://app.indexing.co/dw/transformations/${args.name}`

      const response = yield* Effect.gen(function*() {
        const request = yield* HttpClientRequest.post(url).pipe(
          HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key)),
          HttpClientRequest.setHeader("Content-Type", "application/json"),
          HttpClientRequest.bodyJson({ code: fileContent })
        )

        const httpResponse = yield* client.execute(request)
        return yield* httpResponse.json
      }).pipe(
        Effect.catchAll((error) => {
          return Console.error(`Failed to create transformation: ${error}`).pipe(
            Effect.flatMap(() => Effect.fail(error))
          )
        })
      )

      yield* Console.log(`Transformation '${args.name}' created successfully:`)
      yield* Console.log(JSON.stringify(response, null, 2))
    })
)

// Main transformations command with subcommands
export const transformationsCommand = Command.make("transformations").pipe(
  Command.withSubcommands([transformationsListCommand, transformationsTestCommand, transformationsCreateCommand])
)
