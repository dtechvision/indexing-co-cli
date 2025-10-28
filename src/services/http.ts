import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"

export const DEFAULT_BASE_URL = "https://app.indexing.co/dw"

export const buildUrl = (path: string, baseUrl: string = DEFAULT_BASE_URL) => {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path
  return `${baseUrl}/${normalizedPath}`
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

const makeRequest = (method: HttpMethod, url: string) => {
  switch (method) {
    case "GET":
      return HttpClientRequest.get(url)
    case "POST":
      return HttpClientRequest.post(url)
    case "PUT":
      return HttpClientRequest.put(url)
    case "PATCH":
      return HttpClientRequest.patch(url)
    case "DELETE":
      return HttpClientRequest.del(url)
  }
}

export interface RequestOptions {
  readonly method?: HttpMethod
  readonly baseUrl?: string
  readonly body?: unknown
  readonly headers?: Readonly<Record<string, string>>
}

export const createJsonRequest = (
  path: string,
  apiKey: Redacted.Redacted | string,
  options: RequestOptions = {}
) => {
  const method = options.method ?? "GET"
  const url = buildUrl(path, options.baseUrl)
  const request = makeRequest(method, url).pipe(
    HttpClientRequest.setHeader("X-API-KEY", typeof apiKey === "string" ? apiKey : Redacted.value(apiKey))
  )

  const withBody =
    options.body === undefined
      ? request
      : request.pipe(
          HttpClientRequest.setHeader("Content-Type", "application/json"),
          HttpClientRequest.bodyText(JSON.stringify(options.body))
        )

  const withHeaders = options.headers
    ? Object.entries(options.headers).reduce(
        (acc, [key, value]) => acc.pipe(HttpClientRequest.setHeader(key, value)),
        withBody
      )
    : withBody

  return withHeaders
}

export const executeJson = <A = unknown>(
  client: HttpClient.HttpClient,
  request: HttpClientRequest.HttpClientRequest
) =>
  client.execute(request).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap((response) =>
      response.json.pipe(
        Effect.map((body) => body as A)
      )
    )
  )
