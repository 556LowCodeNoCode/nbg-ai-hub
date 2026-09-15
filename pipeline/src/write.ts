// write.ts — Emit one markdown file under <newsRoot>/<destination>/.
// `destination` is either "incoming" (editorial review needed) or "published"
// (variant C auto-promote — see DECISIONS 2026-05-19). Throws if the target
// file already exists (slug-collision invariant). See project-design.md §3.11.

import nodeFs from "node:fs/promises";
import path from "node:path";
import type { EmittedItem } from "./types.js";
import { buildFrontmatter, serializeFrontmatter } from "./frontmatter.js";

type FsLike = typeof import("node:fs/promises");

/**
 * Writes <newsRoot>/<destination>/<filename> with frontmatter + body.
 * Body: triage.summary, then a "> Source: [<feedName>](<link>)" line.
 *
 * `destination` controls which subfolder the file lands in:
 *  - `"incoming"` — staged for editorial PR review (default path)
 *  - `"published"` — variant C auto-promote, bypasses review
 *
 * Creates the target folder if missing.
 * Throws if the target file already exists.
 *
 * Returns the absolute path written.
 */
export async function writeNewsItem(
  emitted: EmittedItem,
  newsRoot: string,
  destination: "incoming" | "published",
  fs: FsLike = nodeFs,
): Promise<string> {
  const targetDir = path.join(newsRoot, destination);
  await fs.mkdir(targetDir, { recursive: true });

  const target = path.join(targetDir, emitted.filename);

  // Invariant guard: slug collisions should have been resolved upstream.
  try {
    await fs.access(target);
    throw new Error(
      `writeNewsItem invariant violated: file already exists at ${target}`,
    );
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("writeNewsItem invariant")) {
      throw err;
    }
    // ENOENT / other access errors mean the file does not exist; good.
  }

  const fm = buildFrontmatter(emitted);
  const yaml = serializeFrontmatter(fm);

  const linkLine = emitted.item.link
    ? `> Source: [${emitted.item.feedName}](${emitted.item.link})`
    : `> Source: ${emitted.item.feedName}`;

  const body = `---\n${yaml}---\n\n${emitted.triage.summary}\n\n${linkLine}\n`;

  await fs.writeFile(target, body, "utf8");
  return target;
}
