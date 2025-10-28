import React from "react"
import { Box, Text } from "ink"
import type { ThemeName } from "../state.js"
import { getTheme } from "../theme.js"

const helpItems: ReadonlyArray<[string, string]> = [
  ["hjkl / arrows", "Move selection"],
  ["tab / shift+tab", "Cycle focus"],
  ["gg / G", "Jump to top/bottom"],
  ["/", "Search current table"],
  ["n / N", "Next / previous match"],
  [":", "Open command palette"],
  ["r", "Refresh all resources"],
  ["K", "Set API key"],
  ["v", "Toggle table/json"],
  ["d", "Toggle details"],
  ["enter", "Open modal detail"],
  ["m + letter", "Bookmark row"],
  ["' + letter", "Jump to bookmark"],
  ["gp/gf/gt/ga", "Jump to Pipelines/Filters/Transforms/Activity"],
  ["q", "Quit"]
]

export interface HelpOverlayProps {
  readonly themeName: ThemeName
}

const HelpOverlay: React.FC<HelpOverlayProps> = ({ themeName }) => {
  const theme = getTheme(themeName)

  return (
    <Box borderStyle="round" borderColor={theme.accent} flexDirection="column" padding={1} margin={1}>
      <Text color={theme.accent}>Keybindings</Text>
      <Box marginTop={1} flexDirection="column">
        {helpItems.map(([keys, description]) => (
          <Box key={keys} justifyContent="space-between">
            <Text color={theme.accentSoft}>{keys}</Text>
            <Text color={theme.text}>{description}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={theme.muted}>Press esc to close</Text>
      </Box>
    </Box>
  )
}

export default HelpOverlay
