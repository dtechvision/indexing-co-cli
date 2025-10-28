import React from "react"
import { Box, Text } from "ink"
import type { ThemeName } from "../state.js"
import { getTheme } from "../theme.js"

export interface CommandBarProps {
  readonly input: string
  readonly themeName: ThemeName
  readonly message?: string
}

const CommandBar: React.FC<CommandBarProps> = ({ input, message, themeName }) => {
  const theme = getTheme(themeName)

  return (
    <Box paddingX={1} paddingY={0} borderStyle="single" borderColor={theme.accent}>
      <Text color={theme.accent}>:</Text>
      <Text color={theme.text}>{input}</Text>
      {message && (
        <Box marginLeft={2}>
          <Text color={theme.muted}>{message}</Text>
        </Box>
      )}
    </Box>
  )
}

export default CommandBar
