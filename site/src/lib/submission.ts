// site/src/lib/submission.ts
//
// Submission helper for the skills-catalog "submit a skill" flow. Pure
// functions with two well-isolated side effects: `copyToClipboard`
// (navigator.clipboard) and `checkSlugCollision` (fetch to api.github.com,
// unauthenticated — collision check is opportunistic, never blocks the user).
//
// Pipeline:
//   form -> serializeSkillToMarkdown -> markdown
//   markdown -> buildEditorUrl -> { url, fitsInUrl }
//   markdown -> copyToClipboard (fallback when fitsInUrl=false)
//   slug -> checkSlugCollision (opportunistic; treats 403/429/network as
//           'unknown' so the user isn't blocked by GitHub rate limits)
//   form -> validateSkillForm (mirrors CI validator; non-short-circuit)
//
// IMPORTANT: serialization uses the `yaml` package (matches the pipeline's
// major version). Hand-rolled string concat is lossy on titles containing
// quotes, colons, or other YAML-special characters. The canonical key order
// is REQUIRED because the CI validator's diff-friendly output expects a
// stable shape. We achieve order by inserting keys into a plain object in
// the documented sequence; both `yaml.stringify` and `JSON.stringify`
// preserve insertion order for string keys, so the resulting YAML key order
// matches our literal order below.

import { stringify as yamlStringify } from 'yaml';

import type {
  SkillForm,
  ValidationIssue,
  SkillOrigin,
  SkillCategory,
  SkillStatus,
  Audience,
} from './skill-types.js';
import { slugify } from './slug.js';

/** Hard URL ceiling used by buildEditorUrl. AC12: above this we surface a
 *  copy-to-clipboard fallback rather than send the user to a truncated
 *  GitHub web editor. */
const MAX_EDITOR_URL_LENGTH = 7000;

const VALID_AUDIENCES = new Set<Audience>(['beginner', 'advanced', 'both']);
const VALID_ORIGINS = new Set<SkillOrigin>(['internal', 'community', 'external']);
const VALID_CATEGORIES = new Set<SkillCategory>([
  'workflow',
  'code',
  'docs',
  'integration',
  'productivity',
  'testing',
  'other',
]);
const VALID_STATUSES = new Set<SkillStatus>(['active', 'experimental', 'deprecated']);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SKILL_ID_RE = /^[a-z0-9-]+$/;
const GH_MAINTAINER_RE = /^@[a-zA-Z0-9-]+$/;
const INSTALL_PREFIXES = [
  '/plugin marketplace add ',
  '/plugin install ',
] as const;

/** Thrown by copyToClipboard when the runtime lacks `navigator.clipboard`. */
export class ClipboardUnavailableError extends Error {
  constructor() {
    super('Clipboard API unavailable');
    this.name = 'ClipboardUnavailableError';
  }
}

/** Thrown to signal that an attempted submission URL exceeded the cap.
 *  Currently informational — buildEditorUrl returns `fitsInUrl: false`
 *  instead of throwing, but callers that want a hard exception path can
 *  wrap and rethrow. */
export class SubmissionUrlTooLongError extends Error {
  length: number;
  constructor(length: number) {
    super(`URL ${length}>${MAX_EDITOR_URL_LENGTH}`);
    this.name = 'SubmissionUrlTooLongError';
    this.length = length;
  }
}

/**
 * Serialize a SkillForm to the canonical Markdown shape:
 *
 *     ---
 *     <yaml frontmatter, canonical key order>
 *     ---
 *
 *     <body>
 *
 * Optional fields (`external_link`, `deeper_link`, `requires`) are omitted
 * when nullish/empty so the resulting file looks identical to a clean PR
 * authored by hand. Stable key order is REQUIRED so the CI validator's
 * diff output stays stable.
 */
export function serializeSkillToMarkdown(form: SkillForm): string {
  // Build the frontmatter record by inserting keys in canonical order.
  // Both `yaml.stringify` and JavaScript object iteration preserve string-
  // key insertion order, so this literal order = output order.
  const fm: Record<string, unknown> = {};
  fm.type = form.type;
  fm.title = form.title;
  fm.audience = form.audience;
  fm.topics = form.topics;
  fm.internal = form.internal;
  fm.authored = form.authored;
  fm.last_reviewed = form.last_reviewed;
  if (form.external_link !== null && form.external_link !== undefined) {
    fm.external_link = form.external_link;
  }
  if (form.deeper_link !== null && form.deeper_link !== undefined) {
    fm.deeper_link = form.deeper_link;
  }
  fm.ai_summary = form.ai_summary;
  fm.install_command = form.install_command;
  fm.skill_id = form.skill_id;
  fm.origin = form.origin;
  fm.category = form.category;
  fm.status = form.status;
  fm.maintainer = form.maintainer;
  if (form.requires !== undefined && form.requires.length > 0) {
    fm.requires = form.requires;
  }

  const yaml = yamlStringify(fm, { lineWidth: 0 });
  // `yaml.stringify` always emits a trailing newline. Strip it so our
  // frontmatter block has exactly one blank line between `---` markers
  // and the body.
  const yamlTrimmed = yaml.endsWith('\n') ? yaml.slice(0, -1) : yaml;
  return `---\n${yamlTrimmed}\n---\n\n${form.body}`;
}

/**
 * Build a GitHub "new file" web-editor URL pre-filled with the markdown.
 * Returns both the URL and a `fitsInUrl` flag so callers know whether to
 * push the user to the editor or fall back to clipboard + manual paste.
 */
export function buildEditorUrl(
  slug: string,
  markdown: string,
): { url: string; fitsInUrl: boolean } {
  const base =
    'https://github.com/556LowCodeNoCode/NbgAiHub/new/main/skills' +
    `?filename=${encodeURIComponent(slug)}.md` +
    `&value=${encodeURIComponent(markdown)}`;
  return { url: base, fitsInUrl: base.length <= MAX_EDITOR_URL_LENGTH };
}

function isParseableUrl(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a SkillForm against the same rules the CI validator enforces.
 * Returns every issue encountered, never short-circuiting — the UI needs
 * the full list to render inline errors next to each field.
 *
 * NOTE on `maintainer`: the CI validator additionally checks an allowlist
 * loaded from `config/maintainers.json`. That file is not bundled for the
 * client, so the site-side check accepts any GH handle (`@<handle>`) and
 * defers the allowlist enforcement to CI. See AC notes in the plan.
 */
export function validateSkillForm(
  form: SkillForm,
): { ok: true } | { ok: false; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  if (typeof form.title !== 'string' || form.title.trim().length === 0) {
    issues.push({
      field: 'title',
      rule: 'non-empty-string',
      message: 'title must be a non-empty string',
    });
  }

  if (!VALID_AUDIENCES.has(form.audience)) {
    issues.push({
      field: 'audience',
      rule: 'enum',
      message: `audience must be one of: ${[...VALID_AUDIENCES].join(', ')}`,
    });
  }

  if (
    !Array.isArray(form.topics) ||
    form.topics.length === 0 ||
    !form.topics.every((t) => typeof t === 'string' && t.length > 0)
  ) {
    issues.push({
      field: 'topics',
      rule: 'non-empty-string-array',
      message: 'topics must be a non-empty array of strings',
    });
  }

  if (typeof form.internal !== 'boolean') {
    issues.push({
      field: 'internal',
      rule: 'boolean',
      message: 'internal must be a boolean',
    });
  }

  if (typeof form.authored !== 'string' || !ISO_DATE_RE.test(form.authored)) {
    issues.push({
      field: 'authored',
      rule: 'iso-date',
      message: 'authored must match YYYY-MM-DD',
    });
  }

  if (
    typeof form.last_reviewed !== 'string' ||
    !ISO_DATE_RE.test(form.last_reviewed)
  ) {
    issues.push({
      field: 'last_reviewed',
      rule: 'iso-date',
      message: 'last_reviewed must match YYYY-MM-DD',
    });
  }

  if (form.external_link !== null) {
    if (typeof form.external_link !== 'string' || !isParseableUrl(form.external_link)) {
      issues.push({
        field: 'external_link',
        rule: 'url-or-null',
        message: 'external_link must be a parseable URL or null',
      });
    }
  }

  if (form.deeper_link !== null) {
    if (typeof form.deeper_link !== 'string' || !isParseableUrl(form.deeper_link)) {
      issues.push({
        field: 'deeper_link',
        rule: 'url-or-null',
        message: 'deeper_link must be a parseable URL or null',
      });
    }
  }

  if (typeof form.ai_summary !== 'string' || form.ai_summary.trim().length === 0) {
    issues.push({
      field: 'ai_summary',
      rule: 'non-empty-string',
      message: 'ai_summary must be a non-empty string',
    });
  }

  if (
    typeof form.install_command !== 'string' ||
    !INSTALL_PREFIXES.some((prefix) => form.install_command.startsWith(prefix))
  ) {
    issues.push({
      field: 'install_command',
      rule: 'install-prefix',
      message: `install_command must start with one of: ${INSTALL_PREFIXES.map((p) => `"${p}"`).join(' | ')}`,
    });
  }

  if (typeof form.skill_id !== 'string' || !SKILL_ID_RE.test(form.skill_id)) {
    issues.push({
      field: 'skill_id',
      rule: 'kebab-id',
      message: 'skill_id must match ^[a-z0-9-]+$',
    });
  }

  if (!VALID_ORIGINS.has(form.origin)) {
    issues.push({
      field: 'origin',
      rule: 'enum',
      message: `origin must be one of: ${[...VALID_ORIGINS].join(', ')}`,
    });
  }

  if (!VALID_CATEGORIES.has(form.category)) {
    issues.push({
      field: 'category',
      rule: 'enum',
      message: `category must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
    });
  }

  if (!VALID_STATUSES.has(form.status)) {
    issues.push({
      field: 'status',
      rule: 'enum',
      message: `status must be one of: ${[...VALID_STATUSES].join(', ')}`,
    });
  }

  if (typeof form.maintainer !== 'string' || !GH_MAINTAINER_RE.test(form.maintainer)) {
    issues.push({
      field: 'maintainer',
      rule: 'gh-handle',
      message: 'maintainer must match ^@[a-zA-Z0-9-]+$ (CI additionally checks the team allowlist)',
    });
  }

  if (typeof form.body !== 'string' || form.body.trim().length === 0) {
    issues.push({
      field: 'body',
      rule: 'non-empty',
      message: 'body must be a non-empty string',
    });
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

/**
 * Write markdown to the system clipboard. The Clipboard API requires a
 * secure context (HTTPS or localhost); when unavailable we throw a typed
 * error so the caller can render an explicit "copy this manually" UI.
 */
export async function copyToClipboard(markdown: string): Promise<void> {
  const nav = (globalThis as { navigator?: Navigator }).navigator;
  if (!nav || !nav.clipboard || typeof nav.clipboard.writeText !== 'function') {
    throw new ClipboardUnavailableError();
  }
  await nav.clipboard.writeText(markdown);
}

/**
 * Opportunistic slug collision check against the GitHub Contents API.
 *
 *   200 -> 'collision' (a skill file with this slug already exists)
 *   404 -> 'free'      (no such file — safe to use this slug)
 *   429/403/network -> 'unknown' (do not block the user; they can still
 *                                 submit and GitHub will reject on conflict)
 *
 * We intentionally do NOT pass a token here — the slug-collision check is
 * an opportunistic UX signal, not an authoritative one. Authenticating with
 * the user's PAT would leak the existence of the (private) repo's skills
 * directory into the user's token-scoped audit trail; we'd rather accept
 * "unknown" for the unauthenticated case. NOTE: because the repo is
 * private, unauthenticated requests will always return 404 in production
 * regardless of slug availability — the check is therefore best-effort
 * even in the happy path, and the authoritative collision detection is
 * the CI validator's path-vs-skill_id rule + GitHub's own "file already
 * exists" gate in the new-file editor.
 */
export async function checkSlugCollision(
  slug: string,
): Promise<'free' | 'collision' | 'unknown'> {
  const url = `https://api.github.com/repos/556LowCodeNoCode/NbgAiHub/contents/skills/${encodeURIComponent(slug)}.md`;
  try {
    const res = await fetch(url);
    if (res.status === 200) return 'collision';
    if (res.status === 404) return 'free';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Convenience wrapper — delegates to the shared `slugify` helper so the
 *  submission UI doesn't import slug.ts directly (one fewer surface to
 *  refactor at monorepo-dedup time). */
export function deriveSlugFromTitle(title: string): string {
  return slugify(title);
}
