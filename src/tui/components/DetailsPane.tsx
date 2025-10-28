import React from "react"
import { Box, Text } from "ink"
import type { DetailMode, ThemeName } from "../state.js"
import { getTheme } from "../theme.js"

export interface DetailsPaneProps {
  readonly mode: DetailMode
  readonly themeName: ThemeName
  readonly title: string
  readonly item?: unknown
  readonly onClose?: () => void
}

const DetailsPane: React.FC<DetailsPaneProps> = ({ item, mode, onClose, themeName, title }) => {
  const theme = getTheme(themeName)

  if (mode === "hidden" || !item) {
    return null
  }

  const serialized = JSON.stringify(item, null, 2)
  const content = serialized.split("\n").slice(0, 200)

  if (mode === "modal") {
    return (
      <Box borderStyle="double" borderColor={theme.accent} flexDirection="column" padding={1} margin={1}>
        <Box justifyContent="space-between" marginBottom={1}>
          <Text color={theme.accent}>{title}</Text>
          <Text color={theme.muted}>press esc</Text>
        </Box>
        {content.map((line, index) => (
          <Text key={index} color={theme.text} wrap="truncate-middle">
            {line}
          </Text>
        ))}
        {onClose && (
          <Box marginTop={1}>
            <Text color={theme.muted}>Press esc to close</Text>
          </Box>
        )}
      </Box>
    )
  }

  return (
    <Box width={40} flexDirection="column" borderStyle="single" borderColor={theme.surfaceAlt} paddingX={1}>
      <Text color={theme.accent}>{title}</Text>
      <Box flexDirection="column" marginTop={1}>
        {content.map((line, index) => (
          <Text key={index} color={theme.text} wrap="truncate-middle">
            {line}
          </Text>
        ))}
      </Box>
    </Box>
  )
}

export default DetailsPane
