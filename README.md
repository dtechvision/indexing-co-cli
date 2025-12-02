# Indexing CLI

A CLI tool for interacting with the indexing.co API.

## Installation

```bash
npm install -g @dtechvision/indexingco-cli
```

## Architecture

### Configuration/Setup Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI as Indexing CLI
    participant API as indexing.co API

    Note over User,CLI: Step 1: Configure API Key
    User->>CLI: export API_KEY_INDEXING_CO="your-key"

    Note over User,CLI: Step 2: Create Filter
    User->>CLI: filters create my_filter --values 0xaaa
    CLI->>API: POST /dw/filters/my_filter
    API-->>CLI: ✓ Filter created

    Note over User,CLI: Step 3: Create Transformation
    User->>CLI: transformations create my_transform file.js
    CLI->>API: POST /dw/transformations/my_transform
    API-->>CLI: ✓ Transformation created

    Note over User,CLI: Step 4: Create Pipeline
    User->>CLI: pipelines create --name my_pipeline<br/>--transformation my_transform<br/>--filter my_filter<br/>--networks base_sepolia<br/>--webhook-url https://...
    CLI->>API: POST /dw/pipelines
    API-->>CLI: ✓ Pipeline active
```

### Data Flow

```mermaid
graph LR
    Networks["Blockchain Networks<br/>(base_sepolia, farcaster, etc)"]
    Pipeline["Pipeline<br/>(monitors networks)"]
    Filter["Filter<br/>(match criteria)"]
    Transform["Transformation<br/>(process data)"]
    HTTP["HTTP Delivery<br/>(webhook)"]
    Dest["Destination<br/>(database/API)"]

    Networks -->|network data| Pipeline
    Pipeline -->|events| Filter
    Filter -->|matched data| Transform
    Transform -->|transformed data| HTTP
    HTTP -->|POST JSON| Dest
```

## Usage

### Environment Variable

Set the API key as an environment variable:

```bash
export API_KEY_INDEXING_CO="your-api-key-here"
indexingco-cli pipelines
```

### CLI Argument

Pass the API key as a command line argument:

```bash
indexingco-cli pipelines --api-key "your-api-key-here"
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

### Help

```bash
indexingco-cli --help
indexingco-cli pipelines --help
```
