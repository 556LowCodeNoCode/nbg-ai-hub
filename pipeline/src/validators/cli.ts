// validators/cli.ts — GitHub Actions entry point for the skill validator.
//
// Reads `.md` file paths from argv, validates each, emits GitHub Actions
// `::error` annotations on failure. Exit 0 if all valid, 1 if any fail, 2 on
// unexpected error.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMaintainers } from "./config.js";
import { validateSkillFile } from "./skill.js";

async function main(argv: string[]): Promise<number> {
  const files = argv.slice(2);
  if (files.length === 0) {
    console.log("No skill files to validate");
    return 0;
  }

  const configPath = resolve(process.cwd(), "config/maintainers.json");
  const config = await loadMaintainers(configPath);

  let exitCode = 0;
  for (const file of files) {
    const content = await readFile(file, "utf8");
    const result = await validateSkillFile(file, content, config);
    if (!result.ok) {
      exitCode = 1;
      for (const issue of result.issues) {
        // GitHub Actions error annotation. line=1 is fine — frontmatter starts
        // at line 1 and we don't compute precise line numbers.
        console.log(
          `::error file=${issue.file},line=1::${issue.field}: ${issue.message}`,
        );
      }
    } else {
      console.log(`✓ ${file}`);
    }
  }
  return exitCode;
}

// Detect "run as script" (works for both `node cli.js` and `tsx cli.ts`).
const isMain =
  typeof process.argv[1] === "string" &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  main(process.argv)
    .then((code) => process.exit(code))
    .catch((err: unknown) => {
      console.error(err);
      process.exit(2);
    });
}

export { main };
