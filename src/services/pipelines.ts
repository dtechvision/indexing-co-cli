import * as HttpClient from "@effect/platform/HttpClient"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import { createJsonRequest, executeJson } from "./http.js"
import type {
  Pipeline,
  PipelineBackfillRequest,
  PipelineCreateRequest,
  PipelineTestRequest
} from "./types.js"
import { asBoolean, asString, asStringArray, isRecord } from "../utils/guards.js"

const coerceCollection = (payload: unknown): ReadonlyArray<unknown> => {
  if (Array.isArray(payload)) {
    return payload
  }
  if (isRecord(payload)) {
    const candidates = Option.fromNullable(payload.pipelines)
      .pipe(Option.orElse(() => Option.fromNullable(payload.items)))
      .pipe(Option.orElse(() => Option.fromNullable(payload.data)))
      .pipe(Option.orElse(() => Option.fromNullable(payload.results)))
    if (Option.isSome(candidates) && Array.isArray(candidates.value)) {
      return candidates.value
    }
  }
  return []
}

const normalizePipeline = (entity: unknown): Pipeline => {
  if (!isRecord(entity)) {
    throw new Error("Pipeline payload is not an object")
  }
  const name = asString(entity.name) ?? asString(entity.id)
  if (!name) {
    throw new Error("Pipeline payload missing name")
  }
  const id = asString(entity.id)
  const status = asString(entity.status) ?? asString(entity.state) ?? asString(entity.pipelineStatus)
  const filter = asString(entity.filter) ?? asString(entity.filterName)
  const transformation = asString(entity.transformation) ?? asString(entity.transformationName)
  const createdAt = asString(entity.createdAt ?? entity.created_at)
  const updatedAt = asString(entity.updatedAt ?? entity.updated_at)
  const summary = asString(entity.summary ?? entity.description)
  const paused = asBoolean(entity.paused ?? entity.isPaused)

  return {
    name,
    networks: asStringArray(entity.networks) ?? [],
    raw: entity,
    ...(id ? { id } : {}),
    ...(status ? { status } : {}),
    ...(filter ? { filter } : {}),
    ...(transformation ? { transformation } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(summary ? { summary } : {}),
    ...(paused !== undefined ? { paused } : {})
  }
}

export interface PipelineListOptions {
  readonly baseUrl?: string
}

export const listPipelines = (
  client: HttpClient.HttpClient,
  apiKey: Redacted.Redacted | string,
  options: PipelineListOptions = {}
) =>
  executeJson(
    client,
    createJsonRequest("/pipelines", apiKey, {
      ...(options.baseUrl ? { baseUrl: options.baseUrl } : {})
    })
  ).pipe(
    Effect.map((payload) => ({
      items: coerceCollection(payload).map((item) => normalizePipeline(item)),
      raw: payload
    }))
  )

export const createPipeline = (
  client: HttpClient.HttpClient,
  apiKey: Redacted.Redacted | string,
  requestBody: PipelineCreateRequest,
  options: PipelineListOptions = {}
) =>
  executeJson(
    client,
    createJsonRequest("/pipelines", apiKey, {
      ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
      method: "POST",
      body: requestBody
    })
  )

export const deletePipeline = (
  client: HttpClient.HttpClient,
  apiKey: Redacted.Redacted | string,
  name: string,
  options: PipelineListOptions = {}
) =>
  executeJson(
    client,
    createJsonRequest(`/pipelines/${encodeURIComponent(name)}`, apiKey, {
      ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
      method: "DELETE"
    })
  )

export const testPipeline = (
  client: HttpClient.HttpClient,
  apiKey: Redacted.Redacted | string,
  name: string,
  request: PipelineTestRequest,
  options: PipelineListOptions = {}
) => {
  if (!request.beat && !request.hash) {
    return Effect.fail(new Error("Either beat or hash must be provided to test a pipeline"))
  }

  let path = `/pipelines/${encodeURIComponent(name)}/test/${encodeURIComponent(request.network)}`
  if (request.beat) {
    path += `/${encodeURIComponent(request.beat)}`
  } else if (request.hash) {
    path += `/${encodeURIComponent(request.hash)}`
  }

  return executeJson(
    client,
    createJsonRequest(path, apiKey, {
      ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
      method: "POST"
    })
  )
}

export const backfillPipeline = (
  client: HttpClient.HttpClient,
  apiKey: Redacted.Redacted | string,
  name: string,
  request: PipelineBackfillRequest,
  options: PipelineListOptions = {}
) =>
  executeJson(
    client,
    createJsonRequest(`/pipelines/${encodeURIComponent(name)}/backfill`, apiKey, {
      ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
      method: "POST",
      body: request
    })
  )
