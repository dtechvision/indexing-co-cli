import { describe, expect, it } from "vitest"
import { computeSearchMatches, initialState, reducer } from "../../src/tui/state.js"

describe("tui state", () => {
  it("computes search matches", () => {
    const matches = computeSearchMatches([
      { name: "alpha" },
      { name: "beta" }
    ], "al")
    expect(matches).toEqual([0])
  })

  it("updates selection when moving", () => {
    const state = {
      ...initialState,
      tabStates: {
        ...initialState.tabStates,
        pipelines: {
          ...initialState.tabStates.pipelines,
          items: [{ name: "alpha" }, { name: "beta" }],
          isLoading: false,
          error: null
        }
      }
    }

    const next = reducer(state, { type: "moveSelection", tab: "pipelines", delta: 1 })
    expect(next.tabStates.pipelines.selectedIndex).toBe(1)
  })
})
