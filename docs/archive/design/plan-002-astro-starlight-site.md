# Plan 002 — Astro Starlight Site

**Refined request:** `docs/refined-requests/astro-starlight-site.md`
**Investigation:** `docs/reference/investigation-astro-site.md`
**Codebase scan:** `docs/reference/codebase-scan-astro-site.md`
**Created:** 2026-05-18

This plan sequences the implementation of the `site/` workspace — the Astro 6 + Starlight 0.39 static site that renders the five hub pillars from sibling repo content folders. The plan owns *sequencing, dependencies, files-to-modify, and verification criteria*. Architecture, interfaces, function signatures, and component contracts are deferred to Phase 5 (Designer) — `project-design.md` "Site architecture" section.

---

## 1. Refinement reconciliations

Pre-implementation reconciliations the plan must respect. Each below is either already applied in the refined request / DECISIONS.md, or must be applied by the implementer at the step indicated.

- **R-1 — A1/A2 supersession (Astro 6 + Starlight 0.39).** The refined request originally pinned Astro 5.x + Starlight 0.x. Phase 3a investigation (§1) found Starlight 0.38 drops Astro 5 support and 0.39 requires Astro 6 (GA 2026-03-10). A1, A2, AC1, and NF1 of the refined request have been amended in place to `astro ^6.x` + `@astrojs/starlight ^0.39.x`. DECISIONS.md entry "2026-05-18 — Astro 6 + Starlight 0.39 (supersedes earlier Astro 5.x assumption)" records the supersession. **Status:** already applied — no plan action needed beyond pinning these versions at install time.

- **R-2 — `generateId` callback on the news collection.** A5 of the refined request maps `2026-05-18-claude-code-helped-me.md` → `/news/claude-code-helped-me`. The canonical mechanism is a `generateId: ({ entry }) => …` callback inside the `glob()` loader for the `news` collection (and only the news collection — other collections keep filename-as-id). Stripping `^\d{4}-\d{2}-\d{2}-` before the extension makes `entry.id` URL-clean, which feeds `params: { slug: post.id }` in the dynamic route. **Applied at Step 4.**

- **R-3 — Build script hardening.** Two npm scripts must be wired to work around the known `astro check` silent-exit wart (investigation §7, language-tools discussion #982) and to enforce AC18 (invalid frontmatter must fail the build):
  - `"check": "astro sync && astro check"` — runs `astro sync` first so schema errors surface deterministically (silent-exit mitigated).
  - `"build": "astro check && astro build"` — chains check before build so schema/TS errors fail the build and satisfy NF8 / AC18 / AC6.
  **Applied at Step 3.**

- **R-4 — Homepage structure.** The homepage at `/` is a Starlight content page with `template: splash`, not a custom `.astro` under `src/pages/`. File: `site/src/content/docs/index.mdx`. Splash removes the sidebar/TOC chrome so `HomeHero` lands as a full-width hero, and MDX (not plain Markdown) is required to `import HomeHero from ...` and `import NewsPanel from ...`. Starlight bundles MDX — do NOT add `@astrojs/mdx` as a separate integration (it would duplicate and warn). **Applied at Step 7.**

- **R-5 — Catalog pages as `.astro` under `src/pages/` wrapped in `StarlightPage`.** `/news`, `/news/<slug>`, `/skills`, `/tips`, `/glossary`, `/reference`, `/contribute`, `/start-here/day-1` are implemented as `.astro` files under `site/src/pages/`, each wrapping its body in `<StarlightPage frontmatter={{ title: … }}>` so they inherit Starlight chrome (sidebar, header search, footer). They are NOT `.md` files under `src/content/docs/` — catalog pages need `getCollection()` calls and programmatic rendering. (Reference and Contribute pages are simple enough that they could be `.md` under `src/content/docs/`, but consistency with the other catalog pages favors `.astro` + `StarlightPage` for all of them. Decision: all 8 routes are `.astro` under `src/pages/`.) **Applied at Steps 8–10.**

- **R-6 — A9 rationale refresh (cosmetic, not blocking).** Refined-request A9 (`No unit tests for components in MVP`) currently justifies the deferral on "component-level testing in Astro is also relatively immature in 2026". Investigation §8 shows that's no longer factually accurate — Vitest 4 + Astro Container API and `vitest-browser-astro` are both stable. The Designer should update A9's rationale in `project-design.md` to the small-behavioral-surface justification: *"Component-level tests deferred to a follow-up; pipeline tests cover the frontmatter shape, `astro check` catches schema drift, and the rendering surface is mostly pure mapping. Vitest + Astro Container API is available when we want it."* **Not blocking; refresh during Step 13 (docs).**

- **R-7 — HMR caveat for cross-folder content.** Astro's dev-server file watcher watches the project root (`site/`) and `src/`. Files under sibling folders like `../news/published/`, `../skills/`, etc. may not trigger HMR on edit. Workaround: restart `npm run dev`, or widen the watcher with `vite: { server: { watch: { ignored: ['!../news/published/**', '!../skills/**', ...] } } }` in `astro.config.mjs`. Not blocking for MVP because content authoring happens via PR + file write (not live editing during dev). **Document in `site/README.md` and / or `project-design.md` "Site architecture" at Step 13.**

---

## 2. Phase breakdown

Discrete steps in execution order. Each step lists files, dependencies, verification, and effort (S = ≤30 min, M = 30–90 min, L = ≥90 min).

### Step 1 — Scaffold `site/` workspace via `npm create astro@latest`

**Goal:** Bring up an Astro 6 + Starlight 0.39 baseline using the official Starlight template, in the canonical `site/` location.

**Files created:** `site/` (entire directory tree) — generated by the Starlight scaffold template. Key files the scaffolder produces and we will subsequently customize:
- `site/package.json`
- `site/astro.config.mjs`
- `site/tsconfig.json`
- `site/src/content.config.ts` (or pre-existing `src/content/config.ts` — Astro 5+ uses the dotted form; if the template emits the older path, rename to `content.config.ts`)
- `site/src/content/docs/index.mdx` (scaffold homepage — we'll overwrite at Step 7)
- `site/src/assets/`, `site/public/`, `site/.gitignore`
- `site/node_modules/` (after `npm install`)

**Files modified:** none yet — this step only scaffolds.

**Dependencies:** none (greenfield).

**Verification:**
- `ls site/package.json site/astro.config.mjs` returns both paths.
- `grep -E '"astro": "\\^6' site/package.json` matches.
- `grep -E '"@astrojs/starlight": "\\^0\\.39' site/package.json` matches.
- `cd site && npm install` exits 0.
- `cd site && npm run dev -- --port 4321` serves a 200 on `http://localhost:4321` (scaffold landing page). Stop the dev server immediately after verifying.

**Effort:** S.

---

### Step 2 — Pin Node 22, ESM, port band

**Goal:** Align the new workspace with project-wide conventions (Node 22, ESM, port 4321) before any customization.

**Files created:**
- `site/.nvmrc` containing `22`.

**Files modified:**
- `site/package.json` — confirm `"type": "module"` is set (Starlight scaffold sets this by default; verify don't add a duplicate).
- `site/astro.config.mjs` — add `server: { port: 4321, host: false }` to the `defineConfig({...})` call.

**Dependencies:** Step 1.

**Verification:**
- `cat site/.nvmrc` prints `22`.
- `grep '"type": "module"' site/package.json` matches.
- `grep 'port: 4321' site/astro.config.mjs` matches.
- `cd site && npm run dev` (no `--port` flag) serves on 4321 (verify with `lsof -i :4321` showing node process bound to that port).
- Per CLAUDE.md → Ports global rule: if 4321 is occupied, switch to 4322 via CLI flag — do NOT kill the other process and do NOT edit the config.

**Effort:** S.

---

### Step 3 — Wire `package.json` scripts and TypeScript strictness

**Goal:** Lock in the hardened build / check scripts (R-3) and the strict TypeScript config (NF2).

**Files modified:**
- `site/package.json` — `scripts` block:
  ```json
  {
    "dev": "astro dev",
    "check": "astro sync && astro check",
    "build": "astro check && astro build",
    "preview": "astro preview"
  }
  ```
- `site/tsconfig.json` — extends Starlight's recommended strict config (scaffold default), adds `"noUncheckedIndexedAccess": true` if not already present.

**Dependencies:** Step 1.

**Verification:**
- `grep '"check": "astro sync && astro check"' site/package.json` matches.
- `grep '"build": "astro check && astro build"' site/package.json` matches.
- `grep '"noUncheckedIndexedAccess": true' site/tsconfig.json` matches.
- `cd site && npm run check` exits 0 (against the scaffold default content — no schema errors yet because we haven't wired our collections).

**Effort:** S.

---

### Step 4 — Define content collections (`content.config.ts`)

**Goal:** Wire all 5 content collections via Astro 6's `glob()` loader, each with a strict Zod schema mirroring the canonical 12-key shape plus news-specific extras and optional `hero_image`. Implements R-2.

**Files created/modified:**
- `site/src/content.config.ts` (overwrite scaffold's default).

**Collections defined:**
- `news` ← `glob({ pattern: '*.md', base: '../news/published', generateId: ({ entry }) => entry.replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '') })`. Schema: 12 canonical keys + `source` + `fingerprint` + optional `hero_image`.
- `skills` ← `glob({ pattern: '*.md', base: '../skills' })`. Schema: 12 canonical keys (where `type: z.literal('skill')`).
- `tips` ← `glob({ pattern: '*.md', base: '../tips' })`. Schema: 12 canonical keys (where `type: z.literal('tip')`).
- `glossary` ← `glob({ pattern: '*.md', base: '../glossary' })`. Schema: 12 canonical keys (where `type: z.literal('glossary')`).
- `journeys` ← `glob({ pattern: '*.md', base: '../journeys' })`. Schema: 12 canonical keys (where `type: z.literal('journey-step')`).

**Schema details** (the Designer will finalize key-by-key Zod calls; this step delivers the *shape*, not the typed interface):
- All 12 canonical keys from DECISIONS.md "Shared content shape" present in each collection's schema.
- News additionally: `source: z.string()`, `fingerprint: z.string()`, `hero_image: z.string().url().optional()`.
- `z` is imported from `astro/zod` (Astro 6 idiom — investigation §2b), not from `astro:content`.

**Dependencies:** Step 1, Step 3.

**Verification:**
- File exists at `site/src/content.config.ts`.
- `grep -E "defineCollection\\(" site/src/content.config.ts` returns 5 hits.
- `grep "generateId" site/src/content.config.ts` matches (news collection only).
- `grep -E "source|fingerprint|hero_image" site/src/content.config.ts` matches all three.
- `cd site && npx astro sync` exits 0; `site/.astro/types.d.ts` regenerates with the 5 collections typed.
- `cd site && npm run check` exits 0 (collections are still empty — no schema violations).

**Effort:** M.

---

### Step 5 — Configure declarative sidebar in `astro.config.mjs`

**Goal:** Wire the 9-entry sidebar exactly per refined-request F3 / A11. Implements R-5 in part (links to `.astro` pages use `link:`, not `slug:`).

**Files modified:**
- `site/astro.config.mjs` — pass `sidebar: [...]` array to the `starlight({...})` integration call.

**Sidebar shape** (declarative, top-level order locked):
1. `{ label: 'Home', link: '/' }`
2. `{ label: 'Start Here', items: [{ label: 'Day 1', link: '/start-here/day-1/' }, { label: 'Week 1', link: '/start-here/week-1/' }] }` (Week 1 link can dead-end for MVP — page is a "coming soon" placeholder)
3. `{ label: 'News', link: '/news/' }`
4. `{ label: 'Skills', link: '/skills/' }`
5. `{ label: 'Tips & Tricks', link: '/tips/' }`
6. `{ label: 'Glossary', link: '/glossary/' }`
7. `{ label: 'Reference', link: '/reference/' }`
8. `{ label: 'Contribute', link: '/contribute/' }`

(Note: 8 top-level entries + the 2 children inside "Start Here" = 9 visible labels in the rendered sidebar, satisfying AC2 / AC8.)

**Dependencies:** Step 1 (config exists), Step 2 (port already set).

**Verification:**
- `grep -E "label: 'Home'" site/astro.config.mjs` and similar for each of the other 8 labels (Start Here, Day 1, Week 1, News, Skills, Tips & Tricks, Glossary, Reference, Contribute) — 9 grep matches.
- `cd site && npm run build` exits 0; `dist/index.html` contains each of the 9 labels (verifiable post-Step 7 once index page exists).

**Effort:** S.

---

### Step 6 — Add `customCss` for hero, news cards, audience badges

**Goal:** ~100 LOC of minimal CSS (A6) — hero layout, news card styling, audience badge colors. Everything else uses Starlight defaults.

**Files created:**
- `site/src/styles/custom.css` — class-based styles only (no global resets). Includes:
  - `.home-hero` block layout (centered, ~80vh feel, CTA-row).
  - `.news-card` and `.news-card-grid` for `/news` and the homepage panel.
  - `.audience-badge.beginner` (color: `#0a7`), `.audience-badge.advanced` (color: `#e60`), `.audience-badge.both` (color: `#08c`) per A7. AC13 evidence.
  - `.audience-hidden { display: none !important; }` — used by the audience filter (AC14).

**Files modified:**
- `site/astro.config.mjs` — add `customCss: ['./src/styles/custom.css']` to the `starlight({...})` config.

**Dependencies:** Step 5.

**Verification:**
- `ls site/src/styles/custom.css` returns the path.
- `grep "customCss" site/astro.config.mjs` matches.
- `grep -E "#0a7|#e60|#08c" site/src/styles/custom.css` returns 3 hits (one per color).
- `grep ".audience-hidden" site/src/styles/custom.css` matches.
- `cd site && npm run build` exits 0; `dist/_astro/*.css` includes the custom rules.

**Effort:** S.

---

### Step 7 — Build the 6 custom Astro components

**Goal:** Create the 6 components under `site/src/components/`. AC12 names them all explicitly. Detailed component design (props, slots, render logic) is owned by Phase 5 (Designer) — this step is about the *files existing in the right shape* and being importable.

**Files created (one per component):**
- `site/src/components/HomeHero.astro`
- `site/src/components/NewsPanel.astro`
- `site/src/components/NewsList.astro`
- `site/src/components/AudienceBadge.astro`
- `site/src/components/SkillCard.astro`
- `site/src/components/AudienceFilter.astro`

**Per-component goals** (sequencing only; designer owns the interfaces):
- `HomeHero` — title, tagline, two CTAs ("Start Here → Day 1", "Browse Skills"). Uses `.home-hero` CSS class. Has `class="not-content"` on root (investigation §4d) to avoid Starlight's prose margins.
- `NewsPanel` — calls `getCollection('news')`, sorts by `data.authored` desc, takes top 5, renders `news-card`-styled list. Includes empty-state fallback (F9 / A8 copy).
- `NewsList` — same data fetch but no slice; full list with topic chips. Renders into `/news/index.astro`.
- `AudienceBadge` — `<span class="audience-badge {audience}">{audience}</span>`. Color comes from CSS class (AC13).
- `SkillCard` — card layout for a skill entry. Renders title, audience badge, topic chips, link.
- `AudienceFilter` — three checkboxes + inline `<script>` block reading checkbox state, toggling `audience-hidden` class on `[data-audience]` elements, persisting state to `localStorage` (key `nbgaihub.audience`). Restore-on-load. AC14 evidence.

**Dependencies:** Step 4 (collections exist for `getCollection` calls), Step 6 (CSS classes exist).

**Verification:**
- `ls site/src/components/*.astro` lists all 6 file paths.
- `grep -l "AudienceFilter" site/src/components/AudienceFilter.astro` and similar for each name.
- `grep "localStorage" site/src/components/AudienceFilter.astro` matches.
- `grep -E "data-audience|audience-hidden" site/src/components/AudienceFilter.astro` matches both.
- `cd site && npm run check` exits 0 (compile errors would fail this).

**Effort:** L. (Largest single step. The Designer's component contracts must be ready before this step starts.)

---

### Step 8 — Write the homepage `src/content/docs/index.mdx`

**Goal:** Implements R-4. Splash-template homepage that imports `HomeHero` and `NewsPanel`.

**Files created/modified:**
- `site/src/content/docs/index.mdx` (overwrite scaffold default).

**Shape** (the Designer will finalize the actual MDX body; this step delivers the file with the right frontmatter and imports):
- Frontmatter: `title`, `description`, `template: splash`, `hero: { tagline: "" }` (minimal — our hero handles its own copy).
- Body: imports `HomeHero` and `NewsPanel` from `../../components/`, renders `<HomeHero />` then `<NewsPanel />`. Optional row of "featured" Tips/Skills/Glossary cards (F4) — Designer's call whether to include in MVP or defer.

**Dependencies:** Step 7 (components exist).

**Verification:**
- File exists.
- `grep "template: splash" site/src/content/docs/index.mdx` matches.
- `grep "HomeHero" site/src/content/docs/index.mdx` matches.
- `grep "NewsPanel" site/src/content/docs/index.mdx` matches.
- `cd site && npm run build` exits 0; `dist/index.html` exists, contains the words "NbgAiHub" in `<title>` (AC7) and the 9 sidebar labels (AC8).

**Effort:** S.

---

### Step 9 — Implement catalog pages under `src/pages/`

**Goal:** Implements R-5. Eight `.astro` pages, each wrapped in `<StarlightPage>` for Starlight chrome. Each catalog page calls `getCollection('<name>')` and renders with empty-state fallback (F9 / A8).

**Files created:**
- `site/src/pages/news/index.astro` (renders `NewsList` + `AudienceFilter`; AC9).
- `site/src/pages/news/[slug].astro` (dynamic per-item page; uses `getStaticPaths` returning `{ params: { slug: item.id } }` per investigation §2e; renders title, `AudienceBadge`, topic chips, source, "Read on source ↗" external link, `ai_summary` body; AC10 + F6).
- `site/src/pages/skills.astro` (card grid via `SkillCard` + `AudienceFilter`; empty-state fallback).
- `site/src/pages/tips.astro` (card grid; empty-state fallback).
- `site/src/pages/glossary.astro` (single page; renders each term with `id="<term-slug>"` anchor — AC15; loops through `getCollection('glossary')`; empty-state fallback).
- `site/src/pages/reference.astro` (hand-authored cheatsheet content inside `StarlightPage`; opinionated tone per CLAUDE.md).
- `site/src/pages/contribute.astro` (hand-authored PR contribution flow inside `StarlightPage`; opinionated tone).
- `site/src/pages/start-here/day-1.astro` (placeholder with 6 step headings + "coming soon" body — F8). Optionally `start-here/week-1.astro` as a deeper-placeholder ("Week 1 — coming soon.").

**Per-page common elements:**
- Imports `StarlightPage` from `@astrojs/starlight/components/StarlightPage.astro`.
- Wraps body in `<StarlightPage frontmatter={{ title: '<page name>' }}>…</StarlightPage>`.
- Empty-state copy is consistent: `"No items yet. See [Contribute](/contribute) for how to add one."` (A8).

**Dependencies:** Step 4 (collections), Step 7 (components).

**Verification:**
- `ls site/src/pages/**/*.astro` lists all 8+1 expected paths (the +1 is `start-here/week-1.astro` if added).
- `cd site && npm run build` exits 0; each of these built paths exists:
  - `dist/news/index.html` (AC9)
  - `dist/skills/index.html` (AC11)
  - `dist/tips/index.html` (AC11)
  - `dist/glossary/index.html` (AC11)
  - `dist/reference/index.html` (AC11)
  - `dist/contribute/index.html` (AC11)
  - `dist/start-here/day-1/index.html` (AC11)
- For each item in `news/published/`, `dist/news/<id>/index.html` exists (AC10). If `news/published/` is empty, `dist/news/index.html` shows "No items yet" copy (AC9).
- `grep 'id="' dist/glossary/index.html` returns 5 hits matching the seeded glossary slugs (AC15).

**Effort:** L.

---

### Step 10 — Seed sibling content folders

**Goal:** Create the source folders the site reads from, with minimal seed content per A15.

**Files created (at repo root, not under `site/`):**
- `skills/.gitkeep`
- `tips/.gitkeep`
- `glossary/claudemd.md`
- `glossary/mcp.md`
- `glossary/skill.md`
- `glossary/plugin.md`
- `glossary/agent.md`
- `journeys/day-1.md` (6 step headings + "coming soon" body per F8 / A15)

**Each glossary file's frontmatter** must satisfy the `glossary` Zod schema (12 canonical keys, where `type: 'glossary'`). 1-paragraph definition body. `deeper_link` may be `null` for MVP per the canonical shape.

**Dependencies:** Step 4 (schema must exist before content can validate against it).

**Verification:**
- `ls skills/.gitkeep tips/.gitkeep` returns both paths.
- `ls glossary/*.md` returns 5 paths.
- `ls journeys/day-1.md` returns the path.
- `cd site && npm run check` exits 0 (validates the seeded frontmatter against the schemas; AC18 negative case is verified separately).

**Effort:** S.

---

### Step 11 — Negative test: invalid frontmatter fails the build

**Goal:** AC18 — drop a deliberately malformed file, run `npm run check`, confirm named-file-and-field error, then remove the fixture.

**Files created (temporary):**
- `glossary/_invalid.md` — deliberately violates schema (e.g., omit `title:` or set `audience: "purple"`).

**Files removed (after verification):**
- `glossary/_invalid.md`.

**Dependencies:** Step 4 (schema), Step 10 (other seed content valid).

**Verification:**
- `cd site && npm run check` exits NON-zero. The error output names `_invalid.md` and the offending field. Capture stdout/stderr for the evidence trail in Phase 10.
- After removing the fixture, `cd site && npm run check` exits 0 again.

**Effort:** S.

---

### Step 12 — End-to-end production build + dev-server click-through

**Goal:** Final validation against AC5–AC11 + AC17 + DoD #5. Runs against the full populated workspace.

**Files created:** none.

**Dependencies:** Steps 1–11.

**Verification:**
- `cd site && npm install` — no new deprecated-direct-dep warnings (AC20).
- `cd site && npm run check` exits 0 (AC5).
- `cd site && npm run build` exits 0 (AC6); `ls dist/index.html` returns the path; `ls dist/pagefind/` returns a non-empty directory (AC17).
- `cd site && npm run dev` serves 200 on `http://localhost:4321/`; `<title>` contains "NbgAiHub" (AC7).
- Manual click-through: every one of the 9 sidebar entries opens its page without 404 (DoD #5).
- `grep -l "Home\\|Start Here\\|Day 1\\|Week 1\\|News\\|Skills\\|Tips & Tricks\\|Glossary\\|Reference\\|Contribute" dist/index.html` returns the path (AC8).

**Effort:** M.

---

### Step 13 — Documentation updates

**Goal:** DoD #7–#11. Update project state files so the audit trail is complete.

**Files modified:**
- `docs/design/project-design.md` — append a "Site architecture" section authored by the Designer (Phase 5 deliverable). Should incorporate R-6 (A9 rationale refresh) and R-7 (HMR caveat).
- `docs/design/project-functions.md` — append a "Site (plan-002-astro-starlight-site)" section with F1–F12 (delivered alongside this plan in the same commit — see §6 "Concurrent deliverable" below).
- `SCOPE.md` — flip the "Astro Starlight static site with beginner/advanced filter" row's status from `not started` to a final marker (the user chooses the exact emoji/text); update the demo-ability checklist for "Beginner/Advanced filter works across the site" once verified.
- `DECISIONS.md` — append a new entry only if any deviations from this plan were taken during implementation. If none, no new entry needed.
- `Issues - Pending Items.md` — add follow-ups: (a) confirm HMR catches cross-folder changes; widen Vite watcher if not. (b) revisit hosting decision (OQ1). (c) extract shared frontmatter schema package if drift becomes painful (A4).
- `site/README.md` — new file capturing the HMR caveat (R-7), the port assignment (4321), and the run commands (`npm run dev`, `npm run build`, `npm run check`, `npm run preview`).

**Dependencies:** Step 12 (validation completed, so docs reflect the as-built state).

**Verification:**
- `grep -l "Site architecture" docs/design/project-design.md` matches.
- `grep -l "plan-002-astro-starlight-site" docs/design/project-functions.md` matches.
- `grep -l "F1\\|F2\\|F3\\|F4\\|F5\\|F6\\|F7\\|F8\\|F9\\|F10\\|F11\\|F12" docs/design/project-functions.md` matches (12 F-entries for the site).
- `grep "Astro Starlight" SCOPE.md` row reflects the new status.
- `ls site/README.md` returns the path.

**Effort:** M.

---

## 3. Parallelization map

Identifies independent work units that Phase 6 (parallel Coders) can pick up simultaneously.

### Strict sequential — must run in order

```
Step 1 (scaffold)
  ↓
Step 2 (.nvmrc, port pin)
  ↓
Step 3 (scripts, tsconfig)
  ↓
Step 4 (content.config.ts)
  ↓
Step 5 (sidebar in astro.config.mjs)
  ↓
Step 6 (custom.css + customCss wire)
  ↓
[Step 7 fans out — see parallel block below]
  ↓
Step 8 (index.mdx)  ← depends on HomeHero + NewsPanel from Step 7
  ↓
Step 9 (catalog pages) ← depends on most of Step 7's components
  ↓
Step 10 (seed content)  ← can run earlier; see below
  ↓
Step 11 (negative AC18 test)
  ↓
Step 12 (E2E validation)
  ↓
Step 13 (docs)
```

### Parallelizable within Step 7 (the 6 components)

All 6 components are independent files. Phase 6 can dispatch one Coder per component, with the Designer's per-component contracts in hand:

| Worker A | Worker B | Worker C |
|---|---|---|
| `HomeHero.astro` | `NewsPanel.astro` | `NewsList.astro` |
| `AudienceBadge.astro` | `SkillCard.astro` | `AudienceFilter.astro` |

Cross-component coupling is minimal:
- `NewsPanel` and `NewsList` both call `getCollection('news')`. Recommendation per investigation §"Implementation Considerations": extract a `getRecentNews(limit?: number)` helper into `site/src/lib/news.ts`. If the Designer specifies this helper, **add an implicit Step 7a** that creates `site/src/lib/news.ts` *before* `NewsPanel` and `NewsList` start. Otherwise both components inline the same fetch logic (acceptable for MVP).
- `AudienceBadge` is consumed by `NewsList`, `NewsPanel`, the dynamic news per-item page, and `SkillCard`. It must land before any of those can compile clean — but since all six components are in the same Step 7, the parallel workers can finish in any order as long as Step 7 *as a whole* completes before Step 8 starts.

### Parallelizable across step boundaries

- **Step 10 (seed content)** can run as early as Step 4 (once the schemas exist). It does not need Steps 5–9. Recommendation: have one Coder authoring the 5 glossary files + `journeys/day-1.md` content *while* another runs Steps 5–7. This shortens wall-clock time.
- **Step 13 (docs)** depends on Step 12 finishing for accuracy of status flips, but the `site/README.md` portion (HMR caveat, port, run commands) can be drafted alongside Step 1–2 and refined later. The `project-functions.md` section is delivered *with this plan file* in the same commit (see §6 below) — that portion is done now.

### Critical-path summary

The critical path runs **Step 1 → 2 → 3 → 4 → 5 → 6 → 7 → 9 → 12 → 13** (Step 8 is small and on its own sub-branch from 7). Total estimated effort: ~1.5 days of focused work for a single coder; ~1 day with the Step 7 parallelization.

---

## 4. AC coverage table

Every AC1–AC20 from the refined request maps to at least one plan step. Evidence is the artifact/command that proves the AC at verification time.

| AC | Covered by step(s) | Evidence at verification time |
|----|---|---|
| AC1 | Step 1, Step 2 | `grep -E '"astro": "\\^6' site/package.json` AND `grep -E '"@astrojs/starlight": "\\^0\\.39' site/package.json` both match. |
| AC2 | Step 5 | 9 individual grep matches for each label in `site/astro.config.mjs`: Home, Start Here, Day 1, Week 1, News, Skills, Tips & Tricks, Glossary, Reference, Contribute. |
| AC3 | Step 4 | `grep -E "defineCollection\\(" site/src/content.config.ts` returns 5 hits; file content shows each collection's `glob({...base: '../<name>'})` loader. |
| AC4 | Step 4 | grep for each of: `title`, `audience`, `topics`, `internal`, `authored`, `last_reviewed`, `external_link`, `deeper_link`, `ai_summary`, `type`, `source`, `fingerprint`, `hero_image` in the news schema block of `site/src/content.config.ts`. |
| AC5 | Step 3, Step 12 | `cd site && npm run check` exits 0 (which runs `astro sync && astro check`). |
| AC6 | Step 3, Step 12 | `cd site && npm run build` exits 0; `ls dist/index.html` returns the path. |
| AC7 | Step 12 | `cd site && npm run dev` then `curl -sI http://localhost:4321/` returns 200; `curl -s http://localhost:4321/ \| grep -i '<title>'` contains "NbgAiHub". |
| AC8 | Step 5, Step 8 | `grep -E "Home\|Start Here\|Day 1\|Week 1\|News\|Skills\|Tips & Tricks\|Glossary\|Reference\|Contribute" dist/index.html` returns 9 matches (one per label). |
| AC9 | Step 9 | `ls dist/news/index.html` exists. If `news/published/` has items, the file contains card markup; if empty, contains "No items yet" copy. Verify both branches across runs. |
| AC10 | Step 9 | For each `news/published/*.md`, `ls dist/news/<id>/index.html` exists (where `<id>` is the date-stripped slug). If folder empty, no `dist/news/<id>/` directories — acceptable. |
| AC11 | Step 9 | `ls dist/skills/index.html dist/tips/index.html dist/glossary/index.html dist/reference/index.html dist/contribute/index.html dist/start-here/day-1/index.html` returns all six paths. |
| AC12 | Step 7 | `ls site/src/components/HomeHero.astro site/src/components/NewsPanel.astro site/src/components/NewsList.astro site/src/components/AudienceBadge.astro site/src/components/SkillCard.astro site/src/components/AudienceFilter.astro` returns all 6. |
| AC13 | Step 6, Step 7 | `grep -E "#0a7\|#e60\|#08c" site/src/styles/custom.css` returns 3 hits; visual inspection of `AudienceBadge.astro` confirms class names map to the right color rules. |
| AC14 | Step 7 | `grep -E "data-audience\|audience-hidden\|localStorage" site/src/components/AudienceFilter.astro` returns all three matches; `<script>` block reads checkbox state and toggles class. |
| AC15 | Step 9, Step 10 | `grep -E 'id="(claudemd\|mcp\|skill\|plugin\|agent)"' dist/glossary/index.html` returns 5 matches. |
| AC16 | Step 3 (deferred) | A9 defers component tests for MVP; lint via `astro check` is the standin. AC16 reads "if configured" — for MVP, **lint is not configured** (no ESLint setup for `site/`). Document this gap in the Phase 10 evidence package: AC16 "vacuously satisfied — no lint script configured per A9 + MVP scope decision; `astro check` covers the static-analysis surface." |
| AC17 | Step 12 | `ls dist/pagefind/` returns a non-empty directory after `npm run build`. |
| AC18 | Step 3, Step 11 | The hardened scripts (R-3) chain `astro check` into both `npm run check` and `npm run build`. Step 11's negative test (drop `_invalid.md`) produces a named-file-and-field error; capture stderr as evidence. |
| AC19 | Step 4 | News schema's `hero_image: z.string().url().optional()`. A round-trip test: (a) a news item without `hero_image` builds clean; (b) adding `hero_image: "https://example.com/img.png"` to one news file also builds clean. Both can be verified in Step 12 or in a Phase 10 fixture pass. |
| AC20 | Step 1, Step 12 | `cd site && npm install` log shows zero deprecated-direct-dep warnings on `astro`, `@astrojs/starlight`, and any other direct deps. (Transitive deprecations are out of scope per the AC's "direct" qualifier.) |

---

## 5. Risks and mitigations

Concrete risks for *this plan's execution* (not the overall product design — those live in the investigation §"Risks and mitigations"). Each tied to a step.

| # | Risk | Likelihood | Severity | Tied to step | Mitigation |
|---|---|---|---|---|---|
| P-R1 | Schema drift between `pipeline/src/frontmatter.ts` and `site/src/content.config.ts` over time (A4 trade-off). | Medium (multi-month timeline) | Medium | Step 4 | Out of scope for this plan; tracked in `Issues - Pending Items.md` per Step 13 as "extract shared schema package if drift becomes painful." Mitigation in this plan: copy the canonical 12 keys verbatim from DECISIONS.md "Shared content shape" + the news-specific extras from `pipeline/src/types.ts:NewsFrontmatter`. |
| P-R2 | HMR misses changes to `../news/published/*.md` during dev. | Medium | Low | Step 1, Step 12, Step 13 | R-7. Document in `site/README.md`. Workaround: restart `npm run dev`. Optional widening of Vite watcher is a follow-up, not MVP blocker. |
| P-R3 | `astro check` silently exits on schema errors (known wart) and Phase 10 verification falsely shows AC18 passing. | Low-medium | Medium | Step 3, Step 11 | R-3. `"check": "astro sync && astro check"` runs sync first so violations surface deterministically. Step 11's negative test explicitly validates this. |
| P-R4 | Empty collection folder (e.g., `skills/` with only `.gitkeep`) causes Astro to error at `getCollection('skills')`. | Low (per investigation §10c, Astro 5/6 treats as empty array) | Low | Step 9, Step 10 | The `items.length === 0` empty-state branch in each catalog page handles this. Verify on first build of Step 12; if it errors, add a `try { … } catch { return [] }` guard around the `getCollection` call. |
| P-R5 | `generateId` callback regex strips date but the resulting slug collides (two different news files date-stripped to the same kebab-case). | Low | Medium | Step 4 | Pipeline's `slug.ts:resolveSlugCollision` already appends a numeric suffix (`-2`, `-3`, …) at write time, so the filename collision is resolved upstream. If a collision still slips through, `getStaticPaths` will throw a duplicate-route error at build — caller renames one of the files. Document in `Issues - Pending Items.md` as a near-zero edge case. |
| P-R6 | `noUncheckedIndexedAccess: true` (NF2) causes TS errors on `someCollection[0]`-style access in components. | Medium (will hit this once) | Low | Step 7 | Designer specifies `.at(0)`, length guards, or destructuring in `.map()`. Coders apply per spec. Investigation §10f flags this. |
| P-R7 | Step 7 components compile but blow up at runtime due to missing schema-required fields in seed content (Step 10). | Low-medium | Low | Step 7, Step 10 | Step 10's seed content must satisfy the schemas authored in Step 4. Order matters: Step 4 → Step 10 → Step 7's runtime smoke. Step 11's positive build pass on the full seed set catches this. |
| P-R8 | Port 4321 is occupied by another Claude session in another project. | Low (per CLAUDE.md "ports often collide") | Low | Step 2, Step 12 | Per CLAUDE.md → Ports global rule: `lsof -i :4321`; if occupied, switch to 4322 via `npm run dev -- --port 4322`. **Never kill another process.** Don't edit `astro.config.mjs` to a different port — the config-declared port is the *default*; the CLI flag is the escape hatch. |
| P-R9 | The Starlight scaffold template emits the older `src/content/config.ts` path instead of the Astro-5+ `src/content.config.ts` path. | Low (depends on template version on the day of scaffold) | Low | Step 1, Step 4 | Step 1 verification includes confirming the file path. If the scaffold emitted the older path, rename to `src/content.config.ts` before Step 4 begins. (Astro 6 supports both for compatibility, but project convention is the dotted form per investigation §2a and refined-request F1/F2.) |
| P-R10 | DoD #2 ("no new deprecated direct-dep warnings") fails because Starlight scaffold installs a peer with a deprecation notice we can't suppress. | Low | Low | Step 1, Step 12 | If it fires, capture the warning text in Phase 10 evidence, file the package as an `Issues - Pending Items.md` follow-up, and accept it for MVP. AC20 says "direct dependencies"; transitive deprecations are out of scope. |

---

## 6. Ambiguities for user input

**None — proceed.**

The refined request has 20 falsifiable ACs, 18 Assumptions, and 12 DoD items. The investigation resolved the one design-level ambiguity (Astro version) and its supersession is recorded in DECISIONS.md and applied in the refined request. The three Open Questions in the refined request (hosting, branding, skill catalog data model) are all explicitly deferred and do not block this plan.

If the Designer or Coders encounter a real ambiguity mid-implementation, the protocol is: stop, append a question to `Issues - Pending Items.md`, ping the user. Do not invent answers.

---

## Concurrent deliverable: `docs/design/project-functions.md`

This plan ships alongside an append to `docs/design/project-functions.md` capturing F1–F12 for the site workspace. The plan does not duplicate that content — it references it. The append happens in the same commit as this plan file's creation. Step 13 above re-confirms it as a post-build doc step, but the *content* is delivered now.

---

**End of plan-002-astro-starlight-site.md.**
