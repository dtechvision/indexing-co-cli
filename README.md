# Indexing CLI

A CLI tool for interacting with the indexing.co API.

## Installation

```bash
npm install
npm run build
```

## Usage

### Environment Variable

Set the API key as an environment variable:

```bash
export INDEXING_API_KEY="your-api-key-here"
bun src/bin.ts pipelines
```

### CLI Argument

Pass the API key as a command line argument:

```bash
bun src/bin.ts pipelines --api-key "your-api-key-here"
```

### Available Commands

- `hello` - Simple hello world command
- `pipelines` - Fetch all pipelines from indexing.co API

### Help

```bash
bun src/bin.ts --help
bun src/bin.ts pipelines --help
```
