import { execSync } from "child_process"
import { readFileSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const rootDir = join(__dirname, "..")

// Check if there are any uncommitted changes
try {
  execSync("git diff-index --quiet HEAD --", { stdio: "ignore" })
} catch {
  console.error("❌ Error: You have uncommitted changes. Please commit or stash them first.")
  process.exit(1)
}

// Check if we're on master branch
const currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim()
if (currentBranch !== "master") {
  console.error("❌ Error: You must be on the master branch to release.")
  process.exit(1)
}

// Check if there are any changesets
try {
  const changesetStatus = execSync("bun changeset status", { encoding: "utf8" })
  if (changesetStatus.includes("No changesets present")) {
    console.error("❌ Error: No changesets found. Please create a changeset first using:")
    console.error("  bun changeset")
    process.exit(1)
  }
} catch {
  console.error("❌ Error checking changeset status")
  process.exit(1)
}

console.log("🚀 Starting release process...")

try {
  // 1. Run changeset version
  console.log("📦 Running changeset version...")
  execSync("bun run changeset-version", { stdio: "inherit" })

  // 2. Read new version
  const newPackageJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"))
  const newVersion = newPackageJson.version

  // 3. Commit changes
  console.log("📝 Committing changes...")
  execSync("git add .", { stdio: "inherit" })
  execSync(`git commit -m "v${newVersion}"`, { stdio: "inherit" })

  // 4. Create and push tag
  console.log("🏷️  Creating version tag...")
  execSync(`git tag -a v${newVersion} -m "v${newVersion}"`, { stdio: "inherit" })
  execSync("git push --follow-tags", { stdio: "inherit" })

  // 5. Publish
  console.log("📤 Publishing to npm...")
  execSync("bun run changeset-publish", { stdio: "inherit" })

  console.log(`\n✅ Successfully released v${newVersion}!`)
} catch (error) {
  console.error("❌ Error during release:", error.message)
  process.exit(1)
}
