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

// Pipeline command that fetches all pipelines from indexing.co API
export const pipelinesCommand = Command.make("pipelines", { apiKey: apiKeyOption }, (args) =>
  Effect.gen(function*() {
    const client = yield* HttpClient.HttpClient

    // Use CLI argument if provided, otherwise fall back to config (env var)
    const key = yield* (Option.isSome(args.apiKey)
      ? Effect.succeed(args.apiKey.value)
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

    const request = HttpClientRequest.get("https://app.indexing.co/dw/pipelines").pipe(
      HttpClientRequest.setHeader("X-API-KEY", Redacted.value(key))
    )

    const response = yield* client.execute(request).pipe(
      Effect.flatMap((response) => response.json),
      Effect.catchAll((error) => {
        return Console.error(`Failed to fetch pipelines: ${error}`).pipe(
          Effect.as([])
        )
      })
    )

    yield* Console.log("Pipelines fetched successfully:")
    yield* Console.log(JSON.stringify(response, null, 2))
  }))
