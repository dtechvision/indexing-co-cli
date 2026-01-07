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

// Options that take a value (used to skip the value when detecting positional args).
// Boolean options like --all, --include-timestamps are intentionally omitted.
// Keep this list in sync when adding new options to commands.
const optionsWithValues = [
  // Global
  "--api-key",
  // pipelines create
  "--transformation",
  "--filter",
  "--filter-keys",
  "--networks",
  "--webhook-url",
  "--auth-header",
  "--auth-value",
  // pipelines backfill
  "--network",
  "--value",
  "--beat-start",
  "--beat-end",
  "--beats",
  // pipelines test / transformations test
  "--beat",
  "--hash",
  // filters
  "--values",
  "--page-token",
  "--prefix"
]

const matchesOptionWithValue = (arg: string): string | undefined =>
  optionsWithValues.find((opt) => arg === opt || arg.startsWith(`${opt}=`))

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
  let lastPositionalCandidate: string | undefined

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const optionMatch = matchesOptionWithValue(arg)
    if (optionMatch !== undefined) {
      if (!arg.includes("=") && argv[i + 1] !== undefined && !argv[i + 1].startsWith("-")) {
        i += 1
      }
      continue
    }
    if (arg.startsWith("-")) continue
    if (knownSubcommands.has(arg)) continue
    lastPositionalCandidate = arg
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const optionMatch = matchesOptionWithValue(arg)
    if (optionMatch !== undefined) {
      // Skip the next token if the option uses a separated value (e.g., --network base_sepolia)
      if (!arg.includes("=") && argv[i + 1] !== undefined && !argv[i + 1].startsWith("-")) {
        i += 1
      }
      continue
    }
    if (arg.startsWith("-")) {
      // For unknown options, skip potential values unless it looks like the final positional.
      if (
        !arg.includes("=") &&
        argv[i + 1] !== undefined &&
        !argv[i + 1].startsWith("-") &&
        !knownSubcommands.has(argv[i + 1]) &&
        argv[i + 1] !== lastPositionalCandidate
      ) {
        i += 1
      }
      continue
    }
    if (knownSubcommands.has(arg)) continue
    firstPositionalIdx = i
    firstPositionalArg = arg
    break
  }

  if (firstPositionalIdx === -1) return undefined

  for (let j = firstPositionalIdx + 1; j < argv.length; j++) {
    const laterArg = argv[j]
    const optionMatch = matchesOptionWithValue(laterArg)
    if (optionMatch !== undefined) {
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
