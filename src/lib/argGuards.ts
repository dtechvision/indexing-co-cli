// Helpers to validate CLI arguments for usability. Pure functions to enable testing.

const knownTopLevel = ["pipelines", "filters", "transformations", "hello"]
const knownSubcommands = new Set([
  "pipelines",
  "filters",
  "transformations",
  "hello",
  "list",
  "create",
  "delete",
  "remove",
  "backfill",
  "test",
  "rm"
])

const optionPatterns = ["--api-key", "--network", "--beat", "--hash"]

export const validateTopLevelCommand = (argv: Array<string>): string | undefined => {
  const firstNonOption = argv.find((arg) => !arg.startsWith("-"))
  if (firstNonOption !== undefined && !knownTopLevel.includes(firstNonOption)) {
    const suggestion = knownTopLevel.find((cmd) => cmd.startsWith(firstNonOption))
    return suggestion !== undefined
      ? `Unknown command '${firstNonOption}'. Did you mean '${suggestion}'?`
      : `Unknown command '${firstNonOption}'. Available: ${knownTopLevel.join(", ")}`
  }
  return undefined
}

export const validateArgumentOrder = (argv: Array<string>): string | undefined => {
  // Find the first true positional argument (not a subcommand, not an option)
  let firstPositionalIdx = -1
  let firstPositionalArg = ""

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith("-")) continue
    if (knownSubcommands.has(arg)) continue
    firstPositionalIdx = i
    firstPositionalArg = arg
    break
  }

  if (firstPositionalIdx === -1) return undefined

  for (let j = firstPositionalIdx + 1; j < argv.length; j++) {
    const laterArg = argv[j]
    if (optionPatterns.some((opt) => laterArg === opt || laterArg.startsWith(`${opt}=`))) {
      return [
        `Option '${laterArg}' must come before positional arguments.`,
        "",
        `Incorrect: ... ${firstPositionalArg} ${laterArg} ...`,
        `Correct:   ... ${laterArg} <value> ${firstPositionalArg}`,
        "",
        "Tip: You can also set the API_KEY_INDEXINGCO environment variable to avoid passing --api-key."
      ].join("\n")
    }

    if (laterArg.startsWith("-")) {
      return [
        "Hint: Options must come before positional args for this CLI.",
        "Example: indexingco pipelines test --network base_sepolia --beat 123 my_pipeline"
      ].join("\n")
    }
  }

  return undefined
}
