import * as HttpClient from "@effect/platform/HttpClient"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import { createJsonRequest, executeJson } from "./http.js"
import type { Transformation, TransformationTestRequest } from "./types.js"
import { asString, isRecord } from "../utils/guards.js"

export interface TransformationServiceOptions {
  readonly baseUrl?: string
}

const coerceTransformations = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload
  }
  if (isRecord(payload)) {
    const candidates = Option.fromNullable(payload.transformations)
      .pipe(Option.orElse(() => Option.fromNullable(payload.items)))
      .pipe(Option.orElse(() => Option.fromNullable(payload.data)))
    if (Option.isSome(candidates) && Array.isArray(candidates.value)) {
      return candidates.value
    }
  }
  return []
}

const normalizeTransformation = (entity: unknown): Transformation => {
  if (!isRecord(entity)) {
    throw new Error("Transformation payload is not an object")
  }

  const name = asString(entity.name) ?? asString(entity.id)
  if (!name) {
    throw new Error("Transformation payload missing name")
  }
  const status = asString(entity.status) ?? asString(entity.state)
  const version = asString(entity.version)
  const language = asString(entity.language ?? entity.lang)
  const checksum = asString(entity.checksum)
  const createdAt = asString(entity.createdAt ?? entity.created_at)
  const updatedAt = asString(entity.updatedAt ?? entity.updated_at)

  return {
    name,
    raw: entity,
    ...(status ? { status } : {}),
    ...(version ? { version } : {}),
    ...(language ? { language } : {}),
    ...(checksum ? { checksum } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {})
  }
}

export const listTransformations = (
  client: HttpClient.HttpClient,
  apiKey: Redacted.Redacted | string,
  options: TransformationServiceOptions = {}
) =>
  executeJson(
    client,
    createJsonRequest("/transformations", apiKey, {
      ...(options.baseUrl ? { baseUrl: options.baseUrl } : {})
    })
  ).pipe(
    Effect.map((payload) => ({
      items: coerceTransformations(payload).map((entry) => normalizeTransformation(entry)),
      raw: payload
    }))
  )

export const testTransformation = (
  client: HttpClient.HttpClient,
  apiKey: Redacted.Redacted | string,
  request: TransformationTestRequest,
  options: TransformationServiceOptions = {}
) => {
  if (!request.beat && !request.hash) {
    return Effect.fail(new Error("Either beat or hash must be provided to test a transformation"))
  }
  const params = new URLSearchParams({ network: request.network })
  if (request.beat) {
    params.set("beat", request.beat)
  }
  if (request.hash) {
    params.set("hash", request.hash)
  }
  return executeJson(
    client,
    createJsonRequest(`/transformations/test?${params.toString()}`, apiKey, {
      ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
      method: "POST",
      body: { code: request.code }
    })
  )
}

export const createTransformation = (
  client: HttpClient.HttpClient,
  apiKey: Redacted.Redacted | string,
  name: string,
  code: string,
  options: TransformationServiceOptions = {}
) =>
  executeJson(
    client,
    createJsonRequest(`/transformations/${encodeURIComponent(name)}`, apiKey, {
      ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
      method: "POST",
      body: { code }
    })
  )
