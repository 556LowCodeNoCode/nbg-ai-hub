// site/src/content.config.ts
//
// Zod schemas for the 5 content collections.
//
// IMPORTANT — schema coupling:
//   The `news` schema below is a 1:1 mirror of the pipeline's NewsFrontmatter type.
//   The pipeline owns the canonical shape. Sources to keep in sync:
//     - pipeline/src/types.ts:54-74   (NewsFrontmatter type alias — 13 keys
//                                      including editor_confidence)
//     - pipeline/src/frontmatter.ts:14-30  (buildFrontmatter() emitter)
//     - DECISIONS.md "Shared content shape" and
//       "RSS triage: source-aware prompt + editor_confidence field"
//   If either side changes, update the other in the same PR.
//
// Other collections (skills, tips, glossary, journeys) share a 10-key base
// shape. Only `news` carries `editor_confidence`, `source`, `fingerprint`,
// and the optional `hero_image` — those come from AI triage, not hand-authoring.

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// ─── Shared field shapes (DRY) ─────────────────────────────────────────

const audienceEnum = z.enum(['beginner', 'advanced', 'both']);

// Astro's YAML parser (js-yaml) auto-converts unquoted YAML 1.1 date strings
// (`2026-05-18`) into JS Date objects before Zod sees them, even though the
// pipeline emits these as strings. Accept either shape and normalize to a
// "YYYY-MM-DD" string. Same root cause as the pipeline's gray-matter bug
// resolved during the vitest 2→4 upgrade.
const isoDateString = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD'),
  z.date().transform((d) => d.toISOString().slice(0, 10)),
]);

/**
 * The 10 canonical keys shared by every content type per DECISIONS.md
 * "Shared content shape". News layers `editor_confidence`, `source`,
 * `fingerprint`, and optional `hero_image` on top.
 */
function baseShape(typeLiteral: string) {
  return {
    type: z.literal(typeLiteral),
    title: z.string().min(1),
    audience: audienceEnum,
    topics: z.array(z.string()),
    internal: z.boolean(),
    authored: isoDateString,
    last_reviewed: isoDateString,
    external_link: z.string().url().nullable(),
    deeper_link: z.string().url().nullable(),
    ai_summary: z.string(),
  } as const;
}

// ─── news ──────────────────────────────────────────────────────────────
// Mirrors pipeline/src/types.ts → NewsFrontmatter (13 keys).
const news = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: '../news/published',
    // Plan R-2: strip date prefix so /news/<slug> drops the date.
    // 2026-05-18-foo-bar.md → entry.id === 'foo-bar' → /news/foo-bar/.
    generateId: ({ entry }) => {
      const withoutExt = entry.replace(/\.[^.]+$/, '');
      return withoutExt.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    },
  }),
  schema: z.object({
    ...baseShape('news'),
    // External link is `string | null` for news (pipeline emits null when
    // RSS feeds omit the link).
    external_link: z.string().url().nullable(),
    // Editor triage confidence — the value-add of source-aware triage.
    editor_confidence: z.enum(['high', 'medium', 'low']),
    // News-specific provenance:
    source: z.string().min(1),
    fingerprint: z.string().min(1),
    // Forward-compat: pipeline may extract hero images in a future phase.
    hero_image: z.string().url().optional(),
  }),
});

// ─── skills ────────────────────────────────────────────────────────────
// Extends `baseShape('skill')` (10 canonical keys) with 7 new fields per
// project-design.md §P.5.6. The site validator does *shape only* — the CI
// validator at `pipeline/src/validators/skill.ts` enforces semantic rules
// (handle/allowlist for `maintainer`, prefix/regex for `install_command`,
// etc.) using the same enum sets.
const skills = defineCollection({
  loader: glob({ pattern: '*.md', base: '../skills' }),
  schema: z.object({
    ...baseShape('skill'),
    install_command: z
      .string()
      .refine(
        (cmd) =>
          cmd.startsWith('/plugin marketplace add ') ||
          cmd.startsWith('/plugin install '),
        {
          message:
            'install_command must start with `/plugin marketplace add ` or `/plugin install `',
        },
      ),
    skill_id: z
      .string()
      .regex(/^[a-z0-9-]+$/, { message: 'skill_id must match /^[a-z0-9-]+$/' }),
    // 2026-05-26 — every skill must answer "when would I reach for this?"
    // Plain text, max 200 chars, lead with "Use this when…" (convention,
    // not enforced). Renders as a labeled block on the listing row and
    // helps a reader decide whether to install without reading the source.
    // No silent fallback: Zod fails the build if missing.
    when_to_use: z.string().min(1).max(220),
    origin: z.enum(['internal', 'community', 'external']),
    category: z.enum([
      'workflow',
      'code',
      'docs',
      'integration',
      'productivity',
      'testing',
      'other',
    ]),
    status: z.enum(['active', 'experimental', 'deprecated']),
    // CI validator enforces handle-or-allowlist; site does shape-only.
    maintainer: z.string().min(1),
    // Free-text per A11; `undefined` when absent (NOT `[]`) to keep diffs minimal.
    requires: z.array(z.string()).optional(),
    // UAT T7 V1 (2026-05-27) — a short, honest estimate of the wall-clock
    // time the skill saves vs doing the task by hand. Plain text like
    // "~30 min per use" or "~2 hours the first run". Optional because
    // some skills genuinely don't have a clean per-use number.
    time_saved: z.string().min(1).max(60).optional(),
    // UAT T7 V2 (2026-05-27) — a 2-4 sentence worked scenario answering
    // "when would I reach for this?". Concrete story, not abstract
    // capability. Optional during the rollout so existing skills don't
    // break the build; ship one with each skill entry as they're authored.
    worked_scenario: z.string().min(1).max(600).optional(),
    // 2026-06-02 — install-block enrichments so the detail page can render
    // a complete access → marketplace-add → install → use sequence inline
    // and the user doesn't have to bounce to GitHub.
    //
    // `marketplace_command`: the `/plugin marketplace add ...` step that
    // must run once before any skill from that marketplace is installable.
    // Optional because some skills (e.g. those already in the Anthropic
    // bundled marketplace) don't need it. Same prefix-refine as
    // `install_command` so authors can't typo it.
    marketplace_command: z
      .string()
      .refine(
        (cmd) =>
          cmd.startsWith('/plugin marketplace add ') ||
          cmd.startsWith('/plugin install '),
        {
          message:
            'marketplace_command must start with `/plugin marketplace add `',
        },
      )
      .optional(),
    // `access_request`: short markdown explaining how to request access
    // to the upstream repo, when access isn't automatic. Empty/missing =
    // "public, no access needed". TBD placeholders are allowed during
    // rollout (the AI team is still finalising the request process for
    // NBG-AI/claude-tools).
    access_request: z.string().min(1).max(800).optional(),
  }),
});

// ─── tips ──────────────────────────────────────────────────────────────
const tips = defineCollection({
  loader: glob({ pattern: '*.md', base: '../tips' }),
  schema: z.object(baseShape('tip')),
});

// ─── glossary ──────────────────────────────────────────────────────────
// Extends `baseShape('glossary')` with two fields driving the build-time
// auto-link + hover tooltip feature (project-design.md §S.14):
//   - `tldr`: required ≤160-char plain-text summary rendered inside the
//     popover. No silent fallback if missing — Zod fails the build.
//   - `aliases`: optional list of alternative spellings the remark plugin
//     also matches (e.g. plurals, abbreviations). Empty by default.
const glossary = defineCollection({
  loader: glob({ pattern: '*.md', base: '../glossary' }),
  schema: z.object({
    ...baseShape('glossary'),
    tldr: z
      .string()
      .min(1, { message: 'tldr is required (≤160 chars, plain text)' })
      .max(160, { message: 'tldr must be ≤160 characters' }),
    aliases: z.array(z.string().min(1, { message: 'alias must be a non-empty string' })).default([]),
  }),
});

// ─── journeys ──────────────────────────────────────────────────────────
const journeys = defineCollection({
  loader: glob({ pattern: '*.md', base: '../journeys' }),
  schema: z.object(baseShape('journey-step')),
});

// ─── usecases ──────────────────────────────────────────────────────────
// Beginner-friendly worked examples bank colleagues can try after Day 1.
// Schema extends `baseShape('usecase')` with use-case-specific fields:
//   - business_unit: which side of the bank the use case is anchored to
//   - time_estimate: free text like "~25 min" (small wall-clock estimate)
//   - difficulty:    'beginner' | 'intermediate' — gallery filter handle
//   - order:         stable display order for the gallery (low → high)
//   - outcome:       one-sentence "what you'll end up with"
//   - inputs:        bullet list of preconditions for the use case
// The markdown body is `## Step N — Title` segmented, same shape Day 1
// and Foundations use, so the detail page can reuse that parser verbatim.
const usecases = defineCollection({
  loader: glob({ pattern: '*.md', base: '../usecases' }),
  schema: z.object({
    ...baseShape('usecase'),
    business_unit: z.enum([
      'retail',
      'contact-center',
      'compliance',
      'mortgages',
      'operations',
      'process-improvement',
      'hr',
      'risk',
      'data',
      'accounting',
    ]),
    time_estimate: z.string().min(1).max(40),
    difficulty: z.enum(['beginner', 'intermediate']),
    order: z.number().int().min(0),
    outcome: z.string().min(1).max(400),
    inputs: z.array(z.string().min(1)).default([]),
  }),
});

// ─── docs ──────────────────────────────────────────────────────────────
// Starlight's built-in `docs` collection — backs `src/content/docs/` and
// powers the splash homepage (`index.mdx`). Required by Starlight 0.39.
const docs = defineCollection({
  loader: docsLoader(),
  schema: docsSchema(),
});

export const collections = { docs, news, skills, tips, glossary, journeys, usecases };
