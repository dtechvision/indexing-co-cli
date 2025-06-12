import * as Command from "@effect/cli/Command"
import { helloCommand, pipelinesCommand } from "./commands/index.js"

// Main CLI with subcommands
const cli = Command.make("indexing-cli").pipe(
  Command.withSubcommands([helloCommand, pipelinesCommand])
)

export const run = Command.run(cli, {
  name: "Indexing CLI",
  version: "v1.0.0"
})
