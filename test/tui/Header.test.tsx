import React from "react"
import { describe, expect, it } from "vitest"
import { render } from "ink-testing-library"
import Header from "../../src/tui/components/Header.js"

describe("Header", () => {
  it("renders resource counts and API mask", () => {
    const { lastFrame } = render(
      <Header
        activeTab="pipelines"
        apiKeyMasked="abcd…ef"
        counts={{ pipelines: 3, filters: 1, transformations: 2, activity: 5 }}
        environmentLabel="Production"
        logLevel="info"
        refreshCountdown={3}
        refreshInterval={5}
        themeName="dark"
        lastUpdated={Date.now()}
      />
    )

    expect(lastFrame()).toContain("abcd…ef")
    expect(lastFrame()).toContain("Pipelines")
    expect(lastFrame()).toContain("3")
  })
})
