# Indexing CLI

A CLI tool for interacting with the indexing.co API.

## Installation

```bash
npm install -g @dtechvision/indexingco-cli
```

## Usage

### Environment Variable

Set the API key as an environment variable:

```bash
export INDEXING_API_KEY="your-api-key-here"
indexingco pipelines
```

### CLI Argument

Pass the API key as a command line argument:

```bash
indexingco pipelines --api-key "your-api-key-here"
```

### Available Commands

- `hello` - Simple hello world command
- `pipelines` - Manage pipelines with subcommands:
  - `list` - List all pipelines
  - `create` - Create a new pipeline
  - `backfill` - Backfill a pipeline
  - `delete` - Delete a pipeline
- `filters` - Manage filters with subcommands:
  - `list` - List all filters
  - `create` - Create a new filter
  - `remove` - Remove values from a filter
- `transformations` - Manage transformations with subcommands:
  - `list` - List all transformations
  - `test` - Test a transformation
  - `create` - Create/commit a transformation

### Terminal UI

Launch the k9s-inspired terminal dashboard with:

```bash
indexingco tui --api-key "your-api-key-here"
```

Key highlights:

- Vim-style navigation (`hjkl`, `gg`, `G`, `/`, `:`)
- Sidebar quick-jump (`gp`, `gf`, `gt`, `ga`)
- Search with live highlighting (`/`, `n`, `N`)
- Command palette for runtime tweaks (`:set refresh 10`, `:set theme light`)
- Pipeline actions (`b` backfill, `t` test, `D` delete) with inline confirmation
- Bookmarking (`m` + letter, `'` + letter) and persistent selection across refreshes
- Split details pane toggle (`d`) and modal drill-down (`enter`)
- Activity log capturing every API interaction

Use `K` inside the TUI to re-enter an API key and `?` to display the full keybinding reference.

#### Keymap & Commands

**Modes & Global Keys**

- `hjkl` / arrow keys – move selection in the focused pane
- `tab` / `shift+tab` – cycle focus between sidebar → table → details
- `gg`, `G` – jump to table top / bottom
- `/` – enter search mode (type inline; `esc` clears, `enter` returns to normal)
- `:` – open the command bar (vim-style palette)
- `n` / `N` – next / previous search match
- `?` – show the keybinding overlay
- `K` – prompt to re-enter the API key
- `d` – toggle the detail pane (hidden ↔ split)
- `enter` – open the modal detail overlay for the selected row
- `v` – toggle table view ↔ raw JSON
- `m` + letter – bookmark current row; `'` + letter jumps to bookmark
- `gp`, `gf`, `gt`, `ga` – jump to Pipelines / Filters / Transformations / Activity tabs
- `r` – force immediate refresh (resets countdown)
- `q` / `ctrl+c` – quit the TUI

**Command Bar (press `:` first)**

- `:refresh` – refresh immediately (same as `r`)
- `:set refresh <seconds>` – adjust polling interval
- `:set theme <dark|light|mono>` – switch themes on the fly
- `:set log-level <info|debug>` – toggle logging verbosity
- `:set api-key <value>` – swap API credentials without exiting
- `:filter <pipelines|filters|transformations> <text>` – apply table filter (works like `/`)
- `:view <pipelines|filters|transformations|activity>` – jump tabs
- `:logs` – shortcut for `:view activity`
- `:help` – show keybinding overlay
- `:quit` / `:q` – exit the TUI

**Pipeline-Specific Hotkeys** (table focused)

- `b` – backfill (prompts for network, then value)
- `t` – test (prompts for network, then beat/hash)
- `D` – delete after typing `yes` to confirm

### Help

```bash
indexingco --help
indexingco pipelines --help
```
