import * as Options from "@effect/cli/Options"
import * as Config from "effect/Config"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"

const apiKeyConfig = Config.redacted("API_KEY_INDEXING_CO").pipe(
  Config.withDescription("API key for indexing.co")
)

export const apiKeyOption = Options.redacted("api-key").pipe(
  Options.optional,
  Options.withDescription("API key for indexing.co (overrides API_KEY_INDEXING_CO env var)")
)

export const resolveApiKey = (cliApiKey: Option.Option<Redacted.Redacted>) =>
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
