# CLAUDE.md

This file provides guidance for Claude Code when working on this project.

## Build Commands

- `bun run build` - Build the CLI
- `bun run lint:tsc` - Type-check with TypeScript
- `bun ./node_modules/.bin/vitest run` - Run all tests
- `bun ./node_modules/.bin/vitest run test/cli-usability.test.ts` - Run CLI usability tests

## Architecture Notes

### CLI Argument Validation (`src/lib/argGuards.ts`)

This file contains pure helper functions for validating CLI arguments and providing helpful error messages.

**Important:** The `optionsWithValues` array lists all options that take a value argument. This is used to correctly skip option values when detecting positional arguments.

When adding new command options:
1. **Options with values** (e.g., `--network base_sepolia`): Add to `optionsWithValues` array
2. **Boolean options** (e.g., `--all`, `--verbose`): Do NOT add to the array
3. Add tests in `test/cli-usability.test.ts` for any new validation behavior

If you forget to add a value-taking option to `optionsWithValues`, users may see a false "options after positionals" warning when using that option.

### Command Structure

Commands are defined in `src/commands/`:
- `pipelines.ts` - Pipeline CRUD and testing
- `filters.ts` - Filter CRUD operations
- `transformations.ts` - Transformation CRUD and testing
- `hello.ts` - Simple hello world command

Each command uses Effect's `@effect/cli` for parsing and `@effect/platform` for HTTP requests.
