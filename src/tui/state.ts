import type { Filter, Pipeline, Transformation } from "../services/types.js"

export type ResourceTab = "pipelines" | "filters" | "transformations" | "activity"

export type InputMode = "NORMAL" | "SEARCH" | "COMMAND"

export type ThemeName = "dark" | "light" | "mono"

export type LogLevel = "info" | "debug"

export type ViewMode = "table" | "json"

export type DetailMode = "hidden" | "split" | "modal"

export type ActivitySource = ResourceTab | "system" | "command"

export type ActivityStatus = "success" | "error" | "info" | "pending"

export type FocusArea = "sidebar" | "content" | "detail"

export interface ActivityEntry {
  readonly id: string
  readonly timestamp: number
  readonly source: ActivitySource
  readonly title: string
  readonly status: ActivityStatus
  readonly message?: string
  readonly metadata?: Record<string, unknown>
}

export interface TabState<T> {
  readonly items: ReadonlyArray<T>
  readonly isLoading: boolean
  readonly error: string | null
  readonly selectedIndex: number
  readonly searchQuery: string
  readonly searchMatches: ReadonlyArray<number>
  readonly currentMatch: number
  readonly lastUpdated?: number
}

export interface AppState {
  readonly mode: InputMode
  readonly activeTab: ResourceTab
  readonly viewMode: ViewMode
  readonly detailMode: DetailMode
  readonly refreshInterval: number
  readonly refreshCountdown: number
  readonly focus: FocusArea
  readonly theme: ThemeName
  readonly logLevel: LogLevel
  readonly commandInput: string
  readonly commandHistory: ReadonlyArray<string>
  readonly commandCursor: number
  readonly message: { type: "info" | "error"; text: string } | null
  readonly showHelp: boolean
  readonly keyBuffer: string
  readonly bookmarks: Record<string, { tab: ResourceTab; index: number }>
  readonly tabStates: {
    readonly pipelines: TabState<Pipeline>
    readonly filters: TabState<Filter>
    readonly transformations: TabState<Transformation>
    readonly activity: TabState<ActivityEntry>
  }
}

export const createInitialTabState = <T>(): TabState<T> => ({
  items: [],
  isLoading: true,
  error: null,
  selectedIndex: 0,
  searchQuery: "",
  searchMatches: [],
  currentMatch: 0
})

export const initialState: AppState = {
  mode: "NORMAL",
  activeTab: "pipelines",
  viewMode: "table",
  detailMode: "split",
  refreshInterval: 5,
  refreshCountdown: 5,
  focus: "content",
  theme: "dark",
  logLevel: "info",
  commandInput: "",
  commandHistory: [],
  commandCursor: -1,
  message: null,
  showHelp: false,
  keyBuffer: "",
  bookmarks: {},
  tabStates: {
    pipelines: createInitialTabState<Pipeline>(),
    filters: createInitialTabState<Filter>(),
    transformations: createInitialTabState<Transformation>(),
    activity: {
      ...createInitialTabState<ActivityEntry>(),
      isLoading: false
    }
  }
}

export type AppAction =
  | { type: "setMode"; mode: InputMode }
  | { type: "setActiveTab"; tab: ResourceTab }
  | { type: "setViewMode"; view: ViewMode }
  | { type: "setDetailMode"; detailMode: DetailMode }
  | { type: "setRefreshInterval"; interval: number }
  | { type: "setRefreshCountdown"; countdown: number }
  | { type: "tickRefresh" }
  | { type: "setFocus"; focus: FocusArea }
  | { type: "setTheme"; theme: ThemeName }
  | { type: "setLogLevel"; logLevel: LogLevel }
  | { type: "setCommandInput"; value: string }
  | { type: "pushCommandHistory"; command: string }
  | { type: "setCommandCursor"; cursor: number }
  | { type: "setMessage"; message: { type: "info" | "error"; text: string } | null }
  | { type: "toggleHelp"; value?: boolean }
  | { type: "setKeyBuffer"; value: string }
  | { type: "updateTabItems"; tab: ResourceTab; items: ReadonlyArray<any>; timestamp: number }
  | { type: "setTabLoading"; tab: ResourceTab; isLoading: boolean }
  | { type: "setTabError"; tab: ResourceTab; error: string | null }
  | { type: "moveSelection"; tab: ResourceTab; delta: number }
  | { type: "setSelection"; tab: ResourceTab; index: number }
  | { type: "setSearchQuery"; tab: ResourceTab; query: string; matches: ReadonlyArray<number> }
  | { type: "setCurrentMatch"; tab: ResourceTab; current: number }
  | { type: "clearSearch"; tab: ResourceTab }
  | { type: "addBookmark"; key: string; tab: ResourceTab; index: number }
  | { type: "removeBookmark"; key: string }
  | { type: "appendActivity"; entry: ActivityEntry }

const clampIndex = (index: number, size: number) => {
  if (size <= 0) {
    return 0
  }
  if (index < 0) {
    return 0
  }
  if (index >= size) {
    return size - 1
  }
  return index
}

const updateTabState = <T>(
  state: AppState,
  tab: ResourceTab,
  updater: (previous: TabState<T>) => TabState<T>
) => ({
  ...state,
  tabStates: {
    ...state.tabStates,
    [tab]: updater(state.tabStates[tab] as TabState<T>)
  }
})

export const reducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "setMode":
      return { ...state, mode: action.mode }
    case "setActiveTab":
      return { ...state, activeTab: action.tab }
    case "setViewMode":
      return { ...state, viewMode: action.view }
    case "setDetailMode":
      return { ...state, detailMode: action.detailMode }
    case "setRefreshInterval":
      return {
        ...state,
        refreshInterval: action.interval,
        refreshCountdown: action.interval
      }
    case "setRefreshCountdown":
      return { ...state, refreshCountdown: action.countdown }
    case "tickRefresh":
      return { ...state, refreshCountdown: Math.max(0, state.refreshCountdown - 1) }
    case "setFocus":
      return { ...state, focus: action.focus }
    case "setTheme":
      return { ...state, theme: action.theme }
    case "setLogLevel":
      return { ...state, logLevel: action.logLevel }
    case "setCommandInput":
      return { ...state, commandInput: action.value }
    case "pushCommandHistory":
      return {
        ...state,
        commandHistory: [action.command, ...state.commandHistory].slice(0, 100),
        commandCursor: -1
      }
    case "setCommandCursor":
      return { ...state, commandCursor: action.cursor }
    case "setMessage":
      return { ...state, message: action.message }
    case "toggleHelp":
      return { ...state, showHelp: action.value ?? !state.showHelp }
    case "setKeyBuffer":
      return { ...state, keyBuffer: action.value }
    case "updateTabItems":
      return updateTabState(state, action.tab, (previous) => ({
        ...previous,
        items: action.items,
        isLoading: false,
        error: null,
        lastUpdated: action.timestamp,
        selectedIndex: clampIndex(previous.selectedIndex, action.items.length),
        searchMatches: previous.searchQuery ? recalcMatches(action.items, previous.searchQuery) : previous.searchMatches,
        currentMatch: previous.currentMatch
      }))
    case "setTabLoading":
      return updateTabState(state, action.tab, (previous) => ({
        ...previous,
        isLoading: action.isLoading
      }))
    case "setTabError":
      return updateTabState(state, action.tab, (previous) => ({
        ...previous,
        isLoading: false,
        error: action.error
      }))
    case "moveSelection":
      return updateTabState(state, action.tab, (previous) => ({
        ...previous,
        selectedIndex: clampIndex(previous.selectedIndex + action.delta, previous.items.length)
      }))
    case "setSelection":
      return updateTabState(state, action.tab, (previous) => ({
        ...previous,
        selectedIndex: clampIndex(action.index, previous.items.length)
      }))
    case "setSearchQuery":
      return updateTabState(state, action.tab, (previous) => ({
        ...previous,
        searchQuery: action.query,
        searchMatches: action.matches,
        currentMatch: action.matches.length > 0 ? action.matches[0] : 0
      }))
    case "setCurrentMatch":
      return updateTabState(state, action.tab, (previous) => ({
        ...previous,
        currentMatch: clampIndex(action.current, previous.searchMatches.length)
      }))
    case "clearSearch":
      return updateTabState(state, action.tab, (previous) => ({
        ...previous,
        searchQuery: "",
        searchMatches: [],
        currentMatch: 0
      }))
    case "addBookmark":
      return {
        ...state,
        bookmarks: {
          ...state.bookmarks,
          [action.key]: { tab: action.tab, index: action.index }
        }
      }
    case "removeBookmark": {
      const { [action.key]: _removed, ...rest } = state.bookmarks
      return { ...state, bookmarks: rest }
    }
    case "appendActivity": {
      return updateTabState<ActivityEntry>(state, "activity", (previous) => {
        const items = [action.entry, ...previous.items].slice(0, 500)
        return {
          ...previous,
          items,
          lastUpdated: action.entry.timestamp,
          isLoading: false
        }
      })
    }
    default:
      return state
  }
}

const recalcMatches = (items: ReadonlyArray<any>, query: string) => {
  if (!query) {
    return []
  }
  const normalized = query.toLowerCase()
  const matches: number[] = []
  for (let index = 0; index < items.length; index += 1) {
    const value = serializeItem(items[index])
    if (value.includes(normalized)) {
      matches.push(index)
    }
  }
  return matches
}

const serializeItem = (item: unknown): string => {
  if (item === undefined || item === null) {
    return ""
  }
  if (typeof item === "string") {
    return item.toLowerCase()
  }
  if (typeof item === "number" || typeof item === "boolean") {
    return String(item).toLowerCase()
  }
  if (Array.isArray(item)) {
    return item.map((entry) => serializeItem(entry)).join(" ")
  }
  if (typeof item === "object") {
    return Object.entries(item as Record<string, unknown>)
      .map(([key, value]) => `${key.toLowerCase()}:${serializeItem(value)}`)
      .join(" ")
  }
  return ""
}

export const computeSearchMatches = (items: ReadonlyArray<any>, query: string) => recalcMatches(items, query)
