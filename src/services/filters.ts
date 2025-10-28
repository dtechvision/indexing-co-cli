import * as HttpClient from "@effect/platform/HttpClient"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import { createJsonRequest, executeJson } from "./http.js"
import type { Filter, FilterMutationRequest } from "./types.js"
import { asString, asStringArray, isRecord } from "../utils/guards.js"

export interface FilterServiceOptions {
  readonly baseUrl?: string
}

const normalizeFilter = (entity: unknown): Filter => {
  if (!isRecord(entity)) {
    throw new Error("Filter payload is not an object")
  }

  const name = asString(entity.name) ?? asString(entity.id)
  if (!name) {
    throw new Error("Filter payload missing name")
  }

  const values = asStringArray(entity.values) ?? []

  return {
    name,
    values,
    raw: entity
  }
}

const extractFilterCollection = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload
  }

  if (isRecord(payload)) {
    const candidates = payload.filters ?? payload.items ?? payload.data ?? payload.results
    if (Array.isArray(candidates)) {
      return candidates
    }
  }

  return []
}

export const listFilters = (
  client: HttpClient.HttpClient,
  apiKey: Redacted.Redacted | string,
  options: FilterServiceOptions = {}
) =>
  executeJson(
    client,
    createJsonRequest("/filters", apiKey, {
      ...(options.baseUrl ? { baseUrl: options.baseUrl } : {})
    })
  ).pipe(
    Effect.map((payload) => ({
      items: extractFilterCollection(payload).map((entry) => normalizeFilter(entry)),
      raw: payload
    }))
  )

export const createFilter = (
  client: HttpClient.HttpClient,
  apiKey: Redacted.Redacted | string,
  request: FilterMutationRequest,
  options: FilterServiceOptions = {}
) =>
  executeJson(
    client,
    createJsonRequest(`/filters/${encodeURIComponent(request.name)}`, apiKey, {
      ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
      method: "POST",
      body: { values: request.values }
    })
  )

export const removeFilterValues = (
  client: HttpClient.HttpClient,
  apiKey: Redacted.Redacted | string,
  request: FilterMutationRequest,
  options: FilterServiceOptions = {}
) =>
  executeJson(
    client,
    createJsonRequest(`/filters/${encodeURIComponent(request.name)}`, apiKey, {
      ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
      method: "DELETE",
      body: { values: request.values }
    })
  )
