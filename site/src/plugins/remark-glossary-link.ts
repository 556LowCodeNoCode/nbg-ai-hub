// site/src/plugins/remark-glossary-link.ts
//
// Build-time remark plugin that auto-links glossary terms inside markdown
// content. Implements the contract frozen in
// docs/design/project-design.md §S.14.3 (Remark plugin contract),
// §S.14.5 (Wiring options), and §S.14.7 (Error-handling strategy).
//
// What it does:
//   - At factory time, reads every *.md under `options.glossaryDir` once,
//     parses YAML frontmatter (no dep on gray-matter — manual parse keeps the
//     plugin self-contained and avoids transitive ESM/CJS interop hazards in
//     Astro's TS-on-the-fly config loader), and builds a variant index keyed
//     by `variant.toLowerCase()` where variants = slug + each alias.
//   - For every markdown file processed by remark, walks the mdast tree with
//     `unist-util-visit`, skipping subtrees that must not be linkified
//     (code, inlineCode, heading, link, linkReference, definition, html,
//     and Starlight asides — containerDirective with name in
//     {note, tip, caution, danger}).
//   - On `text` nodes, runs a single longest-first alternation regex with
//     explicit non-alphanumeric lookarounds (NOT \b — see §S.14.3 boundary
//     table) and replaces the first match per canonical slug per file with
//     a raw HTML node carrying a `<button data-glossary-slug="…">` trigger.
//     The popover surface itself is wired at runtime by GlossaryTerm.astro's
//     registry script (§S.14.4) — this plugin emits ONLY the trigger.
//
// What it does NOT do:
//   - Re-read the glossary directory per file. The index is built ONCE
//     at factory call time. Astro reinvokes the factory on config-level HMR.
//   - Touch files under `news/published/` (resolved OQ1 — exclude by path).
//   - Match a term on the page that IS the term (self-page skip).
//   - Provide silent fallbacks. Missing `glossaryDir`, nonexistent dir, and
//     other config defects throw at factory time per global CLAUDE.md rule
//     "Never create fallback values for missing configuration".
//
// Named export `getGlossaryIndex(glossaryDir)` exposes the same index so
// downstream code (GlossaryTerm.astro registry) can consume identical data.
// The result is memoised per absolute-resolved glossaryDir.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SKIP, visit } from 'unist-util-visit';
import type { Plugin, Transformer } from 'unified';
import type { Root, RootContent, Parent, Text, Html } from 'mdast';
import type { VFile } from 'vfile';

// ─── Public types ──────────────────────────────────────────────────────

/**
 * One glossary entry as the matcher sees it.
 * Variants are lower-cased and used as Map keys; the canonical record
 * carries the slug + display title.
 */
export interface GlossaryEntry {
  /** Canonical slug — filename minus `.md`, e.g. `"pull-request"`. */
  slug: string;
  /** Display title from frontmatter — used as the popover heading. */
  title: string;
  /** Lower-cased variants the matcher scans for (slug + each alias). */
  variants: string[];
}

export interface RemarkGlossaryLinkOptions {
  /** Absolute or relative path to the glossary content dir. Required. */
  glossaryDir: string;
  /**
   * Path-substring tests. If `file.path` includes ANY of these, the plugin
   * returns early without mutating the AST.
   */
  excludePaths?: string[];
}

// ─── Module-scoped memo for getGlossaryIndex ───────────────────────────

const indexMemo = new Map<string, Map<string, GlossaryEntry>>();

// ─── Plugin factory (default export) ───────────────────────────────────

// Unified plugin convention: a plugin is `function(options) -> Transformer`.
// The factory itself IS the unified Plugin — it accepts the options arg directly
// and returns the transformer. (Earlier double-wrapped form returned a nested
// `() -> Transformer`, which unified treated as the transformer and called with
// `(tree, file)` — the no-args inner function ignored both args and returned a
// new transformer that was then discarded, leaving the AST unmutated. Found
// during build-output verification 2026-05-25.)
const remarkGlossaryLink: Plugin<[RemarkGlossaryLinkOptions], Root, Root> = function (
  options,
) {
  if (!options || typeof options.glossaryDir !== 'string' || options.glossaryDir.length === 0) {
    throw new Error(
      'remark-glossary-link: options.glossaryDir is required (no fallback).',
    );
  }

  const absDir = resolve(options.glossaryDir);
  let dirOk = false;
  try {
    dirOk = statSync(absDir).isDirectory();
  } catch {
    dirOk = false;
  }
  if (!dirOk) {
    throw new Error(
      `remark-glossary-link: glossary directory not found at ${absDir}`,
    );
  }

  const index = buildGlossaryIndex(absDir);
  indexMemo.set(absDir, index);

  const excludePaths = options.excludePaths ?? [];

  // Empty-glossary guard: keep the plugin a no-op rather than failing.
  if (index.size === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      'remark-glossary-link: glossary directory is empty — auto-linking disabled.',
    );
    const noop: Transformer<Root, Root> = (_tree, _file) => {
      /* no-op */
    };
    return noop;
  }

  const matcher = buildMatcherRegex(index);

  const transform: Transformer<Root, Root> = (tree, file) => {
    runTransform(tree, file, matcher, index, excludePaths);
  };
  return transform;
};

function runTransform(
  tree: Root,
  file: VFile,
  matcher: RegExp,
  index: Map<string, GlossaryEntry>,
  excludePaths: string[],
): void {
  const filePath = (file.path ?? '') as string;
  for (const ex of excludePaths) {
    if (filePath.includes(ex)) return;
  }

  const currentSlug = deriveCurrentGlossarySlug(filePath);
  const matched = new Set<string>(); // canonical slugs already wrapped on this file

  visit(tree, (node, idx, parent) => {
    // Skip whole subtrees we must not descend into.
    if (
      node.type === 'code' ||
      node.type === 'inlineCode' ||
      node.type === 'heading' ||
      node.type === 'link' ||
      node.type === 'linkReference' ||
      node.type === 'definition' ||
      node.type === 'html'
    ) {
      return SKIP;
    }
    // Starlight asides via remark-directive.
    if (isAsideContainer(node as { type: string; name?: string })) return SKIP;

    if (node.type !== 'text') return; // descend, but only `text` leaves match
    if (!parent || idx === undefined || idx === null) return;

    // Find first qualifying hit in this text node — qualifying means the
    // canonical slug has not already been wrapped on this file AND is not
    // the current page's own slug.
    const value = (node as Text).value;
    matcher.lastIndex = 0;
    let hit: RegExpExecArray | null;
    while ((hit = matcher.exec(value)) !== null) {
      const matchedText = hit[1] ?? '';
      if (matchedText.length === 0) {
        // Defensive: avoid an infinite loop on zero-length matches.
        matcher.lastIndex = hit.index + 1;
        continue;
      }
      const variantKey = matchedText.toLowerCase();
      const entry = index.get(variantKey);
      if (!entry) continue; // shouldn't happen — regex source IS the keys
      if (matched.has(entry.slug)) continue;
      if (currentSlug !== null && entry.slug === currentSlug) continue;

      // Accept this hit. Splice the text node into [before, html, after].
      const start = hit.index;
      const end = start + matchedText.length;
      const before = value.slice(0, start);
      const after = value.slice(end);

      const replacement: RootContent[] = [];
      if (before.length > 0) {
        replacement.push({ type: 'text', value: before } satisfies Text);
      }
      const html: Html = {
        type: 'html',
        value:
          '<button type="button" class="nbg-glossary-trigger" ' +
          `data-glossary-slug="${escapeAttr(entry.slug)}" ` +
          `data-glossary-display="${escapeAttr(matchedText)}">` +
          escapeHtml(matchedText) +
          '</button>',
      };
      replacement.push(html);
      if (after.length > 0) {
        replacement.push({ type: 'text', value: after } satisfies Text);
      }

      (parent as Parent).children.splice(idx, 1, ...replacement);
      matched.add(entry.slug);

      // Resume the walk at the trailing `after` text node when one exists,
      // so subsequent terms in the same original text can still match. When
      // no trailing text was emitted (the match consumed the end of the
      // text node), resume at the position immediately after all inserted
      // nodes. SKIP is fine here because the leading `before` text node, if
      // any, was already scanned by the regex earlier in this iteration —
      // re-visiting it would just be wasted work, never an extra match.
      const afterEmitted = after.length > 0;
      const resumeIndex = afterEmitted
        ? idx + replacement.length - 1 // index of the trailing text node
        : idx + replacement.length;
      return [SKIP, resumeIndex];
    }
    return;
  });
}

export default remarkGlossaryLink;

// ─── Named export: getGlossaryIndex (build-time consumers) ─────────────

/**
 * Returns the same variant→entry Map the plugin's matcher uses. Memoised
 * per absolute-resolved glossaryDir. Build-time only — do NOT import from
 * runtime page components.
 */
export function getGlossaryIndex(glossaryDir: string): Map<string, GlossaryEntry> {
  if (typeof glossaryDir !== 'string' || glossaryDir.length === 0) {
    throw new Error(
      'getGlossaryIndex: glossaryDir is required (no fallback).',
    );
  }
  const absDir = resolve(glossaryDir);
  const cached = indexMemo.get(absDir);
  if (cached) return cached;
  let dirOk = false;
  try {
    dirOk = statSync(absDir).isDirectory();
  } catch {
    dirOk = false;
  }
  if (!dirOk) {
    throw new Error(
      `getGlossaryIndex: glossary directory not found at ${absDir}`,
    );
  }
  const built = buildGlossaryIndex(absDir);
  indexMemo.set(absDir, built);
  return built;
}

// ─── Internals ─────────────────────────────────────────────────────────

interface ParsedGlossaryFile {
  slug: string;
  title: string;
  aliases: string[];
  hasTldr: boolean;
}

function buildGlossaryIndex(absDir: string): Map<string, GlossaryEntry> {
  const entries: ParsedGlossaryFile[] = [];
  const files = readdirSync(absDir)
    .filter((f) => f.endsWith('.md'))
    .sort(); // deterministic order — also drives alphabetical first-wins on conflict

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const raw = readFileSync(join(absDir, file), 'utf8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) {
      // Malformed file (no frontmatter). Skip with a warn — Astro's Zod
      // validation will surface a clearer error at build time.
      // eslint-disable-next-line no-console
      console.warn(
        `remark-glossary-link: ${file} has no parseable frontmatter — skipping.`,
      );
      continue;
    }
    const title = typeof parsed.title === 'string' && parsed.title.length > 0
      ? parsed.title
      : slug;
    const aliases = Array.isArray(parsed.aliases)
      ? parsed.aliases.filter((a): a is string => typeof a === 'string' && a.length > 0)
      : [];
    const hasTldr = typeof parsed.tldr === 'string' && parsed.tldr.length > 0;
    if (!hasTldr) {
      // Defensive — Zod is the authoritative gate, but if a file ever
      // bypasses it (e.g. plugin invoked outside `astro build`), surface it.
      // eslint-disable-next-line no-console
      console.warn(
        `remark-glossary-link: ${file} is missing \`tldr\` — Zod should have caught this.`,
      );
    }
    entries.push({ slug, title, aliases, hasTldr });
  }

  // Build the variant Map. On conflict, first-wins; since `entries` is sorted
  // alphabetically by slug, "first" == alphabetically-first slug.
  const map = new Map<string, GlossaryEntry>();
  for (const e of entries) {
    const variants: string[] = [];
    const slugVariant = e.slug.toLowerCase();
    variants.push(slugVariant);
    for (const a of e.aliases) {
      const v = a.toLowerCase();
      if (!variants.includes(v)) variants.push(v);
    }
    const record: GlossaryEntry = { slug: e.slug, title: e.title, variants };
    for (const v of variants) {
      const existing = map.get(v);
      if (existing && existing.slug !== e.slug) {
        // eslint-disable-next-line no-console
        console.warn(
          `remark-glossary-link: alias "${v}" claimed by both slug "${existing.slug}" and slug "${e.slug}" — using "${existing.slug}" (alphabetical first-wins).`,
        );
        continue; // keep existing
      }
      map.set(v, record);
    }
  }
  return map;
}

function buildMatcherRegex(index: Map<string, GlossaryEntry>): RegExp {
  // Longest-first so multi-word aliases ("command-line interface") win over
  // single-word substrings ("command-line") in the alternation.
  const variants = [...index.keys()]
    .sort((a, b) => b.length - a.length)
    .map((v) => escapeRegex(v));
  // Boundary rule: \b is wrong here because it treats `-` as a word boundary
  // inconsistently. Explicit non-alphanumeric lookarounds capture the rule
  // from §S.14.3: alphanumeric + underscore are NOT boundaries; everything
  // else (incl. hyphen, space, punctuation) IS.
  return new RegExp(
    `(?<![A-Za-z0-9_])(${variants.join('|')})(?![A-Za-z0-9_])`,
    'gi',
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}

function escapeAttr(s: string): string {
  // Attribute values: same escapes — & " < > are the load-bearing ones.
  return escapeHtml(s);
}

function deriveCurrentGlossarySlug(filePath: string): string | null {
  if (!filePath) return null;
  const m = filePath.match(/[\\/]glossary[\\/]([^\\/]+)\.md$/);
  return m ? m[1]! : null;
}

function isAsideContainer(node: { type: string; name?: string }): boolean {
  if (node.type !== 'containerDirective') return false;
  const name = typeof node.name === 'string' ? node.name : '';
  return name === 'note' || name === 'tip' || name === 'caution' || name === 'danger';
}

// ─── Minimal YAML-frontmatter parser ───────────────────────────────────
// Avoids a hard runtime dep on gray-matter. Handles only the keys we read:
// title (string), tldr (string), aliases (inline array of strings).
// For anything more exotic, Astro's Zod loader is the authoritative parser
// at build time — this is a defence-in-depth read just to drive the matcher.

interface FrontmatterShape {
  title?: unknown;
  tldr?: unknown;
  aliases?: unknown;
}

function parseFrontmatter(raw: string): FrontmatterShape | null {
  // Accept Windows or Unix line endings; require leading `---` then a closing `---`.
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const body = match[1] ?? '';
  const out: FrontmatterShape = {};
  // Split into logical lines; ignore lines that begin with whitespace
  // (we don't parse nested keys — none of our target keys are nested).
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.replace(/\s+$/, '');
    if (trimmed.length === 0) continue;
    if (/^\s/.test(line)) continue; // skip continuation lines
    const kv = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1]!;
    const rawValue = (kv[2] ?? '').trim();
    if (key === 'title') {
      out.title = unquoteScalar(rawValue);
    } else if (key === 'tldr') {
      out.tldr = unquoteScalar(rawValue);
    } else if (key === 'aliases') {
      out.aliases = parseInlineArray(rawValue);
    }
  }
  return out;
}

function unquoteScalar(v: string): string {
  if (v.length >= 2) {
    const first = v[0];
    const last = v[v.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return v.slice(1, -1);
    }
  }
  return v;
}

function parseInlineArray(v: string): string[] {
  // Only the inline form `["a", "b"]` is supported — that's what the
  // alias contract uses (§S.14.2). Block-form sequences fall back to [].
  if (!v.startsWith('[') || !v.endsWith(']')) return [];
  const inner = v.slice(1, -1).trim();
  if (inner.length === 0) return [];
  const out: string[] = [];
  // Tokenize by commas at depth 0, respecting quoted strings.
  let buf = '';
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]!;
    if (inSingle) {
      if (c === "'") inSingle = false;
      else buf += c;
      continue;
    }
    if (inDouble) {
      if (c === '"') inDouble = false;
      else buf += c;
      continue;
    }
    if (c === "'") { inSingle = true; continue; }
    if (c === '"') { inDouble = true; continue; }
    if (c === ',') {
      const tok = buf.trim();
      if (tok.length > 0) out.push(tok);
      buf = '';
      continue;
    }
    buf += c;
  }
  const tail = buf.trim();
  if (tail.length > 0) out.push(tail);
  return out;
}
