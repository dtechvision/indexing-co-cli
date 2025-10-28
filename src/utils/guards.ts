export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined

export const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined

export const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined

export const asStringArray = (value: unknown): ReadonlyArray<string> | undefined =>
  Array.isArray(value) && value.every((item) => typeof item === "string") ? (value as ReadonlyArray<string>) : undefined
