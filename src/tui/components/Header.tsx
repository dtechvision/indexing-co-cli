import React from "react"
import { Box, Text } from "ink"
import type { LogLevel, ResourceTab } from "../state.js"
import type { ThemeName } from "../state.js"
import { getTheme } from "../theme.js"

export interface HeaderProps {
  readonly activeTab: ResourceTab
  readonly themeName: ThemeName
  readonly apiKeyMasked: string
  readonly environmentLabel: string
  readonly refreshCountdown: number
  readonly refreshInterval: number
  readonly lastUpdated?: number
  readonly counts: Record<ResourceTab, number>
  readonly logLevel: LogLevel
}

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) {
    return "never"
  }
  const deltaSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (deltaSeconds < 5) {
    return "just now"
  }
  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`
  }
  const minutes = Math.round(deltaSeconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

const resourceLabels: Record<ResourceTab, string> = {
  pipelines: "Pipelines",
  filters: "Filters",
  transformations: "Transforms",
  activity: "Activity"
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  apiKeyMasked,
  counts,
  environmentLabel,
  lastUpdated,
  logLevel,
  refreshCountdown,
  refreshInterval,
  themeName
}) => {
  const theme = getTheme(themeName)

  return (
    <Box flexDirection="column" paddingX={1} paddingBottom={1} borderStyle="single" borderColor={theme.accent}>
      <Box justifyContent="space-between">
        <Box>
          <Text color={theme.accent}>Indexingco</Text>
          <Text color={theme.muted}>{" · "}</Text>
          <Text>{environmentLabel}</Text>
          <Text color={theme.muted}>{" · "}</Text>
          <Text color={theme.muted}>Mode: </Text>
          <Text color={theme.accentSoft}>{activeTab.toUpperCase()}</Text>
        </Box>
        <Box>
          <Text color={theme.muted}>Refresh </Text>
          <Text color={theme.accent}>{refreshCountdown}s</Text>
          <Text color={theme.muted}>{` / ${refreshInterval}s`}</Text>
          <Text color={theme.muted}>{" · Log "}</Text>
          <Text color={theme.accentSoft}>{logLevel.toUpperCase()}</Text>
          <Text color={theme.muted}>{" · API "}</Text>
          <Text>{apiKeyMasked}</Text>
        </Box>
      </Box>
      <Box marginTop={1} justifyContent="space-between">
        <Box>
          <Text color={theme.muted}>Last updated </Text>
          <Text>{formatTimestamp(lastUpdated)}</Text>
        </Box>
        <Box>
          {Object.entries(counts).map(([tab, count]) => (
            <Box key={tab} marginLeft={2}>
              <Text color={tab === activeTab ? theme.accent : theme.muted}>
                {resourceLabels[tab as ResourceTab] ?? tab}
              </Text>
              <Text color={theme.muted}>{": "}</Text>
              <Text>{count}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export default Header
