import * as Command from "@effect/cli/Command"
import * as Console from "effect/Console"

// Hello command
export const helloCommand = Command.make("hello", {}, () => Console.log("Hello World!"))
