import React from "react"
import { Box, Text } from "ink"
import type { ThemeName } from "../state.js"
import { getTheme } from "../theme.js"

export interface MessageBannerProps {
  readonly type: "info" | "error"
  readonly text: string
  readonly themeName: ThemeName
}

const MessageBanner: React.FC<MessageBannerProps> = ({ text, themeName, type }) => {
  const theme = getTheme(themeName)
  const color = type === "error" ? theme.error : theme.accent

  return (
    <Box paddingX={1} paddingY={0} borderStyle="single" borderColor={color}>
      <Text color={color}>{text}</Text>
    </Box>
  )
}

export default MessageBanner
