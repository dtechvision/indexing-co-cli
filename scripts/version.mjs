import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const rootDir = join(__dirname, "..")

// Read the version from package.json
const packageJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"))
const version = packageJson.version

// Read and update src/Cli.ts
const cliPath = join(rootDir, "src", "Cli.ts")
let cliContent = readFileSync(cliPath, "utf8")

// Update the version in Cli.ts
cliContent = cliContent.replace(
  /version:\s*"[^"]*"/,
  `version: "${version}"`
)

// Write the updated content back
writeFileSync(cliPath, cliContent)

console.log(`Updated version to ${version} in src/Cli.ts`)
