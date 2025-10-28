import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as HttpClient from "@effect/platform/HttpClient"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import { apiKeyOption, resolveApiKey } from "../config/apiKey.js"
import { startTui } from "../tui/index.js"

const refreshOption = Options.integer("refresh").pipe(
  Options.withDefault(5),
  Options.withDescription("Refresh interval in seconds")
)

const themeOption = Options.text("theme").pipe(
  Options.optional,
  Options.withDescription("Theme to use (dark|light|mono)")
)

const logLevelOption = Options.text("log-level").pipe(
  Options.optional,
  Options.withDescription("Logging verbosity (info|debug)")
)

const parseTheme = (value: string): "dark" | "light" | "mono" => {
  if (value === "dark" || value === "light" || value === "mono") {
    return value
  }
  throw new Error(`Unsupported theme '${value}'. Use dark, light, or mono.`)
}

const parseLogLevel = (value: string): "info" | "debug" => {
  if (value === "info" || value === "debug") {
    return value
  }
  throw new Error(`Unsupported log level '${value}'. Use info or debug.`)
}

export const tuiCommand = Command.make(
  "tui",
  {
    apiKey: apiKeyOption,
    refresh: refreshOption,
    theme: themeOption,
    logLevel: logLevelOption
  },
  (args) =>
    Effect.gen(function*() {
      const key = yield* resolveApiKey(args.apiKey)
      const themeEffect = Option.match(args.theme, {
        onNone: () => Effect.succeed("dark" as const),
        onSome: (value) =>
          Effect.try({
            try: () => parseTheme(value),
            catch: (error) => error as Error
          })
      })
      const logLevelEffect = Option.match(args.logLevel, {
        onNone: () => Effect.succeed("info" as const),
        onSome: (value) =>
          Effect.try({
            try: () => parseLogLevel(value),
            catch: (error) => error as Error
          })
      })

      const [selectedTheme, selectedLogLevel] = yield* Effect.all([themeEffect, logLevelEffect], {
        concurrency: "unbounded"
      })

      const client = yield* HttpClient.HttpClient
      const runtime = yield* Effect.runtime<never>()

      yield* Effect.tryPromise({
        try: () =>
          startTui({
            runtime,
            httpClient: client,
            apiKey: Redacted.value(key),
            refreshInterval: Math.max(1, args.refresh),
            theme: selectedTheme,
            logLevel: selectedLogLevel
          }),
        catch: (error) => error as Error
      })
    })
)
