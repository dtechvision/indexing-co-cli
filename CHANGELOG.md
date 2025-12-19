# @dtechvision/indexingco-cli

## 0.0.6

### Patch Changes

- Add forgiving aliases for destructive commands (`filters delete|rm`, `pipelines delete|remove|rm`) and extracted arg-guard helpers that emit typo/order hints before parsing.
- Expanded test coverage for aliases, pipeline test validation (beat/hash), and argument-order/top-level hints; Vitest now excludes `worktree/**`.
- Keep bin aliases in the published package and align README with the `indexingco` binary name.

## 0.0.5

### Patch Changes

- Centralize API key handling in `config.ts` and share a ConfigProvider so all commands consistently read `API_KEY_INDEXINGCO`/`--api-key`.
- Add a `CLI_DEV` toggle via Effect Config to enable verbose error reporting; keep defaults quiet for normal use.
- Improve filter commands: require values for delete to match the API, restore proper error surfacing for create/remove, and fix the `Option` import crash in `getApiKey`.
- Add argument-order validation and better HTTP error handling so misordered `--api-key` or API failures emit actionable messages.
- Add forgiving aliases for destructive commands (`filters delete|rm`, `pipelines rm|remove`) and pure arg-guard helpers that emit “did you mean”/ordering hints; expanded tests cover aliases, validation, and URL building.

## 0.0.4

### Patch Changes

- [`04b9bb8`](https://github.com/dtechvision/indexing-co-cli/commit/04b9bb8ba27d0d69dacf061a0d3db056921b16f4) Thanks [@SamuelLHuber](https://github.com/SamuelLHuber)! - - add guidance for fetching transformation source when listing transformations

  - fix pipeline creation by ensuring JSON payload is correct and surfacing API errors
  - add a `transformations show` command so the CLI can fetch transformation sources directly

- [#2](https://github.com/dtechvision/indexing-co-cli/pull/2) [`1ac6e30`](https://github.com/dtechvision/indexing-co-cli/commit/1ac6e30bee38dca3332c77df21394ba470019a17) Thanks [@SamuelLHuber](https://github.com/SamuelLHuber)! - chores: bugfixes

## 0.0.3

### Patch Changes

- update cli command in help to be correct as well as the version string

## 0.0.2

### Patch Changes

- fix: transformations create and test code being sent as text instead of json
