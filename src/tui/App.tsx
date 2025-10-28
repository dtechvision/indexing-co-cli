import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { Box, useApp, useInput } from "ink"
import * as Runtime from "effect/Runtime"
import type { StartTuiOptions } from "./index.js"
import {
  computeSearchMatches,
  initialState,
  reducer
} from "./state.js"
import type {
  ActivityEntry,
  DetailMode,
  FocusArea,
  InputMode,
  ResourceTab
} from "./state.js"
import Header from "./components/Header.js"
import Sidebar from "./components/Sidebar.js"
import ResourceTable, { type TableColumn } from "./components/ResourceTable.js"
import DetailsPane from "./components/DetailsPane.js"
import Footer from "./components/Footer.js"
import CommandBar from "./components/CommandBar.js"
import HelpOverlay from "./components/HelpOverlay.js"
import MessageBanner from "./components/MessageBanner.js"
import { getTheme } from "./theme.js"
import {
  backfillPipeline,
  deletePipeline,
  listFilters,
  listPipelines,
  listTransformations,
  testPipeline
} from "../services/index.js"
import type {
  Filter,
  Pipeline,
  PipelineBackfillRequest,
  PipelineTestRequest,
  Transformation
} from "../services/types.js"

const maskKey = (value: string) => {
  if (!value) {
    return "<missing>"
  }
  if (value.length <= 6) {
    return "*".repeat(value.length)
  }
  return `${value.slice(0, 4)}…${value.slice(-2)}`
}

const createActivityEntry = (
  source: ResourceTab | "system" | "command",
  title: string,
  status: ActivityEntry["status"],
  message?: string,
  metadata?: Record<string, unknown>
): ActivityEntry => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  source,
  title,
  status,
  timestamp: Date.now(),
  ...(message ? { message } : {}),
  ...(metadata ? { metadata } : {})
})

type ActionState =
  | { type: "pipeline-backfill"; pipeline: Pipeline; stage: "network" | "value"; network?: string }
  | { type: "pipeline-delete"; pipeline: Pipeline; stage: "confirm" }
  | { type: "pipeline-test"; pipeline: Pipeline; stage: "network" | "target"; network?: string }

const pageSize = 10

const App: React.FC<StartTuiOptions> = ({
  apiKey,
  httpClient,
  logLevel,
  refreshInterval,
  runtime,
  theme
}) => {
  const { exit } = useApp()
  const [state, dispatch] = useReducer(
    reducer,
    initialState,
    (base) => ({
      ...base,
      refreshInterval,
      refreshCountdown: refreshInterval,
      theme,
      logLevel
    })
  )

  const [apiKeyValue, setApiKeyValue] = useState(apiKey)
  const [mask, setMask] = useState(maskKey(apiKey))
  const [commandHint, setCommandHint] = useState<string | undefined>()
  const [activeAction, setActiveAction] = useState<ActionState | undefined>(undefined)
  const countdownRef = useRef<NodeJS.Timeout>()
  const keyBufferTimer = useRef<NodeJS.Timeout>()
  const refreshingRef = useRef(false)

  const currentTabState = state.tabStates[state.activeTab]
  const selectedItem = useMemo(() => {
    const items = currentTabState.items as ReadonlyArray<Pipeline | Filter | Transformation | ActivityEntry>
    return items[currentTabState.selectedIndex]
  }, [currentTabState.items, currentTabState.selectedIndex])

  const selectedPipeline = state.activeTab === "pipelines" ? (selectedItem as Pipeline | undefined) : undefined

  const logActivity = useCallback(
    (entry: ActivityEntry) => {
      dispatch({ type: "appendActivity", entry })
    },
    [dispatch]
  )

  const setFocus = useCallback((focus: FocusArea) => {
    dispatch({ type: "setFocus", focus })
  }, [])

  const cycleFocus = useCallback(
    (direction: 1 | -1) => {
      const order: FocusArea[] = ["sidebar", "content", "detail"]
      const index = order.indexOf(state.focus)
      const next = order[(index + direction + order.length) % order.length]
      setFocus(next)
    },
    [setFocus, state.focus]
  )

  const resetCountdown = useCallback(
    (intervalSeconds: number) => {
      dispatch({ type: "setRefreshCountdown", countdown: intervalSeconds })
    },
    []
  )

  const fetchPipelines = useCallback(async () => {
    dispatch({ type: "setTabLoading", tab: "pipelines", isLoading: true })
    try {
      const response = await Runtime.runPromise(runtime, listPipelines(httpClient, apiKeyValue))
      dispatch({ type: "updateTabItems", tab: "pipelines", items: response.items, timestamp: Date.now() })
      logActivity(createActivityEntry("pipelines", "Synced pipelines", "success", undefined, { count: response.items.length }))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      dispatch({ type: "setTabError", tab: "pipelines", error: message })
      logActivity(createActivityEntry("pipelines", "Pipeline sync failed", "error", message))
    }
  }, [apiKeyValue, httpClient, logActivity, runtime])

  const fetchFilters = useCallback(async () => {
    dispatch({ type: "setTabLoading", tab: "filters", isLoading: true })
    try {
      const response = await Runtime.runPromise(runtime, listFilters(httpClient, apiKeyValue))
      dispatch({ type: "updateTabItems", tab: "filters", items: response.items, timestamp: Date.now() })
      logActivity(createActivityEntry("filters", "Synced filters", "success", undefined, { count: response.items.length }))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      dispatch({ type: "setTabError", tab: "filters", error: message })
      logActivity(createActivityEntry("filters", "Filter sync failed", "error", message))
    }
  }, [apiKeyValue, httpClient, logActivity, runtime])

  const fetchTransformations = useCallback(async () => {
    dispatch({ type: "setTabLoading", tab: "transformations", isLoading: true })
    try {
      const response = await Runtime.runPromise(runtime, listTransformations(httpClient, apiKeyValue))
      dispatch({ type: "updateTabItems", tab: "transformations", items: response.items, timestamp: Date.now() })
      logActivity(createActivityEntry("transformations", "Synced transformations", "success", undefined, { count: response.items.length }))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      dispatch({ type: "setTabError", tab: "transformations", error: message })
      logActivity(createActivityEntry("transformations", "Transformation sync failed", "error", message))
    }
  }, [apiKeyValue, httpClient, logActivity, runtime])

  const refreshAll = useCallback(async () => {
    if (refreshingRef.current) {
      return
    }
    refreshingRef.current = true
    dispatch({ type: "setMessage", message: null })
    try {
      await Promise.all([fetchPipelines(), fetchFilters(), fetchTransformations()])
      resetCountdown(state.refreshInterval)
    } finally {
      refreshingRef.current = false
    }
  }, [fetchFilters, fetchPipelines, fetchTransformations, resetCountdown, state.refreshInterval])

  useEffect(() => {
    refreshAll().catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      dispatch({ type: "setMessage", message: { type: "error", text: message } })
    })
  }, [refreshAll])

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      dispatch({ type: "tickRefresh" })
    }, 1000)
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (state.refreshCountdown === 0) {
      refreshAll().catch((error) => {
        const message = error instanceof Error ? error.message : String(error)
        dispatch({ type: "setMessage", message: { type: "error", text: message } })
      })
    }
  }, [refreshAll, state.refreshCountdown])

  useEffect(() => {
    if (!state.keyBuffer) {
      return
    }
    if (keyBufferTimer.current) {
      clearTimeout(keyBufferTimer.current)
    }
    keyBufferTimer.current = setTimeout(() => {
      dispatch({ type: "setKeyBuffer", value: "" })
    }, 600)
    return () => {
      if (keyBufferTimer.current) {
        clearTimeout(keyBufferTimer.current)
      }
    }
  }, [state.keyBuffer])

  const setSearchQuery = useCallback(
    (tab: ResourceTab, query: string) => {
      const matches = computeSearchMatches(state.tabStates[tab].items, query)
      dispatch({ type: "setSearchQuery", tab, query, matches })
      if (matches.length > 0) {
        dispatch({ type: "setSelection", tab, index: matches[0] })
      }
    },
    [state.tabStates]
  )

  const clearSearch = useCallback(
    (tab: ResourceTab) => {
      dispatch({ type: "clearSearch", tab })
    },
    []
  )

  const setMode = useCallback((mode: InputMode) => {
    dispatch({ type: "setMode", mode })
  }, [])

  const moveSelection = useCallback(
    (delta: number) => {
      dispatch({ type: "moveSelection", tab: state.activeTab, delta })
    },
    [state.activeTab]
  )

  const jumpToIndex = useCallback(
    (index: number) => {
      dispatch({ type: "setSelection", tab: state.activeTab, index })
    },
    [state.activeTab]
  )

  const cycleSearchMatch = useCallback(
    (direction: 1 | -1) => {
      const tab = state.activeTab
      const { searchMatches, currentMatch } = state.tabStates[tab]
      if (searchMatches.length === 0) {
        return
      }
      const next = (currentMatch + direction + searchMatches.length) % searchMatches.length
      dispatch({ type: "setCurrentMatch", tab, current: next })
      dispatch({ type: "setSelection", tab, index: searchMatches[next] })
    },
    [state.activeTab, state.tabStates]
  )

  const setActiveTab = useCallback((tab: ResourceTab) => {
    dispatch({ type: "setActiveTab", tab })
    setFocus("content")
  }, [setFocus])

  const toggleDetailMode = useCallback(() => {
    const newMode: DetailMode = state.detailMode === "hidden" ? "split" : "hidden"
    dispatch({ type: "setDetailMode", detailMode: newMode })
  }, [state.detailMode])

  const openDetailModal = useCallback(() => {
    dispatch({ type: "setDetailMode", detailMode: "modal" })
  }, [])

  const closeDetailModal = useCallback(() => {
    if (state.detailMode === "modal") {
      dispatch({ type: "setDetailMode", detailMode: "split" })
    }
  }, [state.detailMode])

  const toggleViewMode = useCallback(() => {
    dispatch({ type: "setViewMode", view: state.viewMode === "table" ? "json" : "table" })
  }, [state.viewMode])

  const handleBookmark = useCallback(
    (key: string) => {
      dispatch({ type: "addBookmark", key, tab: state.activeTab, index: state.tabStates[state.activeTab].selectedIndex })
      dispatch({ type: "setMessage", message: { type: "info", text: `Saved mark '${key}'` } })
    },
    [state.activeTab, state.tabStates]
  )

  const jumpToBookmark = useCallback(
    (key: string) => {
      const mark = state.bookmarks[key]
      if (!mark) {
        dispatch({ type: "setMessage", message: { type: "error", text: `No mark for '${key}'` } })
        return
      }
      setActiveTab(mark.tab)
      dispatch({ type: "setSelection", tab: mark.tab, index: mark.index })
    },
    [setActiveTab, state.bookmarks]
  )

  const beginBackfill = useCallback(() => {
    if (!selectedPipeline) {
      dispatch({ type: "setMessage", message: { type: "error", text: "Select a pipeline first" } })
      return
    }
    setActiveAction({ type: "pipeline-backfill", pipeline: selectedPipeline, stage: "network" })
    setMode("COMMAND")
    dispatch({ type: "setCommandInput", value: "" })
    setCommandHint("network (e.g. base)")
  }, [selectedPipeline, setMode, setActiveAction, setCommandHint])

  const beginPipelineDelete = useCallback(() => {
    if (!selectedPipeline) {
      dispatch({ type: "setMessage", message: { type: "error", text: "Select a pipeline first" } })
      return
    }
    setActiveAction({ type: "pipeline-delete", pipeline: selectedPipeline, stage: "confirm" })
    setMode("COMMAND")
    dispatch({ type: "setCommandInput", value: "" })
    setCommandHint("type 'yes' to delete")
  }, [selectedPipeline, setMode, setActiveAction, setCommandHint])

  const beginPipelineTest = useCallback(() => {
    if (!selectedPipeline) {
      dispatch({ type: "setMessage", message: { type: "error", text: "Select a pipeline first" } })
      return
    }
    setActiveAction({ type: "pipeline-test", pipeline: selectedPipeline, stage: "network" })
    setMode("COMMAND")
    dispatch({ type: "setCommandInput", value: "" })
    setCommandHint("network (e.g. base)")
  }, [selectedPipeline, setMode, setActiveAction, setCommandHint])

  const handleCommandExecution = useCallback(
    (rawCommand: string) => {
      const command = rawCommand.trim()
      if (!command) {
        setMode("NORMAL")
        return
      }
      dispatch({ type: "pushCommandHistory", command })

      const segments = command.replace(/^:/, "").split(/\s+/)
      const [head, ...rest] = segments

      switch (head) {
        case "refresh":
          refreshAll().catch(() => undefined)
          dispatch({ type: "setMessage", message: { type: "info", text: "Refreshing…" } })
          break
        case "set": {
          const [key, value] = rest
          if (key === "refresh") {
            const intervalValue = Number(value)
            if (!Number.isNaN(intervalValue) && intervalValue > 0) {
              dispatch({ type: "setRefreshInterval", interval: intervalValue })
              dispatch({ type: "setMessage", message: { type: "info", text: `Refresh interval ${intervalValue}s` } })
            } else {
              dispatch({ type: "setMessage", message: { type: "error", text: "Refresh must be > 0" } })
            }
          } else if (key === "theme" && (value === "dark" || value === "light" || value === "mono")) {
            dispatch({ type: "setTheme", theme: value })
          } else if (key === "log-level" && (value === "info" || value === "debug")) {
            dispatch({ type: "setLogLevel", logLevel: value })
          } else if (key === "api-key" && value) {
            const newKey = rest.slice(1).join(" ")
            setApiKeyValue(newKey)
            setMask(maskKey(newKey))
            dispatch({ type: "setMessage", message: { type: "info", text: "API key updated" } })
          } else {
            dispatch({ type: "setMessage", message: { type: "error", text: `Unknown setting ${key}` } })
          }
          break
        }
        case "help":
          dispatch({ type: "toggleHelp", value: true })
          break
        case "logs":
          setActiveTab("activity")
          break
        case "filter": {
          const [tabName, ...queryParts] = rest
          const query = queryParts.join(" ")
          if (tabName === "pipelines" || tabName === "filters" || tabName === "transformations") {
            setSearchQuery(tabName, query)
            setActiveTab(tabName)
          }
          break
        }
        case "view": {
          const [tabName] = rest
          if (tabName === "pipelines" || tabName === "filters" || tabName === "transformations" || tabName === "activity") {
            setActiveTab(tabName)
          }
          break
        }
        case "quit":
        case "q":
          exit()
          break
        default:
          dispatch({ type: "setMessage", message: { type: "error", text: `Unknown command: ${command}` } })
      }

      dispatch({ type: "setCommandInput", value: "" })
      setCommandHint(undefined)
      setMode("NORMAL")
    },
    [exit, refreshAll, setActiveTab, setApiKeyValue, setMode, setSearchQuery, setCommandHint]
  )

  const handleCommandInput = useCallback(
    (input: string) => {
      dispatch({ type: "setCommandInput", value: state.commandInput + input })
    },
    [state.commandInput]
  )

  const handleCommandBackspace = useCallback(() => {
    if (state.commandInput.length === 0) {
      return
    }
    dispatch({ type: "setCommandInput", value: state.commandInput.slice(0, -1) })
  }, [state.commandInput])

  const handleSearchInput = useCallback(
    (value: string) => {
      const tab = state.activeTab
      setSearchQuery(tab, state.tabStates[tab].searchQuery + value)
    },
    [setSearchQuery, state.activeTab, state.tabStates]
  )

  const handleSearchBackspace = useCallback(() => {
    const tab = state.activeTab
    const query = state.tabStates[tab].searchQuery
    if (query.length === 0) {
      return
    }
    setSearchQuery(tab, query.slice(0, -1))
  }, [setSearchQuery, state.activeTab, state.tabStates])

  const handleActionSubmit = useCallback(
    async (rawInput: string) => {
      if (!activeAction) {
        return false
      }
      const inputValue = rawInput.trim()

      const finish = (message?: { type: "info" | "error"; text: string }) => {
        dispatch({ type: "setCommandInput", value: "" })
        setActiveAction(undefined)
        setMode("NORMAL")
        setCommandHint(undefined)
        dispatch({ type: "setMessage", message: message ?? null })
      }

      try {
        if (activeAction.type === "pipeline-backfill") {
          if (activeAction.stage === "network") {
            if (!inputValue) {
              setCommandHint("network is required")
              return true
            }
            setActiveAction({ ...activeAction, stage: "value", network: inputValue })
            dispatch({ type: "setCommandInput", value: "" })
            setCommandHint("value (address or hash)")
            return true
          }
          if (!inputValue || !activeAction.network) {
            setCommandHint("value is required")
            return true
          }
          const request: PipelineBackfillRequest = {
            network: activeAction.network,
            value: inputValue
          }
          dispatch({ type: "setMessage", message: { type: "info", text: "Backfilling pipeline…" } })
          await Runtime.runPromise(runtime, backfillPipeline(httpClient, apiKeyValue, activeAction.pipeline.name, request))
          logActivity(createActivityEntry("pipelines", `Backfill ${activeAction.pipeline.name}`, "success", undefined, request as unknown as Record<string, unknown>))
          await fetchPipelines()
          finish({ type: "info", text: "Backfill triggered" })
          return true
        }

        if (activeAction.type === "pipeline-delete") {
          if (inputValue.toLowerCase() !== "yes") {
            setCommandHint("type 'yes' to confirm")
            return true
          }
          dispatch({ type: "setMessage", message: { type: "info", text: "Deleting pipeline…" } })
          await Runtime.runPromise(runtime, deletePipeline(httpClient, apiKeyValue, activeAction.pipeline.name))
          logActivity(createActivityEntry("pipelines", `Deleted ${activeAction.pipeline.name}`, "success"))
          await fetchPipelines()
          finish({ type: "info", text: "Pipeline deleted" })
          return true
        }

        if (activeAction.type === "pipeline-test") {
          if (activeAction.stage === "network") {
            if (!inputValue) {
              setCommandHint("network is required")
              return true
            }
            setActiveAction({ ...activeAction, stage: "target", network: inputValue })
            dispatch({ type: "setCommandInput", value: "" })
            setCommandHint("beat:<n> or hash:<value>")
            return true
          }
          if (!activeAction.network) {
            setCommandHint("network missing")
            return true
          }
          let request: PipelineTestRequest | undefined
          if (inputValue.startsWith("beat:")) {
            const beat = inputValue.slice(5).trim()
            if (!beat) {
              setCommandHint("beat value required")
              return true
            }
            request = { network: activeAction.network, beat }
          } else if (inputValue.startsWith("hash:")) {
            const hash = inputValue.slice(5).trim()
            if (!hash) {
              setCommandHint("hash value required")
              return true
            }
            request = { network: activeAction.network, hash }
          } else if (/^0x/i.test(inputValue)) {
            request = { network: activeAction.network, hash: inputValue }
          } else if (/^\d+$/.test(inputValue)) {
            request = { network: activeAction.network, beat: inputValue }
          }

          if (!request) {
            setCommandHint("prefix with beat: or hash:")
            return true
          }

          dispatch({ type: "setMessage", message: { type: "info", text: "Testing pipeline…" } })
          const response = await Runtime.runPromise(runtime, testPipeline(httpClient, apiKeyValue, activeAction.pipeline.name, request))
          logActivity(createActivityEntry("pipelines", `Test ${activeAction.pipeline.name}`, "success", undefined, { request, response }))
          finish({ type: "info", text: "Pipeline test completed" })
          return true
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        finish({ type: "error", text: message })
        logActivity(createActivityEntry("pipelines", "Action failed", "error", message))
        return true
      }
      return false
    },
    [activeAction, apiKeyValue, fetchPipelines, httpClient, logActivity, runtime, setActiveAction, setCommandHint, setMode]
  )

  useInput((input, key) => {
      if (state.showHelp && key.escape) {
        dispatch({ type: "toggleHelp", value: false })
        return
      }

    if (state.detailMode === "modal" && key.escape) {
      closeDetailModal()
      return
    }

    if (state.mode === "COMMAND") {
      if (activeAction) {
        if (key.return) {
          void handleActionSubmit(state.commandInput)
        } else if (key.escape) {
          dispatch({ type: "setCommandInput", value: "" })
          setActiveAction(undefined)
          setCommandHint(undefined)
          setMode("NORMAL")
        } else if (key.backspace) {
          handleCommandBackspace()
        } else if (input) {
          handleCommandInput(input)
        }
      } else {
        if (key.return) {
          handleCommandExecution(state.commandInput)
        } else if (key.escape) {
          dispatch({ type: "setCommandInput", value: "" })
          setCommandHint(undefined)
          setMode("NORMAL")
        } else if (key.backspace) {
          handleCommandBackspace()
        } else if (key.upArrow) {
          const nextCursor = Math.min(state.commandHistory.length - 1, state.commandCursor + 1)
          if (nextCursor >= 0) {
            dispatch({ type: "setCommandCursor", cursor: nextCursor })
            dispatch({ type: "setCommandInput", value: state.commandHistory[nextCursor] })
          }
        } else if (key.downArrow) {
          const nextCursor = Math.max(-1, state.commandCursor - 1)
          dispatch({ type: "setCommandCursor", cursor: nextCursor })
          dispatch({ type: "setCommandInput", value: nextCursor >= 0 ? state.commandHistory[nextCursor] : "" })
        } else if (input) {
          handleCommandInput(input)
        }
      }
      return
    }

    if (state.mode === "SEARCH") {
      if (key.return) {
        setMode("NORMAL")
      } else if (key.escape) {
        clearSearch(state.activeTab)
        setMode("NORMAL")
      } else if (key.backspace) {
        handleSearchBackspace()
      } else if (input) {
        handleSearchInput(input)
      }
      return
    }

    if (key.ctrl && input === "c") {
      exit()
      return
    }

    if (input === "q" && !key.ctrl) {
      exit()
      return
    }

    if (key.tab) {
      cycleFocus(key.shift ? -1 : 1)
      return
    }

    if (input === "K") {
      setMode("COMMAND")
      dispatch({ type: "setCommandInput", value: "set api-key " })
      setCommandHint("enter API key and press enter")
      return
    }

    if (input === ":") {
      setMode("COMMAND")
      dispatch({ type: "setCommandInput", value: "" })
      setCommandHint(undefined)
      return
    }

    if (input === "/") {
      setMode("SEARCH")
      clearSearch(state.activeTab)
      return
    }

    if (input === "?") {
      dispatch({ type: "toggleHelp", value: true })
      return
    }

    if (input === "r") {
      refreshAll().catch(() => undefined)
      return
    }

    if (input === "v") {
      toggleViewMode()
      return
    }

    if (input === "d" && state.focus !== "sidebar") {
      toggleDetailMode()
      return
    }

    if (state.activeTab === "pipelines") {
      if (input === "b") {
        beginBackfill()
        return
      }
      if (input === "t") {
        beginPipelineTest()
        return
      }
      if (input === "D") {
        beginPipelineDelete()
        return
      }
    }

    if (input === "g") {
      if (state.keyBuffer === "g") {
        jumpToIndex(0)
        dispatch({ type: "setKeyBuffer", value: "" })
      } else {
        dispatch({ type: "setKeyBuffer", value: "g" })
      }
      return
    }

    if (state.keyBuffer === "g") {
      if (input === "a") {
        setActiveTab("activity")
      } else if (input === "p") {
        setActiveTab("pipelines")
      } else if (input === "f") {
        setActiveTab("filters")
      } else if (input === "t") {
        setActiveTab("transformations")
      } else if (input === "g") {
        jumpToIndex(0)
      }
      dispatch({ type: "setKeyBuffer", value: "" })
      return
    }

    if (input === "G") {
      jumpToIndex(currentTabState.items.length - 1)
      return
    }

    if (input === "n") {
      cycleSearchMatch(1)
      return
    }

    if (input === "N") {
      cycleSearchMatch(-1)
      return
    }

    if (input === "m") {
      dispatch({ type: "setKeyBuffer", value: "m" })
      return
    }

    if (state.keyBuffer === "m") {
      if (/^[a-z0-9]$/i.test(input)) {
        handleBookmark(input)
      }
      dispatch({ type: "setKeyBuffer", value: "" })
      return
    }

    if (input === "'") {
      dispatch({ type: "setKeyBuffer", value: "'" })
      return
    }

    if (state.keyBuffer === "'") {
      if (/^[a-z0-9]$/i.test(input)) {
        jumpToBookmark(input)
      }
      dispatch({ type: "setKeyBuffer", value: "" })
      return
    }

    if (state.focus === "sidebar") {
      if (input === "j" || key.downArrow) {
        const tabs: ResourceTab[] = ["pipelines", "filters", "transformations", "activity"]
        const index = tabs.indexOf(state.activeTab)
        const nextTab = tabs[(index + 1) % tabs.length]
        setActiveTab(nextTab)
      } else if (input === "k" || key.upArrow) {
        const tabs: ResourceTab[] = ["pipelines", "filters", "transformations", "activity"]
        const index = tabs.indexOf(state.activeTab)
        const nextTab = tabs[(index - 1 + tabs.length) % tabs.length]
        setActiveTab(nextTab)
      }
      return
    }

    if (state.focus === "content") {
      if (input === "j" || key.downArrow) {
        moveSelection(1)
      } else if (input === "k" || key.upArrow) {
        moveSelection(-1)
      } else if (key.pageDown || (key.ctrl && input === "f")) {
        moveSelection(pageSize)
      } else if (key.pageUp || (key.ctrl && input === "b")) {
        moveSelection(-pageSize)
      } else if (key.return) {
        openDetailModal()
      }
      return
    }

    if (state.focus === "detail" && key.escape) {
      closeDetailModal()
    }
  })

  const themeColors = getTheme(state.theme)

  const pipelineColumns: TableColumn<Pipeline>[] = useMemo(
    () => [
      { key: "name", header: "Name", width: 4, render: (item) => ({ text: item.name }) },
      {
        key: "status",
        header: "Status",
        width: 2,
        render: (item) => {
          const status = item.status ?? "unknown"
          const color = status === "running" ? themeColors.success : status === "paused" ? themeColors.warning : themeColors.muted
          return { text: status, color }
        }
      },
      {
        key: "transformation",
        header: "Transformation",
        width: 3,
        render: (item) => ({ text: item.transformation ?? "-" })
      },
      {
        key: "filter",
        header: "Filter",
        width: 3,
        render: (item) => ({ text: item.filter ?? "-" })
      },
      {
        key: "networks",
        header: "Networks",
        width: 3,
        render: (item) => ({ text: item.networks?.join(", ") ?? "-" })
      }
    ],
    [themeColors]
  )

  const filterColumns: TableColumn<Filter>[] = useMemo(
    () => [
      { key: "name", header: "Name", width: 4, render: (item) => ({ text: item.name }) },
      {
        key: "values",
        header: "Values",
        width: 4,
        render: (item) => ({ text: item.values.join(", ") })
      },
      {
        key: "count",
        header: "Count",
        width: 2,
        align: "right",
        render: (item) => ({ text: String(item.values.length) })
      }
    ],
    []
  )

  const transformationColumns: TableColumn<Transformation>[] = useMemo(
    () => [
      { key: "name", header: "Name", width: 4, render: (item) => ({ text: item.name }) },
      {
        key: "status",
        header: "Status",
        width: 2,
        render: (item) => ({ text: item.status ?? "unknown" })
      },
      {
        key: "version",
        header: "Version",
        width: 2,
        render: (item) => ({ text: item.version ?? "-" })
      },
      {
        key: "language",
        header: "Language",
        width: 2,
        render: (item) => ({ text: item.language ?? "js" })
      }
    ],
    []
  )

  const activityColumns: TableColumn<ActivityEntry>[] = useMemo(
    () => [
      {
        key: "time",
        header: "When",
        width: 2,
        render: (item) => ({ text: new Date(item.timestamp).toLocaleTimeString() })
      },
      {
        key: "source",
        header: "Source",
        width: 2,
        render: (item) => ({ text: item.source })
      },
      {
        key: "title",
        header: "Event",
        width: 4,
        render: (item) => ({ text: item.title })
      },
      {
        key: "status",
        header: "Status",
        width: 2,
        render: (item) => ({ text: item.status })
      }
    ],
    []
  )

  const activeColumns = state.activeTab === "pipelines"
    ? pipelineColumns
    : state.activeTab === "filters"
      ? filterColumns
      : state.activeTab === "transformations"
        ? transformationColumns
        : activityColumns

  const headerCounts: Record<ResourceTab, number> = {
    pipelines: state.tabStates.pipelines.items.length,
    filters: state.tabStates.filters.items.length,
    transformations: state.tabStates.transformations.items.length,
    activity: state.tabStates.activity.items.length
  }

  const environmentLabel = "Production"

  const tabItems = currentTabState.items as ReadonlyArray<any>

  return (
    <Box flexDirection="column" flexGrow={1} height="100%">
      <Header
        activeTab={state.activeTab}
        apiKeyMasked={mask}
        counts={headerCounts}
        environmentLabel={environmentLabel}
        logLevel={state.logLevel}
        refreshCountdown={state.refreshCountdown}
        refreshInterval={state.refreshInterval}
        themeName={state.theme}
        {...(currentTabState.lastUpdated !== undefined ? { lastUpdated: currentTabState.lastUpdated } : {})}
      />

      {state.message && (
        <MessageBanner text={state.message.text} type={state.message.type} themeName={state.theme} />
      )}

      <Box flexDirection="row" flexGrow={1} position="relative">
        <Sidebar activeTab={state.activeTab} counts={headerCounts} focus={state.focus} themeName={state.theme} />

        <Box flexDirection="row" flexGrow={1} paddingX={1}>
          <ResourceTable
            columns={activeColumns as ReadonlyArray<TableColumn<any>>}
            currentMatch={currentTabState.currentMatch}
            emptyMessage={currentTabState.isLoading ? "Loading…" : "No entries"}
            isFocused={state.focus === "content"}
            items={tabItems}
            searchMatches={currentTabState.searchMatches}
            selectedIndex={currentTabState.selectedIndex}
            themeName={state.theme}
            viewMode={state.viewMode}
          />
          {state.detailMode !== "hidden" && state.detailMode !== "modal" && (
            <DetailsPane
              item={selectedItem}
              mode="split"
              themeName={state.theme}
              title={`${state.activeTab} detail`}
            />
          )}
        </Box>

        {state.detailMode === "modal" && (
          <DetailsPane item={selectedItem} mode="modal" onClose={closeDetailModal} themeName={state.theme} title="Detail" />
        )}

        {state.showHelp && <HelpOverlay themeName={state.theme} />}
      </Box>

      {state.mode === "COMMAND" && (
        <CommandBar
          input={state.commandInput}
          themeName={state.theme}
          {...(commandHint ? { message: commandHint } : {})}
        />
      )}

      <Footer activeTab={state.activeTab} focus={state.focus} mode={state.mode} themeName={state.theme} />
    </Box>
  )
}

export default App
