const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "src", "styles");
const outputDir = path.join(rootDir, "public", "css");
const tailwindCli = path.join(rootDir, "node_modules", "tailwindcss", "lib", "cli.js");

if (!fs.existsSync(sourceDir)) {
  console.error(`Tailwind source directory not found: ${sourceDir}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const sourceFiles = fs
  .readdirSync(sourceDir)
  .filter((fileName) => fileName.endsWith(".tailwind.css"))
  .sort();

if (sourceFiles.length === 0) {
  console.error(`No Tailwind source files found in ${sourceDir}`);
  process.exit(1);
}

for (const sourceFile of sourceFiles) {
  const inputPath = path.join(sourceDir, sourceFile);
  const outputFile = sourceFile.replace(".tailwind.css", ".css");
  const outputPath = path.join(outputDir, outputFile);

  const result = spawnSync(
    process.execPath,
    [
      tailwindCli,
      "-c",
      path.join(rootDir, "tailwind.config.js"),
      "-i",
      inputPath,
      "-o",
      outputPath,
      "--minify"
    ],
    {
      cwd: rootDir,
      stdio: "inherit",
      shell: false
    }
  );

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
