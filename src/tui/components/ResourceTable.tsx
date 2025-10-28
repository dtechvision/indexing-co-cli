import { Box, Text } from "ink"
import type { ThemeName, ViewMode } from "../state.js"
import { getTheme } from "../theme.js"

export interface TableCell {
  readonly text: string
  readonly color?: string
}

export interface TableColumn<T> {
  readonly key: string
  readonly header: string
  readonly width: number
  readonly align?: "left" | "right"
  readonly render: (item: T) => TableCell
}

export interface ResourceTableProps<T> {
  readonly columns: ReadonlyArray<TableColumn<T>>
  readonly items: ReadonlyArray<T>
  readonly selectedIndex: number
  readonly searchMatches: ReadonlyArray<number>
  readonly currentMatch: number
  readonly viewMode: ViewMode
  readonly themeName: ThemeName
  readonly isFocused: boolean
  readonly emptyMessage: string
}

const pointer = "▸"

const ResourceTable = <T,>({
  columns,
  currentMatch,
  emptyMessage,
  isFocused,
  items,
  searchMatches,
  selectedIndex,
  themeName,
  viewMode
}: ResourceTableProps<T>) => {
  const theme = getTheme(themeName)

  if (viewMode === "json") {
    const serialized = JSON.stringify(items, null, 2)
    return (
      <Box flexDirection="column" flexGrow={1} paddingX={1} borderStyle="single" borderColor={theme.surfaceAlt}>
        {serialized.split("\n").map((line, index) => (
          <Text key={index} color={theme.text} wrap="truncate-middle">
            {line}
          </Text>
        ))}
      </Box>
    )
  }

  if (items.length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1} padding={1} borderStyle="single" borderColor={theme.surfaceAlt}>
        <Text color={theme.muted}>{emptyMessage}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor={theme.surfaceAlt}>
      <Box paddingX={1}>
        <Box width={2}>
          <Text color={theme.muted}>{"  "}</Text>
        </Box>
        {columns.map((column) => (
          <Box
            key={column.key}
            flexBasis={0}
            flexGrow={column.width}
            marginRight={1}
            justifyContent={column.align === "right" ? "flex-end" : "flex-start"}
          >
          <Text
            color={theme.muted}
            {...(theme.surfaceAlt ? { backgroundColor: theme.surfaceAlt } : {})}
          >
            {column.header}
          </Text>
          </Box>
        ))}
      </Box>
      <Box flexDirection="column">
        {items.map((item, index) => {
          const isSelected = index === selectedIndex
          const isMatch = searchMatches.includes(index)
          const isCurrentMatch = isMatch && searchMatches[currentMatch] === index
          const backgroundColor = isSelected
            ? theme.accentSoft
            : isCurrentMatch
              ? theme.surfaceAlt
              : isMatch
                ? theme.surface
                : undefined
          const textColor = isSelected ? theme.background : theme.text
          return (
            <Box key={index} paddingX={1}>
              <Box width={2}>
                {isSelected ? (
                  <Text
                    color={isFocused ? theme.accent : theme.muted}
                    {...(backgroundColor ? { backgroundColor } : {})}
                  >
                    {pointer}
                  </Text>
                ) : (
                  <Text
                    color={theme.muted}
                    {...(backgroundColor ? { backgroundColor } : {})}
                  >
                    ·
                  </Text>
                )}
              </Box>
              {columns.map((column) => {
                const cell = column.render(item)
                return (
                  <Box
                    key={column.key}
                    flexBasis={0}
                    flexGrow={column.width}
                    marginRight={1}
                    justifyContent={column.align === "right" ? "flex-end" : "flex-start"}
                  >
                    <Text
                      color={cell.color ?? textColor}
                      wrap="truncate-middle"
                      {...(backgroundColor ? { backgroundColor } : {})}
                    >
                      {cell.text}
                    </Text>
                  </Box>
                )
              })}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default ResourceTable
