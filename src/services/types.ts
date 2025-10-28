export interface Pipeline {
  readonly id?: string
  readonly name: string
  readonly status?: string
  readonly filter?: string
  readonly transformation?: string
  readonly networks?: ReadonlyArray<string>
  readonly createdAt?: string
  readonly updatedAt?: string
  readonly summary?: string
  readonly paused?: boolean
  readonly raw: Record<string, unknown>
}

export interface PipelineList {
  readonly items: ReadonlyArray<Pipeline>
  readonly raw: unknown
}

export interface PipelineBackfillRequest {
  readonly network: string
  readonly value: string
  readonly beatStart?: number
  readonly beatEnd?: number
  readonly beats?: ReadonlyArray<number>
}

export interface PipelineTestRequest {
  readonly network: string
  readonly beat?: string
  readonly hash?: string
}

export interface PipelineCreateRequest {
  readonly name: string
  readonly transformation: string
  readonly filter: string
  readonly filterKeys: ReadonlyArray<string>
  readonly networks: ReadonlyArray<string>
  readonly delivery: {
    readonly adapter: string
    readonly connection: {
      readonly host: string
      readonly headers?: Readonly<Record<string, string>>
    }
  }
}

export interface Filter {
  readonly name: string
  readonly values: ReadonlyArray<string>
  readonly raw: Record<string, unknown>
}

export interface FilterList {
  readonly items: ReadonlyArray<Filter>
  readonly raw: unknown
}

export interface FilterMutationRequest {
  readonly name: string
  readonly values: ReadonlyArray<string>
}

export interface Transformation {
  readonly name: string
  readonly status?: string
  readonly version?: string
  readonly language?: string
  readonly checksum?: string
  readonly createdAt?: string
  readonly updatedAt?: string
  readonly raw: Record<string, unknown>
}

export interface TransformationList {
  readonly items: ReadonlyArray<Transformation>
  readonly raw: unknown
}

export interface TransformationTestRequest {
  readonly network: string
  readonly beat?: string
  readonly hash?: string
  readonly code: string
}
