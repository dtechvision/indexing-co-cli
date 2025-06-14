import * as Command from "@effect/cli/Command"
import { filtersCommand, helloCommand, pipelinesCommand, transformationsCommand } from "./commands/index.js"

// Main CLI with subcommands
const cli = Command.make("indexing-cli").pipe(
  Command.withSubcommands([helloCommand, pipelinesCommand, filtersCommand, transformationsCommand])
)

export const run = Command.run(cli, {
  name: "Indexing CLI",
  version: "v1.0.0"
})
