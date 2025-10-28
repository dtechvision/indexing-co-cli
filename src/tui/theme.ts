import type { ThemeName } from "./state.js"

interface ThemeColors {
  readonly name: ThemeName
  readonly accent: string
  readonly accentSoft: string
  readonly background: string
  readonly surface: string
  readonly surfaceAlt: string
  readonly text: string
  readonly muted: string
  readonly success: string
  readonly error: string
  readonly warning: string
  readonly backdrop: string
}

export const themes: Record<ThemeName, ThemeColors> = {
  dark: {
    name: "dark",
    accent: "cyan",
    accentSoft: "blue",
    background: "black",
    surface: "#20232a",
    surfaceAlt: "#2b2f38",
    text: "white",
    muted: "gray",
    success: "green",
    error: "red",
    warning: "yellow",
    backdrop: "#111111"
  },
  light: {
    name: "light",
    accent: "blue",
    accentSoft: "#88b7ff",
    background: "white",
    surface: "#f0f4ff",
    surfaceAlt: "#e6ecff",
    text: "black",
    muted: "gray",
    success: "green",
    error: "red",
    warning: "#b58900",
    backdrop: "#f5f5f5"
  },
  mono: {
    name: "mono",
    accent: "white",
    accentSoft: "#bbbbbb",
    background: "black",
    surface: "#1c1c1c",
    surfaceAlt: "#262626",
    text: "white",
    muted: "gray",
    success: "white",
    error: "white",
    warning: "white",
    backdrop: "#101010"
  }
}

export const getTheme = (name: ThemeName) => themes[name]
