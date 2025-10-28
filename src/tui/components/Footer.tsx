import React from "react"
import { Box, Text } from "ink"
import type { FocusArea, InputMode, ResourceTab, ThemeName } from "../state.js"
import { getTheme } from "../theme.js"

export interface FooterProps {
  readonly mode: InputMode
  readonly focus: FocusArea
  readonly themeName: ThemeName
  readonly activeTab: ResourceTab
}

const modeLabels: Record<InputMode, string> = {
  NORMAL: "NORMAL",
  SEARCH: "SEARCH",
  COMMAND: "COMMAND"
}

const Footer: React.FC<FooterProps> = ({ activeTab, focus, mode, themeName }) => {
  const theme = getTheme(themeName)

  const hints = [
    "hjkl navigate",
    "gg/G jump",
    "/ search",
    ": command",
    "r refresh",
    "? help"
  ]

  return (
    <Box
      justifyContent="space-between"
      paddingX={1}
      paddingY={0}
      borderStyle="single"
      borderColor={theme.surfaceAlt}
    >
      <Box>
        <Text color={theme.muted}>Mode </Text>
        <Text color={theme.accent}>{modeLabels[mode]}</Text>
        <Text color={theme.muted}>{" · Focus "}</Text>
        <Text color={theme.accent}>{focus.toUpperCase()}</Text>
        <Text color={theme.muted}>{" · Tab "}</Text>
        <Text color={theme.accent}>{activeTab.toUpperCase()}</Text>
      </Box>
      <Box>
        {hints.map((hint, index) => (
          <Box key={hint} marginLeft={index === 0 ? 0 : 2}>
            <Text color={theme.muted}>{hint}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default Footer
