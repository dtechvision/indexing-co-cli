import React from "react"
import { Box, Text } from "ink"
import type { FocusArea, ResourceTab } from "../state.js"
import type { ThemeName } from "../state.js"
import { getTheme } from "../theme.js"

export interface SidebarProps {
  readonly activeTab: ResourceTab
  readonly focus: FocusArea
  readonly themeName: ThemeName
  readonly counts: Record<ResourceTab, number>
}

const sidebarTabs: Array<{ id: ResourceTab; label: string; hint: string }> = [
  { id: "pipelines", label: "Pipelines", hint: "gp" },
  { id: "filters", label: "Filters", hint: "gf" },
  { id: "transformations", label: "Transforms", hint: "gt" },
  { id: "activity", label: "Activity Log", hint: "ga" }
]

const placeholders = ["Datasets", "Metrics", "Alerts"]

const Sidebar: React.FC<SidebarProps> = ({ activeTab, counts, focus, themeName }) => {
  const theme = getTheme(themeName)

  return (
    <Box flexDirection="column" width={24} paddingX={1} borderStyle="single" borderColor={focus === "sidebar" ? theme.accent : theme.surfaceAlt}>
      <Text color={theme.muted}>Resources</Text>
      <Box flexDirection="column" marginTop={1}>
        {sidebarTabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <Box key={tab.id} justifyContent="space-between">
              <Text color={isActive ? theme.accent : theme.text}>{tab.label}</Text>
              <Text color={theme.muted}>{counts[tab.id] ?? 0}</Text>
            </Box>
          )
        })}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.muted}>Coming soon</Text>
        {placeholders.map((item) => (
          <Text key={item} color={theme.muted} dimColor>
            {item}
          </Text>
        ))}
      </Box>
    </Box>
  )
}

export default Sidebar
