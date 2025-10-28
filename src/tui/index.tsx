import type * as HttpClient from "@effect/platform/HttpClient"
import React from "react"
import { render } from "ink"
import type * as Runtime from "effect/Runtime"
import App from "./App.js"
import type { LogLevel, ThemeName } from "./state.js"

export interface StartTuiOptions {
  readonly runtime: Runtime.Runtime<never>
  readonly httpClient: HttpClient.HttpClient
  readonly apiKey: string
  readonly refreshInterval: number
  readonly theme: ThemeName
  readonly logLevel: LogLevel
}

export const startTui = (options: StartTuiOptions) => {
  const { waitUntilExit } = render(React.createElement(App, options))
  return waitUntilExit()
}
