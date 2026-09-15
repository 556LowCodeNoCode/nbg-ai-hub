// pr.ts — PR body builder, step-output writer, and (test-only) gh CLI helper.
// See project-design.md §3.12.

import nodeFs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { EmittedItem } from "./types.js";

type FsLike = typeof import("node:fs/promises");

export const DEFAULT_BASE_BRANCH = "main";
export const BRANCH_PREFIX = "news-triage/";

const execFileAsync = promisify(execFile);

/**
 * Builds the markdown body of the editorial PR. Two top-level sections,
 * each only rendered when non-empty:
 *  - "Auto-promoted" — items already written to `news/published/` (variant C,
 *    DECISIONS 2026-05-19). Listed FYI; the PR does not gate them.
 *  - "For review" — items in `news/incoming/` awaiting editorial verdict.
 *
 * Within each section, items are grouped by source (feed name), sorted
 * alphabetically. Each bullet shows: title, confidence, source, external_link,
 * ai_summary. Pure.
 */
export function buildPrBody(
  autoPromoted: EmittedItem[],
  reviewNeeded: EmittedItem[],
  runDateUtc: string,
): string {
  const lines: string[] = [];
  const autoN = autoPromoted.length;
  const reviewN = reviewNeeded.length;

  lines.push(`# News triage ${runDateUtc}`);
  lines.push("");
  if (autoN > 0) {
    lines.push(
      `${autoN} auto-promoted to \`news/published/\` (high confidence, professional source — no review needed).`,
    );
  }
  if (reviewN > 0) {
    lines.push(
      `${reviewN} item${reviewN === 1 ? "" : "s"} in \`news/incoming/\` for editorial review.`,
    );
  }
  lines.push("");

  if (autoN > 0) {
    lines.push(`## Auto-promoted (n=${autoN})`);
    lines.push("");
    appendGroupedBySource(lines, autoPromoted);
  }

  if (reviewN > 0) {
    lines.push(`## For review (n=${reviewN})`);
    lines.push("");
    appendGroupedBySource(lines, reviewNeeded);
  }

  return lines.join("\n");
}

function appendGroupedBySource(lines: string[], items: EmittedItem[]): void {
  const bySource = new Map<string, EmittedItem[]>();
  for (const item of items) {
    const key = item.item.feedName;
    const arr = bySource.get(key) ?? [];
    arr.push(item);
    bySource.set(key, arr);
  }

  const sortedSources = [...bySource.keys()].sort((a, b) => a.localeCompare(b));
  for (const source of sortedSources) {
    lines.push(`### ${source}`);
    lines.push("");
    const group = bySource.get(source) ?? [];
    for (const emitted of group) {
      const linkPart = emitted.item.link
        ? ` — [${emitted.item.link}](${emitted.item.link})`
        : "";
      const confidence = emitted.triage.editor_confidence;
      lines.push(
        `- **${emitted.item.title}** [confidence: ${confidence}] (source: ${emitted.item.feedName})${linkPart}`,
      );
      lines.push(`  - ${emitted.triage.summary}`);
    }
    lines.push("");
  }
}

/**
 * Writes the PR body to <pipelineDir>/pr-body.md.
 * Returns the absolute path written.
 */
export async function writePrBodyFile(
  body: string,
  pipelineDir: string,
  fs: FsLike = nodeFs,
): Promise<string> {
  const target = path.join(pipelineDir, "pr-body.md");
  await fs.mkdir(pipelineDir, { recursive: true });
  await fs.writeFile(target, body, "utf8");
  return target;
}

/**
 * Appends `<name>=<value>\n` to $GITHUB_OUTPUT (if set), else logs the
 * "legacy" set-output line to stdout. Never throws on missing env.
 */
export async function setStepOutput(
  name: string,
  value: string,
  env: NodeJS.ProcessEnv = process.env,
  fs: FsLike = nodeFs,
): Promise<void> {
  const target = env["GITHUB_OUTPUT"];
  const line = `${name}=${value}\n`;
  if (typeof target === "string" && target.length > 0) {
    await fs.appendFile(target, line, "utf8");
    return;
  }
  process.stdout.write(`::set-output (legacy)::${name}=${value}\n`);
}

type ExecFn = (
  cmd: string,
  args: string[],
  opts: { cwd: string },
) => Promise<{ stdout: string; stderr: string }>;

const defaultExec: ExecFn = async (cmd, args, opts) => {
  const result = await execFileAsync(cmd, args, opts);
  return { stdout: String(result.stdout ?? ""), stderr: String(result.stderr ?? "") };
};

/**
 * Test-only helper. Production path is the workflow YAML's inline shell.
 * Asserts the gh pr create call shape including R-7 (cwd = GITHUB_WORKSPACE).
 */
export async function createPullRequest(args: {
  branch: string;
  title: string;
  bodyFilePath: string;
  baseBranch?: string;
  exec?: ExecFn;
  env?: NodeJS.ProcessEnv;
}): Promise<{ prUrl: string }> {
  const base = args.baseBranch ?? DEFAULT_BASE_BRANCH;
  const exec = args.exec ?? defaultExec;
  const env = args.env ?? process.env;
  const cwd = env["GITHUB_WORKSPACE"] ?? process.cwd();

  const { stdout } = await exec(
    "gh",
    [
      "pr",
      "create",
      "--base",
      base,
      "--head",
      args.branch,
      "--title",
      args.title,
      "--body-file",
      args.bodyFilePath,
    ],
    { cwd },
  );

  return { prUrl: stdout.trim() };
}
