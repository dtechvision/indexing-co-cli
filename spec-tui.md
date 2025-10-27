# Indexingco CLI TUI Specification

## 1. Purpose & Context
- **Objective:** Add a polished terminal UI (`indexingco --tui`) that surfaces the same operational data our CLI already fetches (pipelines, filters, transformations) with rich navigation, live updates, and interactive actions—mirroring the ergonomics of tools like k9s.
- **Why now:** Operators are struggling with static JSON output, especially when monitoring multiple resources at once. A TUI should reduce cognitive load, speed up troubleshooting, and showcase the platform better during demos.
- **Success snapshot:** A teammate can launch `indexingco tui`, authenticate with an API key, browse resources, trigger common actions, and keep the dashboard open for live monitoring without touching the raw REST API or manual refresh loops.

## 2. Goals & Non-Goals
- **Goals**
  - Provide a curses-style dashboard featuring pipelines, filters, transformations, and request logs with near real-time polling.
  - Reuse existing HTTP logic via a shared service layer to avoid duplication and respect current effect patterns.
  - Offer actionable shortcuts (backfill/test/delete/etc.) from the UI with clear confirmation and feedback.
  - Keep the experience accessible (keyboard-only), resilient (error surfaces without crashing), and themable.
- **Non-Goals**
  - No initial support for arbitrary new resources (e.g., datasets, metrics) unless trivial to expose.
  - No requirement to embed a full terminal shell inside the TUI.
  - No expectation of offline usage or caching beyond in-memory state.

## 3. Stakeholders & Handoff
- **Dev owner:** Engineer assigned to implement the TUI (recipient of this spec).
- **Reviewers:** CLI maintainers + DX advocate.
- **Consumers:** Internal operations team first, then external beta users.
- **Supporting artifacts:** Update `README.md`, add demo GIFs/screenshots, and create a walk-through doc for support staff.

## 4. User Experience Requirements
### 4.1 Launch & Shutdown
- Entry point: `indexingco tui` (alias `indexingco --tui` accepted).
- Accept options:
  - `--api-key` (overrides env)
  - `--refresh <seconds>` (default 5)
  - `--theme <dark|light|mono>` (optional)
  - `--log-level <info|debug>` (optional)
- Show a meaningful error if the API key is missing or rejected, but leave the TUI running with a retry prompt, keeping logs accessible.
- Graceful exit via `q`, `ctrl+c`, or menu item.

### 4.2 Layout
- **Header/top bar:** Product name, environment indicator, API key status (redacted), refresh countdown, last updated timestamp, total resource counts (mirrors k9s summary strip).
- **Sidebar list:** Tabs for `Pipelines`, `Filters`, `Transformations`, `Activity Log`, plus future placeholders (dimmed) to telegraph expansion. Selected tab highlighted with bold accent similar to k9s’ nav column.
- **Main content area:** Table/grid showing the selected resource, supporting pagination, focused-row interactions, and inline status badges (e.g., pipeline running/paused).
- **Details pane (toggleable):** Displays JSON or formatted data for the selected entry; support split-view layout (`detail` on right) and pop-out modal (full height) like k9s’ detail drill-down.
- **Command bar:** Hidden by default; appears at bottom when the user presses `:` to enter vim-style commands (e.g., `:refresh`, `:filter pipelines status=active`).
- **Footer:** Keybindings cheat sheet (e.g., `r` refresh, `enter` inspect, `b` backfill, `t` test, `d` delete, `?` help) and mode indicator (`NORMAL`, `SEARCH`, `COMMAND`) inspired by k9s.

### 4.3 Navigation & Interaction
- Keyboard-first: arrow keys / `hjkl` navigate lists; `gg` jumps to top, `G` to bottom, `ctrl+f`/`ctrl+b` page down/up. `tab` cycles focus between sidebar/content/details, while `shift+tab` cycles backwards.
- `enter` opens a detail modal (overlay) with scrollable JSON; `esc` closes and returns focus to the calling pane.
- Resource-specific actions (pipeline backfill/test/delete, transformation test/commit, filter create/remove) exposed via single-key shortcuts with confirm dialog. When an action is available, display k9s-style hints in the status bar (`[b] Backfill`).
- Search/filter flow mimics k9s: pressing `/` enters inline search mode for the active table; highlights matching rows as the user types; `n`/`N` jump to next/previous match. Pressing `:` opens the command bar for advanced commands (e.g., `:set refresh 10`, `:view pipelines failed`).
- Allow labeling/bookmarking: `m` + letter marks a resource (bookmark), `'` + letter jumps to it (small subset of k9s marks feature).
- Helper overlays:
  - `?` opens keybinding reference.
  - `s` cycles sort columns (same as pressing `:` then issuing a `sort` command).
  - `g` followed by resource letter (`p`, `f`, `t`, `a`) jumps to the matching tab (mirrors k9s multi-level `g` navigation).
  - `d` toggles detail pane; `v` toggles between table view and raw JSON view.
- Persist latest selection & UI state while background refresh occurs, preserving search/filter context after each poll.

### 4.6 K9s-Inspired Patterns
- **Mode indicator:** Always show which mode the user is in (`NORMAL`, `SEARCH`, `COMMAND`, `INSERT` for modals) so muscle memory aligns with vim/k9s habits.
- **Command palette syntax:** Support a core set of colon commands:
  - `:help` (same as `?`)
  - `:set refresh <seconds>` (updates polling cadence)
  - `:set theme <name>`
  - `:filter <resource> <field>=<value>` (applies multi-field filters; display active filters beneath header)
  - `:view <resource> [status]` (switch view)
  - `:logs` (focus activity log pane)
  - Future-proof to add `:exec`, `:describe`, etc.
- **Resource drill-down:** Pressing `l` or `enter` on a pipeline transitions into a nested view showing beats, webhook deliveries, etc., with breadcrumb indicator (`Pipelines › MyPipeline`). `h` goes back up—matching k9s’ tree navigation.
- **Split-pane resizing:** `shift+→/←` adjusts sidebar width; `shift+↑/↓` adjusts detail pane height, similar to k9s’ layout controls.
- **Visual cues:** Use subtle box borders and highlighted headers reminiscent of k9s; support dynamic row coloring (e.g., failing pipelines in red, healthy in green) while also providing text labels for accessibility.

### 4.4 Feedback & Errors
- Show spinner/status text during initial fetch.
- On fetch failure: highlight status bar in red, show toast with error message, keep old data visible, and auto-retry with exponential backoff up to a limit.
- For action failures (e.g., backfill rejected) present modal with error info and suggestion to check logs.
- Maintain an activity log stream listing all executed actions + outcomes with timestamps.
- Provide subtle success confirmation (status bar flash + toast) for successful actions.

### 4.5 Accessibility & Theming
- Support colorblind-friendly palette (avoid red/green only). Provide at least three theme options (dark, light, monochrome) selected via CLI option and settable in-session.
- Respect terminal resize events (`screen.on("resize")`) to reflow layout.
- Use textual cues alongside color for critical states.
- Keep ASCII-only unless we already rely on extended characters; optional to display simple icons (`▶`, `✓`) if the chosen font supports them.

## 5. Functional Requirements
- **Resource Fetching**
  - Pipelines: list, detail per pipeline, status, last run, networks, associated filter/transformation.
  - Filters: list names, counts, preview values.
  - Transformations: list names, last updated, allow content preview on demand (lazy fetch to avoid huge payloads).
- **Action Hooks**
  - Pipelines: trigger backfill (with parameters), trigger test (prompt for network + beat/hash), delete pipeline.
  - Filters: create/remove values (prompt file or inline? decision below).
  - Transformations: run test (with file path prompt or support pulling cached transform?).
  - Each action should reuse CLI’s HTTP calls and respect API key handling.
- **Polling**
  - Default 5s interval; user-configurable between 2–60s.
  - Pause polling while an action modal is open; resume after completion.
  - Manual refresh with `r` resets timer.
- **Configuration**
  - Reuse CLI `Config` module to read env or config file if we extend later.
  - Consider storing TUI preferences (theme, refresh) in a `~/.indexingco-cli.json` file (optional stretch goal; confirm with PM).

## 6. Architecture & Implementation Plans
- `src/tui/components/*`: Small composable components (Header, Sidebar, TableView, DetailModal, Toasts, ActivityLog, CommandPalette, ModeIndicator).
- `src/tui/hooks/*`: Custom hooks for polling, keybindings, service integration (`useResource`, `useHotkeys`, `useCommandBar`).

### 6.2 CLI Integration
- Update `src/Cli.ts` to register `tui` command and optional `--tui` global flag. The command should call `launchTui` inside an `Effect.gen`, failing gracefully if the terminal isn’t interactive.
- Adjust `src/bin.ts` run pipeline to support a long-lived Ink render loop (`NodeRuntime.runMain` should remain, but ensure Ink handles cleanup).
- Provide helpful messaging when Ink fails to render (e.g., running in non-TTY environment).

### 6.3 State Management
- Favor `Effect.Ref` or React context providers bridging to Ink components for global state (API key, polling cadence, error queue).
- `useResource` hook:
  - Accepts fetch effect, refresh interval, and dependencies.
  - Returns `{ data, isLoading, error, refresh, lastUpdated }`.
  - Implements backoff and cancellation on unmount using `Effect.Scope`.
- Use `Effect.Runtime` to execute effects inside React hooks (`Effect.runPromise` or `Runtime.runPromise`).

### 6.4 Data Modeling
- Define TypeScript interfaces for pipelines, filters, transformations to ensure consistent shape across CLI commands and TUI.
- Map API responses to typed structures; guard for missing or extra fields with runtime validation via `effect/Schema` if needed (stretch).
- Provide formatting helpers (e.g., format last run timestamp, shorten IDs).

### 6.5 Logging & Telemetry
- Reuse existing logging infrastructure if any; otherwise, maintain an in-app log list plus optional `DEBUG=*` support via environment variable to dump raw API responses to stderr.
- Ensure logs do not leak full API keys (redact).

### 6.6 Theming
- Create a `ThemeContext` with tokens for colors, backgrounds, accent styles. Provide at least dark/light/mono defaults.
- Hook theme selection into CLI option and allow runtime switching with `shift+t`.

### 6.7 Error Handling
- All service calls should return discriminated unions (`{ _tag: "Success"; data } | { _tag: "Failure"; error }`) to make UI handling explicit.
- Centralize 401/403 detection to prompt for API key re-entry without tearing down the app.
- Handle network timeouts with a visible warning and exponential retry (initial 5s, max 60s).

## 7. Tasks & Workstreams
### 7.1 Foundations
- [ ] Audit existing CLI commands to catalog required API calls and responses.
- [ ] Create `src/services/indexingCo.ts` and migrate shared logic (`getApiKey`, HTTP client configuration) from `pipelines.ts`, `filters.ts`, `transformations.ts`.
- [ ] Update commands to consume the new service module (regression test existing CLI flows).

### 7.2 CLI Interface Updates
- [ ] Add `tui` command to `src/Cli.ts` and expose options (`--api-key`, `--refresh`, etc.).
- [ ] Wire `launchTui` into CLI runtime; ensure `indexingco --help` reflects new command.
- [ ] Add integration test covering invocation failure when no TTY is available.

### 7.3 TUI Implementation
- [ ] Install dependencies: `ink`, `react`, `ink-select-input`, `ink-table` (or custom), `ink-spinner`, `chalk` (if not already).
- [ ] Configure TypeScript/tsup for JSX (update `tsconfig.src.json`, `tsup.config.ts` to include `src/tui/*.tsx`).
- [ ] Build root App with layout scaffolding, theme context, and mode indicator.
- [ ] Implement sidebar navigation component with keybindings.
- [ ] Implement resource table component capable of row focus, sorting, and virtualization if needed.
- [ ] Build detail pane/modal, toast notification system, and activity log components.
- [ ] Implement hooks: `usePollingResource`, `useKeymap`, `useCommandBar`, `useToasts`.
- [ ] Build command palette (`:`) with autocompletion suggestions for supported commands; display errors inline.
- [ ] Implement search mode (`/`) with incremental highlight, `n`/`N` navigation, and ability to clear search with `esc`.
- [ ] Implement bookmarking marks (`m`/`'`) and persistent selection memory.
- [ ] Support nested drill-down views with breadcrumb navigation (`h`/`l`).
- [ ] Connect pipelines view to data service; add quick actions and modals for backfill/test/delete.
- [ ] Connect filters & transformations views, including prompts for additional parameters.
- [ ] Implement activity log feed capturing all API interactions.
- [ ] Support runtime theme toggling and refresh interval adjustments.

### 7.4 Testing & Quality
- [ ] Add Vitest unit tests for new service functions (mock HTTP client).
- [ ] Add tests for hooks (`usePollingResource`, `useCommandBar`) using `ink-testing-library`.
- [ ] Add interaction tests verifying vim-style navigation (`gg`, `G`, `/` search, `:` commands) using `ink-testing-library`.
- [ ] Provide snapshot tests for key components (Header, Table, Sidebar) with representative data.
- [ ] Manual QA checklist (documented in README or QA.md) includes verifying all keybindings match spec (mirroring k9s defaults).
- [ ] Verify TUI functions correctly on macOS Terminal, iTerm2, and at least one Linux terminal (tmux included).

### 7.5 Documentation & Delivery
- [ ] Update `README.md` with TUI section (install, usage, keybindings, screenshots/GIF).
- [ ] Add changelog entry summarizing feature and breaking changes (if any).
- [ ] Record short loom or GIF demonstrating primary workflow.
- [ ] Provide internal doc (Notion/Confluence) summarizing deployment steps and tips.
- [ ] Ensure bundling (`tsup`) includes TUI assets; run `bun run build` to verify.

## 8. Acceptance Criteria
- Vim-style navigation commands (`hjkl`, `gg`, `G`, `/`, `:`) operate as documented.
- Command palette supports at least the initial set of commands (`:help`, `:set`, `:filter`, `:view`, `:logs`).
- Running `indexingco tui` launches the dashboard, displays data within 5 seconds, and keeps refreshing without manual intervention.
- Keyboard shortcuts documented in the footer all work as stated.
- Performing pipeline actions from the TUI yields the same API behavior as current CLI commands, with success/failure feedback.
- CLI commands outside the TUI still function (no regressions).
- Automated tests covering services + hooks pass in CI; manual QA checklist signed off.
- README and changelog entries merged and accurate.

## 9. Risks & Mitigations
- **Ink rendering quirks or perf issues:** Mitigate by testing early across terminals, limiting heavy re-renders, and using memoization.
- **API schema drift:** Centralize service layer and add lightweight schema guards to catch breaking changes fast.
- **Long-running effects leaking:** Use `Effect.Scope` to manage polling subscriptions; ensure cleanup on exit.
- **User confusion over API key handling:** Provide clear prompts and docs; consider inline redacted display with `press k to re-enter key`.
- **Dependency bloat:** Keep TUI dependencies minimal, evaluate alternatives (custom widgets) before adding packages.
- **Non-TTY environments (CI, pipes):** Detect via `process.stdout.isTTY`; fall back to error message and exit with non-zero status.

## 10. Watch Outs & Guidance
- Provide discoverability for vim-style shortcuts (e.g., display `[Mode: NORMAL]` and show hints when users hold `:` or `/`).
- Keybinding conflicts: ensure new shortcuts do not collide with input forms; temporarily disable global shortcuts while in modals/command palette.
- Keep code comments minimal but add clarifying notes around complex Effect/Ink interoperability.
- Maintain strict TypeScript types; avoid `any`.
- Ensure the service refactor does not silently swallow errors—log and rethrow.
- Avoid blocking UI threads with synchronous JSON stringify of large payloads; paginate or truncate where necessary.
- When prompting for user input (e.g., pipeline test hash), ensure focus handling is intuitive and state resets after submission/cancel.
- Consider resilience for slow APIs: surface countdown/backoff info to avoid panic.
- Build with ASCII fallback; confirm the UI remains readable for users with fonts lacking box-drawing characters.
- Post-merge, coordinate release timing and announcement with product marketing (k9s angle).

## 11. Deliverables Checklist
- [ ] `spec-tui.md` (this document) committed.
- [ ] Refactored service layer with tests.
- [ ] New TUI modules (`src/tui/*`) with Ink implementation.
- [ ] Updated CLI wiring.
- [ ] Automated tests (services, hooks, snapshots) green.
- [ ] Documentation updates (README, CHANGELOG, demo media).
- [ ] QA notes and sign-off.

## 12. Follow-Up & Stretch Ideas
- Integrate websocket or SSE endpoints for real-time updates if available.
- Allow editing pipeline definitions directly in the TUI via embedded editor.
- Export selected resource as JSON via hotkey.
- Multi-account/API key support with quick switching.
- Telemetry opt-in to track usage patterns (with privacy review).

Once these requirements are met, the feature should be ready for peer review and packaging into the next CLI release.
