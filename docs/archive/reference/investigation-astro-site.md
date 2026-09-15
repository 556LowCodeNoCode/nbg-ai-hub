# Investigation: Astro Starlight Site for NbgAiHub

## Executive Summary

The locked architecture (Astro + Starlight + Pagefind, `glob()` loader pointing at sibling repo folders, declarative sidebar in `astro.config.mjs`, custom components on a `splash` index, vanilla client-side audience filter) is sound. Every piece of the design is well-supported by the current upstream releases and by published reference sites (Cloudflare, Tauri, Biome).

**One decision needs to be made up front before the implementer starts**, and it is not relitigating the SSG choice — it is choosing which Astro major to install:

- **Astro 6 (stable since 2026-03-10) + Starlight 0.38/0.39** is the upstream-current path. Starlight 0.38 explicitly dropped Astro 5 support; Starlight 0.39 (2026-05-07) is the latest. This is what `npm install astro @astrojs/starlight` will install today by default.
- **Astro 5.x + Starlight 0.37.x** is still installable by pinning, but it is a one-version-behind path and Starlight 0.37 is in maintenance only.

The refined request (A1, A2, NF1) currently reads **"Astro 5.x"** and **"Starlight latest 0.x"** — these two are now mutually exclusive. AC1 says `astro ≥5.x`. The cleanest fix is to update the spec to `astro ^6.x + @astrojs/starlight ^0.39.x` and proceed; the architecture is identical, only the major number changes. **Recommendation: install Astro 6 + Starlight 0.39 and amend the refined request + DECISIONS.md to record the bump.** Detail and migration impact analyzed in §1 below.

Everything else in the spec stands. The unusual `base: '../news/published'` pattern works (Astro resolves `base` relative to the project root, which is `site/`). The 12-key Zod schema, declarative 9-entry sidebar, MDX-based custom homepage, and Pagefind-by-default search all map cleanly to the canonical Astro/Starlight idioms. The audience filter can be a single inline `<script>` in `AudienceFilter.astro` with no view-transition complications because Starlight does **not** enable `<ClientRouter />` by default. Component testing (A9) deserves a fresh look — Vitest + Astro Container API is now mature — but deferring it for MVP remains defensible.

---

## Context

- **What was investigated:** confirmation that the architecture locked in `DECISIONS.md` (2026-05-18, "Astro Starlight as SSG") and detailed in `docs/refined-requests/astro-starlight-site.md` is still the right choice in mid-2026, plus the canonical syntax for each piece.
- **Key constraints:** site lives at `site/`; content lives at repo root (`../news/published/`, etc.); content is read-only; no deployment; dev server on port 4321; TS strict; ESM; Node 22.
- **Refined request:** `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/refined-requests/astro-starlight-site.md` (20 ACs, 18 Assumptions, 12 DoD items).
- **Locked decisions not under review:** Astro Starlight as SSG; shared 12-key content shape; news + hero_image as forward-compat; hybrid glossary.

---

## Per-area findings

### 1. Library versions in mid-2026 — Astro 6, not Astro 5

**This is the biggest finding.** The refined request was written assuming "Astro 5.x stable, Starlight latest 0.x" are compatible. That stopped being true on **2026-03-10** when Astro 6.0 went stable, and on the next Starlight cycle when Starlight 0.38 dropped Astro 5 support.

**Current state (2026-05-18):**

| Package | Latest stable | Astro peer dep |
|---|---|---|
| `astro` | **6.x** (6.0 GA 2026-03-10) | — |
| `@astrojs/starlight` | **0.39** (2026-05-07) | `astro ^6.x` |
| `@astrojs/starlight` 0.38 | 2026-Mar | `astro ^6.x` (drops 5) |
| `@astrojs/starlight` 0.37.x | 2026-Feb (last 5-compatible) | `astro ^5.5.0` |

**Astro 6 vs Astro 5 — what changed that affects this build:**

- **Legacy content collections removed.** A collection defined without a `loader` no longer silently file-falls-back. Every collection must declare `loader: glob({...})`. We are already doing this — **no impact**.
- **`z` from `astro:content` deprecated** in favour of `astro/zod` (Zod 4 under the hood, was Zod 3 in Astro 5). Two-line difference at the top of `content.config.ts`. **Trivial impact.**
- **`Astro.glob()` removed.** We never planned to use it. **No impact.**
- **`<ViewTransitions />` component removed**, replaced by `<ClientRouter />`. We are not opting into view transitions. **No impact.**
- **Node 22 required** (Astro 6 drops Node 18/20). Already aligned with `pipeline/.nvmrc`. **No impact.**
- **Vite 7** (up from Vite 5). All internal; affects only HMR and build perf positively.
- **Built-in Fonts API, live content collections, CSP API** — new features we don't need but won't hurt us.

**Recommendation:** Install Astro 6 + Starlight 0.39. Amend the refined request (A1 → `astro ^6.x`; A2 → `@astrojs/starlight ^0.39.x`; AC1 → `astro ≥6.x`; AC20 verification stays the same). Add a DECISIONS.md entry: *"2026-05-18 — Astro 6 instead of Astro 5 (supersedes refined-request A1)"* with the rationale "Astro 6 GA'd 2026-03-10; Starlight 0.38+ requires Astro 6; pinning Astro 5 would mean shipping on Starlight 0.37, which is now in maintenance-only. Zero migration cost since we are greenfield."

**If we ignore this and pin Astro 5 anyway:** site will work, but `npm install astro@^5 @astrojs/starlight@^0.37` is one major behind upstream from day one and we eat a forced migration the next time we want a Starlight 0.39+ feature (e.g., the improved autogenerated-sidebar flexibility shipped in 0.39).

Sources: [Astro 6.0 release](https://astro.build/blog/astro-6/), [Astro 6 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v6/), [Starlight 0.39 release notes](https://astro.build/blog/starlight-039/), [Starlight changelog (Astro 6 support commit)](https://github.com/withastro/starlight/commit/0d2e7ed74a604b028fcab0c81b4c35c0c9365343).

---

### 2. Content collections + `glob()` loader patterns

**Confirmed: the spec's `glob({ pattern: '*.md', base: '../news/published' })` shape is correct.** Two refinements worth applying:

#### 2a. Config file location

Astro 5 already moved the config from `src/content/config.ts` to `src/content.config.ts` (note: dot, not slash). Astro 6 keeps this. The refined request uses `content.config.ts` (F1, F2) — correct.

#### 2b. Zod import

In Astro 6, `z` should come from `astro/zod`, not `astro:content`. Both work in 0.39 + Astro 6 but `astro:content` re-export of Zod is deprecated.

```ts
// site/src/content.config.ts
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'   // Astro 6: prefer this over the astro:content re-export

const news = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: '../news/published',           // relative to site/ (project root)
    generateId: ({ entry }) => {
      // 2026-05-18-claude-code-helped-me.md → claude-code-helped-me
      const name = entry.replace(/\.[^.]+$/, '')
      return name.replace(/^\d{4}-\d{2}-\d{2}-/, '')
    },
  }),
  schema: z.object({
    type: z.literal('news'),
    title: z.string(),
    audience: z.enum(['beginner', 'advanced', 'both']),
    topics: z.array(z.string()),
    internal: z.boolean(),
    authored: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    last_reviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    external_link: z.string().url().nullable(),
    deeper_link: z.string().url().nullable(),
    ai_summary: z.string(),
    source: z.string(),
    fingerprint: z.string(),
    hero_image: z.string().url().optional(),    // forward-compat
  }),
})
// + skills, tips, glossary, journeys with their own schemas
export const collections = { news, skills, tips, glossary, journeys }
```

#### 2c. `base:` pointing outside `src/`

**Fully supported.** `base` is resolved relative to the project root (i.e., `site/`), so `../news/published` correctly points at `<repo>/news/published`. The Astro docs explicitly call out: *"You can store content outside of the src/ directory to simplify further."* This is the canonical pattern. **No gotcha here** — it's the same machinery sites like the Astro docs site use.

#### 2d. Date prefix → clean slug

The refined request A5 says `2026-05-18-claude-code-helped-me.md → /news/claude-code-helped-me`. The canonical way to do this in Astro 5/6 is a `generateId` callback on the `glob()` loader (shown above). This is cleaner than parsing the prefix in `getStaticPaths` because it makes `entry.id` itself URL-clean — so `params: { slug: post.id }` Just Works downstream.

#### 2e. Dynamic route for `/news/<slug>`

In Astro 5/6 the slug API became `id`. Two equivalent options:

- **Option A (preferred):** `src/pages/news/[slug].astro` with `params: { slug: post.id }` in `getStaticPaths`. This keeps the URL param name as `slug` (intuitive) while internally referencing `post.id`.
- **Option B:** Rename to `src/pages/news/[id].astro` and use `params: { id: post.id }`. Closer to current Astro idiom but feels more internal.

Both are documented and supported. The refined request F6 ("Auto-generated by Astro from the news collection") is satisfied by either. Recommend Option A — keeps the URL conceptually as a "slug".

```astro
---
// site/src/pages/news/[slug].astro
import { getCollection, render } from 'astro:content'
import StarlightPage from '@astrojs/starlight/components/StarlightPage.astro'
import AudienceBadge from '../../components/AudienceBadge.astro'

export async function getStaticPaths() {
  const items = await getCollection('news')
  return items.map((item) => ({
    params: { slug: item.id },
    props: { item },
  }))
}

const { item } = Astro.props
const { Content } = await render(item)
---
<StarlightPage frontmatter={{ title: item.data.title }}>
  <AudienceBadge audience={item.data.audience} />
  <!-- topics, source, external link -->
  <Content />
</StarlightPage>
```

Note: in Astro 5/6 the rendering API is now `import { render } from 'astro:content'` then `await render(item)`, not the old `await item.render()`.

Sources: [Astro Content Loader API reference](https://docs.astro.build/en/reference/content-loader-reference/), [Astro 5.0 release post](https://astro.build/blog/astro-5/), [Migrating content collections 4→5 (Chen Hui Jing)](https://chenhuijing.com/blog/migrating-content-collections-from-astro-4-to-5/).

---

### 3. Starlight sidebar configuration

**Confirmed: declarative shape in `astro.config.mjs` is canonical and well-documented.**

A sidebar entry is one of:
- `{ label, link }` — external or absolute URL
- `{ label, slug }` — internal page in `src/content/docs/`
- `{ label, items: [...] }` — collapsible group (with optional `collapsed: true`)
- `{ autogenerate: { directory: 'foo' } }` — filesystem-based (we don't need this)

For the refined-request F3 / A11 nine-entry sidebar:

```js
// site/astro.config.mjs
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  server: { port: 4321 },
  integrations: [
    starlight({
      title: 'NbgAiHub',
      sidebar: [
        { label: 'Home', link: '/' },
        {
          label: 'Start Here',
          items: [
            { label: 'Day 1', link: '/start-here/day-1/' },
            { label: 'Week 1', link: '/start-here/week-1/' },  // placeholder ok
          ],
        },
        { label: 'News', link: '/news/' },
        { label: 'Skills', link: '/skills/' },
        { label: 'Tips & Tricks', link: '/tips/' },
        { label: 'Glossary', link: '/glossary/' },
        { label: 'Reference', link: '/reference/' },
        { label: 'Contribute', link: '/contribute/' },
      ],
    }),
  ],
})
```

**Notes:**
- Use `link:` for routes generated by `.astro` pages under `src/pages/` (like `/news`, `/news/<slug>`). Use `slug:` for entries that map to `.md`/`.mdx` files under `src/content/docs/`. Mixing is fine.
- Starlight 0.39's new flexibility (auto-generated entries can sit alongside manual entries inside one group's `items` array) is nice-to-have but **we do not need it** for the 9-entry hard-coded sidebar.
- `label:` is the canonical way to name an entry. No "icons" property at the sidebar level in 0.39 — Starlight uses badges, not icons, on sidebar items. If we ever want an icon for "News" we'd add it to the page header, not the sidebar entry. **AC2 stays as just text labels** — no scope change needed.
- Trailing slashes on `link:` values match Starlight's default `trailingSlash` behaviour. Don't drop them.

Sources: [Starlight sidebar guide](https://starlight.astro.build/guides/sidebar/), [Starlight config reference](https://starlight.astro.build/reference/configuration/), [Starlight 0.39 release](https://astro.build/blog/starlight-039/).

---

### 4. Custom Astro components inside Starlight

**Confirmed: yes, `.astro` components under `src/components/` import into `.mdx` pages cleanly. The custom-homepage pattern is well-supported.**

Three idioms in play:

#### 4a. Components in `src/components/`

Standard Astro layout. Components are `.astro` files. Import path from an `.mdx` page in `src/content/docs/` is `../../components/HomeHero.astro` (two levels up because the page is `src/content/docs/index.mdx`).

```mdx
---
# site/src/content/docs/index.mdx
title: NbgAiHub — what I wish I knew a year ago
description: A field manual for newcomers to Claude Code.
template: splash      # full-width, no sidebar/TOC chrome
hero:
  tagline: ""         # we render our own hero, so this stays minimal
---
import HomeHero from '../../components/HomeHero.astro'
import NewsPanel from '../../components/NewsPanel.astro'

<HomeHero />
<NewsPanel />
```

#### 4b. Why `template: splash`

The `splash` template removes the sidebar and TOC from the page chrome, giving the homepage a landing-page feel. Real-world reference: Tauri docs uses exactly this pattern (`src/content/docs/index.mdx` with `template: splash`, then imports a custom `<Hero />`).

#### 4c. `index.mdx`, not `index.md`

**Critical** — custom-component imports require MDX, not plain Markdown. AC1/F4 are silent on this; the implementer must use `.mdx` for the homepage. Starlight ships MDX support out of the box (the `@astrojs/mdx` integration is bundled into Starlight — see §11 below).

#### 4d. Not-content class to avoid Starlight prose styling

By default Starlight applies prose styles (margins, link colors) to anything inside the content area. If `HomeHero` has its own layout we don't want Starlight's `<p>`-margin baseline messing with it, add `class="not-content"` to the component's root element. Tiny detail that prevents a common "why is my hero squished" question.

#### 4e. Other catalog pages

Pages like `/skills`, `/tips`, `/news` (the index) are best implemented as `.astro` pages under `src/pages/`, not as MDX under `src/content/docs/`, because they need to call `getCollection()` and render a card grid programmatically. Use `StarlightPage` wrapper:

```astro
---
// site/src/pages/skills.astro
import { getCollection } from 'astro:content'
import StarlightPage from '@astrojs/starlight/components/StarlightPage.astro'
import SkillCard from '../components/SkillCard.astro'

const skills = await getCollection('skills')
---
<StarlightPage frontmatter={{ title: 'Skills' }}>
  {skills.length === 0 ? (
    <p>No items yet. See <a href="/contribute">Contribute</a> for how to add one.</p>
  ) : (
    <div class="card-grid">
      {skills.map((s) => <SkillCard skill={s} />)}
    </div>
  )}
</StarlightPage>
```

`StarlightPage` is the canonical wrapper that gives a custom Astro page the Starlight chrome (sidebar, header search, footer). Without it, the page renders bare. This is the pattern documented in the [Starlight Pages guide](https://starlight.astro.build/guides/pages/).

Sources: [Starlight overriding components](https://starlight.astro.build/guides/overriding-components/), [Starlight pages guide](https://starlight.astro.build/guides/pages/), [Starlight frontmatter reference](https://starlight.astro.build/reference/frontmatter/), [Tauri docs homepage pattern](https://deepwiki.com/tauri-apps/tauri-docs/4.1-getting-started-section).

---

### 5. Client-side audience filter

**Confirmed: a single vanilla `<script>` block in `AudienceFilter.astro` is the right pattern. No framework, no client island, no hydration.**

The mechanism (refined-request F10, A12):
1. Render three checkboxes (Beginner / Advanced / Both), all checked.
2. Render cards/list items with `data-audience="beginner"` (or `advanced` / `both`).
3. On any checkbox change, hide items whose `data-audience` is not in the checked set (toggle a CSS class like `audience-hidden`).
4. Persist state to `localStorage` (`nbgaihub.audience` or similar).
5. On `DOMContentLoaded`, restore state and re-apply.

Canonical shape:

```astro
---
// site/src/components/AudienceFilter.astro
---
<form class="audience-filter not-content">
  <label><input type="checkbox" value="beginner" checked /> Beginner</label>
  <label><input type="checkbox" value="advanced" checked /> Advanced</label>
  <label><input type="checkbox" value="both" checked /> Both</label>
</form>

<script>
  const KEY = 'nbgaihub.audience'
  const form = document.querySelector('.audience-filter')
  if (form) {
    const boxes = form.querySelectorAll('input[type="checkbox"]')

    function apply() {
      const visible = new Set(
        Array.from(boxes).filter((b) => b.checked).map((b) => b.value)
      )
      document.querySelectorAll('[data-audience]').forEach((el) => {
        const a = el.getAttribute('data-audience') ?? 'both'
        el.classList.toggle('audience-hidden', !visible.has(a))
      })
      localStorage.setItem(KEY, JSON.stringify([...visible]))
    }

    // Restore
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? '["beginner","advanced","both"]')
      boxes.forEach((b) => { b.checked = saved.includes(b.value) })
    } catch { /* ignore */ }

    apply()
    boxes.forEach((b) => b.addEventListener('change', apply))
  }
</script>

<style>
  .audience-filter { display: flex; gap: 1rem; margin-block: 1rem; }
  :global(.audience-hidden) { display: none !important; }
</style>
```

#### 5a. View-transition pitfall — N/A here

The big risk with vanilla scripts in Astro is when `<ClientRouter />` (view transitions) is enabled: scripts don't re-run on soft navigations, and `localStorage`-derived DOM state can desync. **Starlight does NOT enable `<ClientRouter />` by default.** Every link is a full page load, every script runs from scratch on every navigation. So:
- `DOMContentLoaded`-style script execution is reliable.
- `localStorage` read on every page load.
- No need for `astro:before-swap` or `astro:page-load` event listeners.

If we later opt into view transitions (e.g., via `astro-vtbot`), we'd need to switch to `astro:page-load`. That's a future-only concern; out of MVP scope.

#### 5b. SSR / hydration gotcha — N/A

Astro is SSG here. The `<script>` block is plain ES module shipped to the browser. No hydration, no client islands. The HTML for items with `data-audience` attributes is generated at build time. On first paint, all items are visible (default checked state); the script then immediately re-applies `localStorage` state. Brief FOUC possible only if the user has previously hidden audiences and the script hasn't run yet — usually invisible because scripts at the end of `<body>` execute before paint completes. If FOUC bothers us, we can move the restore-from-localStorage portion to an inline blocking `<script>` in `<head>` of the layout, but that's a polish issue, not a correctness one. **Defer.**

Sources: [Astro view transitions guide](https://docs.astro.build/en/guides/view-transitions/), [Bag of Tricks: updating state after transitions](https://events-3bg.pages.dev/jotter/astro/scripts/), [Starlight ClientRouter discussion #2823](https://github.com/withastro/starlight/discussions/2823) (confirms opt-in only).

---

### 6. Pagefind

**Confirmed: Starlight ships Pagefind enabled by default. No config needed.**

- Pagefind builds its index during `astro build` (the Starlight integration's `astro:build:done` hook invokes Pagefind on `dist/`).
- The header search bar renders automatically.
- In `dev` mode, the search button shows a warning ("search only works in production build") — that's expected; AC11 / AC17 are about the built output.
- AC17 (`dist/pagefind/` exists after build) will pass automatically.

**Knobs we *might* set:**
- `pagefind: false` in `astro.config.mjs` to disable — **don't.**
- Per-page `pagefind: false` in frontmatter to exclude a specific page — **don't need.**
- Wrap content in `<div data-pagefind-ignore>` to skip indexing a section — **don't need for MVP.** Could be useful later for boilerplate footers.

**Frontmatter field indexing:** Pagefind indexes the rendered HTML body of each page. Frontmatter fields like `topics:` and `audience:` are *not* automatically searchable unless they appear in the rendered page. This is actually fine for our use case — users search the visible content, not the metadata. If a power user wants to search by audience, the audience filter handles that. **No action needed.**

Sources: [Starlight site search guide](https://starlight.astro.build/guides/site-search/), [Pagefind official docs](https://pagefind.app/).

---

### 7. `astro check` strictness

**Confirmed: `astro check` exits non-zero on TS errors *and* on content collection schema validation errors, but with one known wart.**

What it checks (under the hood, `astro check` first runs `astro sync`, then runs the type-checker):
1. **`astro sync`** parses every content file, validates frontmatter against the collection's Zod schema, and generates `.astro/types.d.ts`. **Schema violations surface here with named file + field errors** — this is what AC18 needs.
2. **`@astrojs/check`** runs `tsc --noEmit` style checking on all `.astro`/`.ts` files using the generated types. TypeScript errors fail the command.
3. **MDX content body** (JSX/imports) is *compiled* by the MDX integration during build but not separately type-checked. Frontmatter on MDX files *is* schema-validated like Markdown.

**Known wart (worth knowing, not blocking):** [language-tools discussion #982](https://github.com/withastro/language-tools/discussions/982) reports that `astro check` has occasionally silently exited on schema errors instead of reporting them — workaround is to run `astro sync` first. We can mitigate by chaining: `"check": "astro sync && astro check"` in `package.json`. **Recommend doing this** — single-character cost, eliminates the silent-exit risk for AC18.

Also worth wiring per Astro docs convention: change the `build` script to `astro check && astro build` so that schema/TS errors fail the build (NF8). The official docs recommend exactly this. **Spec AC18 is satisfied by both `astro check` and `npm run build` once the build script is `astro check && astro build`.**

Sources: [Astro CLI reference](https://docs.astro.build/en/reference/cli-reference/), [Astro TypeScript guide](https://docs.astro.build/en/guides/typescript/), [language-tools discussion #982](https://github.com/withastro/language-tools/discussions/982).

---

### 8. Component testing in 2026 — A9 sanity check

**Honest answer: A9 ("no component tests in MVP") is still defensible, but the technical premise that "component testing in Astro is relatively immature in 2026" is no longer accurate.**

State of the art (mid-2026):
- **Vitest 4.x + Astro Container API via `getViteConfig()`** is officially documented in Astro's testing guide, stable, and recommended.
- **`vitest-browser-astro`** by Matt Kane (Astro core team member, repo `ascorbic/vitest-browser-astro`) gives real-browser rendering of Astro components with `vitest` 4.x. Production-ready.
- Astro itself ships with `getViteConfig()` helper specifically for this purpose.

So *if* we wanted to test, say, `AudienceFilter`'s show/hide logic, or `AudienceBadge`'s color mapping, the tooling exists and isn't fiddly. Pipeline already uses Vitest 4.x — zero ecosystem friction.

**Why deferring is still defensible:**
1. The site's behavioural surface area is tiny — most components are pure mapping (`SkillCard` renders a skill object as a card; `AudienceBadge` renders a class+label).
2. `astro check` + Zod schemas catch the high-value class of bugs (frontmatter shape, type drift).
3. The audience filter — the one component with actual logic — is most usefully tested as an e2e click-through (Playwright), not as a server-rendered snapshot.
4. Building the site is the long pole; tests can be a follow-up sprint without rework.

**Recommendation:** Update A9's *rationale* to drop the "immature in 2026" phrase (factually outdated) but keep the deferral. New phrasing: *"Component-level tests deferred to a follow-up: pipeline tests cover the frontmatter shape, `astro check` catches schema drift, and the rendering surface is mostly pure mapping. Vitest + Astro Container API (or `vitest-browser-astro`) is available when we want it."*

Sources: [Astro testing guide](https://docs.astro.build/en/guides/testing/), [vitest-browser-astro](https://github.com/ascorbic/vitest-browser-astro/), [Vitest 4.x astrojs/check release](https://docs.astro.build/en/guides/testing/).

---

### 9. Port pinning in `astro.config.mjs`

**Confirmed: `server: { port: 4321 }` in `astro.config.mjs` is the canonical way.**

```js
export default defineConfig({
  server: { port: 4321, host: false },   // host: false = localhost only
  // ...
})
```

`--port` CLI flag overrides this. Per CLAUDE.md global port rules, the implementer should `lsof -i :4321` before `npm run dev`; if occupied, *switch port via the CLI flag* (`npm run dev -- --port 4322`) rather than editing `astro.config.mjs` (which would be a config change the next developer wouldn't expect). The config-file value is the *declared* port; the CLI flag is the *escape hatch* for collisions.

NF7 / AC7 / DoD #5 all pass with this single line.

Sources: [Astro configuration reference](https://docs.astro.build/en/reference/configuration-reference/), [Astro CLI reference](https://docs.astro.build/en/reference/cli-reference/).

---

### 10. Known issues / pitfalls in mid-2026

#### 10a. Cross-folder content loading (`base: '../news/published'`)

**Works, but with two operational caveats:**

1. **`astro dev` does not always hot-reload files outside `site/`.** Astro's file watcher watches the project root (`site/`) and `src/`. Files under `../news/published/` may or may not trigger a rebuild depending on the Vite watcher config. **Mitigation:** if HMR misses content changes during development, the implementer can either (a) restart `dev`, or (b) widen the watcher with `vite: { server: { watch: { ignored: ['!../news/published/**'] } } }` in `astro.config.mjs`. **Not blocking for MVP** — content authoring happens via PR/file write, not live editing in the dev server. Worth a note in `Issues - Pending Items.md` as "follow-up: confirm HMR catches `../news/published/` changes; widen watcher if not."
2. **TypeScript `tsconfig.json` `include` should not need to mention `../news/`** because Astro's content layer reads those files via the loader, not via TS imports. **No impact.**

#### 10b. Starlight homepage at `src/content/docs/index.mdx` vs `src/pages/index.astro`

If the homepage is at `src/pages/index.astro`, the sidebar's `{ label: 'Home', link: '/' }` works but the page must wrap content in `StarlightPage` to get Starlight chrome. **For the splash hero use case described in F4, using `src/content/docs/index.mdx` with `template: splash` is the path of least resistance** — the homepage's MDX can import `HomeHero` and `NewsPanel`, and Starlight handles the chrome.

#### 10c. Empty content folders + Zod

`glob({ pattern: '*.md', base: '../news/published' })` against an empty folder (or one with only `.gitkeep`) returns an empty array. Zod doesn't complain (there's nothing to validate). **F9 / AC9 (empty-state fallback) is satisfied by an `items.length === 0` check in each catalog page.** No special handling needed for "folder missing entirely" — Astro 5/6 treats a missing base directory as "no entries" (does not error). Worth confirming on first build; if it errors, we'd add a try/catch wrapper. **Low-risk pitfall.**

#### 10d. Generated TS types and `.astro/`

Astro writes generated types to `site/.astro/`. The repo `.gitignore` already lists `.astro` — good. Implementers should not check in this folder.

#### 10e. Pagefind in dev server

In `dev`, the header search button does nothing useful (shows a warning toast). This is expected behaviour — Pagefind indexes are built only during `astro build`. AC11 verifies the production-built `dist/pagefind/` directory, which is the right test.

#### 10f. `noUncheckedIndexedAccess` + `getCollection` array access

With `noUncheckedIndexedAccess: true` (NF2), `someCollection[0]` types as `T | undefined`. Code like `posts.map(p => p.data.title)` is fine; code like `posts[0].data.title` will TS-error. Trivial to fix by using `posts.at(0)` or guarding with `if (posts.length === 0)`. Worth flagging to the implementer so they don't waste time debugging.

---

### 11. Integrations to NOT include — confirmed

| Integration | Include? | Why |
|---|---|---|
| `@astrojs/mdx` | **No** | Starlight bundles MDX. Adding it manually causes a duplicate-integration warning. |
| `@astrojs/sitemap` | No, defer | No deployment yet; sitemap is for SEO once hosted. |
| `@astrojs/tailwind` | **No** | Spec is ~100 LOC custom CSS (A6). Tailwind is over-engineering for that scope. |
| `@astrojs/react` / `vue` / `svelte` / `solid` / `preact` | **No** | No framework islands needed. AudienceFilter is vanilla JS. |
| `@astrojs/check` | **Yes** (dev dep) | Required for `astro check` command. Starlight init usually adds it. |
| `astro-vtbot` (view transitions for Starlight) | No, defer | Out of MVP scope. Adds complexity to audience filter. |

Sources: [Starlight manual setup](https://starlight.astro.build/manual-setup/) (confirms MDX is bundled), [Astro integrations](https://docs.astro.build/en/guides/integrations-guide/).

---

## Recommended approach

A concrete, actionable plan, in the order the implementer should execute:

### Pre-implementation: amend the spec (one-line edits)

Before any code, the project lead should:
1. **Amend `docs/refined-requests/astro-starlight-site.md`** lines 118-119 (A1, A2) and line 95 (AC1):
   - A1 → `Astro version: ^6.x at the time of install (latest minor pinned via caret).`
   - A2 → `Starlight version: ^0.39.x at install time. Astro 6 + Starlight 0.39 are GA and well-tested as of mid-2026.`
   - AC1 → `site/package.json declares astro ≥6.x and @astrojs/starlight ≥0.39 as direct dependencies.`
2. **Append to `DECISIONS.md`:** *"2026-05-18 — Astro 6 instead of Astro 5 (supersedes refined-request A1/A2)"* — rationale and date.
3. **Refine A9** to drop the "immature in 2026" phrase (see §8 above).

### Implementation order

1. **`site/` scaffold:** `npm create astro@latest site -- --template starlight` then move into the `site/` directory it creates. Verify versions in `package.json` (`astro ^6.x`, `@astrojs/starlight ^0.39.x`). Add `.nvmrc` with `22`. Add `"type": "module"`.
2. **`site/astro.config.mjs`:** declarative sidebar (9 entries per §3 above), `server: { port: 4321 }`, no extra integrations.
3. **`site/content.config.ts`:** 5 collections with `glob()` loaders pointing at `../news/published`, `../skills`, `../tips`, `../glossary`, `../journeys`; Zod schemas per §2 above; `generateId` callback on the news collection to strip the date prefix.
4. **`site/src/content/docs/index.mdx`:** `template: splash`, imports `HomeHero` + `NewsPanel`.
5. **`site/src/pages/`:** `news/index.astro` (NewsList), `news/[slug].astro` (per-item), `skills.astro`, `tips.astro`, `glossary.astro`, `reference.astro` (or `.md`), `contribute.astro` (or `.md`), `start-here/day-1.astro` (or `.md`).
6. **`site/src/components/`:** `HomeHero.astro`, `NewsPanel.astro`, `NewsList.astro`, `AudienceBadge.astro`, `SkillCard.astro`, `AudienceFilter.astro`.
7. **`site/src/styles/custom.css`:** ~100 LOC for hero, news cards, audience badge colors (per A7: `#0a7`, `#e60`, `#08c`). Reference it from Starlight's `customCss` config option.
8. **Seed content:** `skills/.gitkeep`, `tips/.gitkeep`, `glossary/{claudemd,mcp,skill,plugin,agent}.md`, `journeys/day-1.md`.
9. **Wire scripts:** `"check": "astro sync && astro check"`, `"build": "astro check && astro build"`, `"dev": "astro dev"`, `"preview": "astro preview"`.
10. **Validate:** `npm install`, `npm run check`, `npm run build`, `npm run dev` → manually click all 9 sidebar entries.
11. **AC18 fixture test:** drop a deliberately malformed `glossary/_invalid.md` in a branch, run `npm run check`, confirm named error, then remove. (Or test via a fixture in `tests/` if we add Vitest later.)

### Tooling skip list

- No Tailwind. No MDX integration (it's bundled). No sitemap. No React/Vue/Svelte. No view transitions / `astro-vtbot`. No ESLint for MVP (Astro projects typically rely on `astro check` + Prettier; pipeline's ESLint config can be reused later if we want to lint `.ts` files in the site).

---

## Risks and mitigations

| # | Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|---|
| R1 | Refined request says Astro 5; latest Starlight requires Astro 6 → install-time confusion | High (will trip up the implementer) | Medium | **Amend spec before implementation** (see "Pre-implementation" above). |
| R2 | HMR doesn't pick up file changes under `../news/published/` during dev | Medium | Low | Restart `astro dev` after content changes; widen Vite watcher if it becomes painful. Note as follow-up in `Issues - Pending Items.md`. |
| R3 | `astro check` silently exits on schema errors (known wart) → AC18 false-positive | Low-medium | Medium | Use `"check": "astro sync && astro check"` — running sync first surfaces schema errors deterministically. |
| R4 | Empty content folder (`glossary/`, `skills/`) breaks the build | Low | Low | Astro 5/6 treats empty/missing base as "no entries"; the `length === 0` empty-state branch handles it. Verify on first build. |
| R5 | Slug collision from `generateId` (two news items with same kebab-case title on different dates) | Low | Medium | Pipeline already has `resolveSlugCollision` (slug.ts) which appends a numeric suffix. Site inherits any collision from the filename. Worst case: the second file would have to be manually renamed. |
| R6 | `noUncheckedIndexedAccess` causes TS errors on collection array access | Medium | Low | Use `.at(0)`, length guards, or destructure inside `.map()`. Flag to implementer. |
| R7 | FOUC on audience filter (cards briefly visible before localStorage state applies) | Low | Cosmetic | Acceptable for MVP. Polish: move restore-from-localStorage to inline blocking `<script>` in `<head>` of layout. Defer. |
| R8 | Pagefind dev-mode warning surprises stakeholders demoing the site | Low | Cosmetic | Demo against `npm run preview` (production build) not `npm run dev`. Document in the Contribute page. |
| R9 | Starlight 0.40+ ships another breaking change mid-implementation | Low | Low | Pin `@astrojs/starlight` with caret (`^0.39.x`); follow `npx @astrojs/upgrade` for any planned bump. Greenfield project, low cost to upgrade if needed. |
| R10 | Site dev server collides with another project's port 4321 | Low | Low (per CLAUDE.md, switch ports, never kill) | `lsof -i :4321`; `npm run dev -- --port 4322` if occupied. |

---

## Technical Research Guidance

**Research needed: No.**

The investigation gathered sufficient detail on every locked technology. Astro 6, Starlight 0.39, Pagefind, content collections + `glob()`, dynamic routes via `getStaticPaths`, `template: splash` homepage, and vanilla `<script>` patterns are all well-documented and have working reference implementations (Cloudflare docs, Tauri docs, Biome docs). The team's pipeline already uses Vitest + Node 22 + strict TS, so the local ecosystem is familiar.

Two narrow items that look like they could need research but actually don't:
- **`generateId` callback signature for the news date-prefix strip** — fully specified in [Astro Content Loader API reference](https://docs.astro.build/en/reference/content-loader-reference/); the implementer can write it from the doc snippet in §2 above.
- **`StarlightPage` wrapper API** — documented in [Starlight pages guide](https://starlight.astro.build/guides/pages/); accepts `frontmatter` prop with title/description/template; no surprises.

If we later decide to opt into view transitions (out of MVP scope), then we'd want a small targeted investigation into `astro-vtbot` — but that's a future decision, not an MVP blocker.

---

## Implementation Considerations

- **Order of operations matters once:** scaffold first with `npm create astro@latest`, then add `content.config.ts`, then the pages, then components. If you write components first they'll fail typecheck because the collection types don't exist yet.
- **Run `npx astro sync` after every schema edit.** Generated types under `site/.astro/` drive IDE autocomplete. Without sync, the implementer will fight phantom TS errors.
- **The 9-entry sidebar order is opinionated (newcomer-first).** Stick to A11. Resist the urge to put News at the top because pipeline produces it — the hub is for newcomers, and newcomers want "Start Here" front and centre.
- **AudienceBadge colors are spec'd in A7.** `#0a7` green / `#e60` orange / `#08c` blue. These are deliberately accessible (high contrast on white and on dark backgrounds). Don't second-guess them in MVP.
- **The homepage `NewsPanel` and the `/news` index share the data fetch.** Refactor: extract a `getRecentNews(limit?: number)` helper in `src/lib/news.ts` rather than duplicating `getCollection('news')` sort logic.
- **Empty-state copy is consistent (A8).** Use a small `<EmptyState />` component if the same string appears in 4+ places; otherwise inline.
- **Trailing slashes matter.** Starlight default is `trailingSlash: 'always'`. Sidebar `link:` values and internal `<a href=>` should include them.
- **DoD #7-#9 require doc edits, not code.** Plan for `project-design.md` "Site architecture" section, `project-functions.md` F1-F12 additions, and `SCOPE.md` status updates *as part of the same implementation PR*, not a follow-up.

---

## References

| # | Source | URL | What was learned |
|---|---|---|---|
| 1 | Astro 6.0 release post | https://astro.build/blog/astro-6/ | Astro 6 GA'd 2026-03-10; supersedes Astro 5 as the recommended major. |
| 2 | Astro 6 upgrade guide | https://docs.astro.build/en/guides/upgrade-to/v6/ | Breaking changes affecting this project: Node 22+ required, `z` from `astro/zod` not `astro:content`, legacy collections removed, `<ViewTransitions />` → `<ClientRouter />`. |
| 3 | Starlight 0.39 release | https://astro.build/blog/starlight-039/ | Latest Starlight (2026-05-07); autogenerated sidebar flexibility; requires Astro 6. |
| 4 | Starlight Astro-6 commit | https://github.com/withastro/starlight/commit/0d2e7ed74a604b028fcab0c81b4c35c0c9365343 | Starlight 0.38 drops Astro 5 support; 0.37.x is the last Astro-5-compatible line. |
| 5 | Astro Content Loader API reference | https://docs.astro.build/en/reference/content-loader-reference/ | `glob({ pattern, base, generateId, retainBody })` shape; `base` is relative to project root; `generateId` callback for slug control. |
| 6 | Astro Content Collections guide | https://docs.astro.build/en/guides/content-collections/ | `defineCollection`, Zod schemas, `getCollection`, content outside `src/` is supported. |
| 7 | Astro routing reference | https://docs.astro.build/en/reference/routing-reference/ | `getStaticPaths` returns `{ params, props }[]`; param key must match filename bracket; in Astro 5+ slug is now `id`. |
| 8 | Starlight sidebar guide | https://starlight.astro.build/guides/sidebar/ | Declarative sidebar in `astro.config.mjs`; `{label, link}`, `{label, items}`, `{autogenerate}` shapes; collapsed, badges, attrs. |
| 9 | Starlight configuration reference | https://starlight.astro.build/reference/configuration/ | `starlight({title, sidebar, customCss, pagefind, components, ...})` options. |
| 10 | Starlight pages guide | https://starlight.astro.build/guides/pages/ | `template: splash` for landing pages; `StarlightPage` wrapper for custom `.astro` pages under `src/pages/`. |
| 11 | Starlight frontmatter reference | https://starlight.astro.build/reference/frontmatter/ | `template`, `hero`, `pagefind`, `sidebar.label/order/hidden/badge` options. |
| 12 | Starlight site search guide | https://starlight.astro.build/guides/site-search/ | Pagefind enabled by default, no config needed; `data-pagefind-ignore` for exclusion; `pagefind: false` frontmatter to skip a page. |
| 13 | Starlight overriding components | https://starlight.astro.build/guides/overriding-components/ | `Astro.locals.starlightRoute` for route data; conditional rendering on homepage via slug check. |
| 14 | Starlight manual setup | https://starlight.astro.build/manual-setup/ | Confirms MDX is bundled with Starlight; no need to add `@astrojs/mdx` separately. |
| 15 | Astro configuration reference | https://docs.astro.build/en/reference/configuration-reference/ | `server: { port, host }` is the canonical port pin. |
| 16 | Astro CLI reference | https://docs.astro.build/en/reference/cli-reference/ | `astro check` runs sync + typecheck; `--port` flag overrides config. |
| 17 | Astro testing guide | https://docs.astro.build/en/guides/testing/ | Vitest + `getViteConfig()` + Container API is the official component-test path; `vitest-browser-astro` for browser-mode tests. |
| 18 | View transitions guide + Bag of Tricks | https://docs.astro.build/en/guides/view-transitions/ + https://events-3bg.pages.dev/jotter/astro/scripts/ | Soft-load scripts don't auto-re-run; not a concern because Starlight does NOT enable `<ClientRouter />` by default. |
| 19 | Starlight ClientRouter discussion #2823 | https://github.com/withastro/starlight/discussions/2823 | Confirms ClientRouter is opt-in; requires custom Head component or `astro-vtbot` to enable. |
| 20 | language-tools discussion #982 | https://github.com/withastro/language-tools/discussions/982 | Known wart: `astro check` can silently exit on schema errors; workaround is `astro sync && astro check`. |
| 21 | Tauri docs homepage pattern | https://deepwiki.com/tauri-apps/tauri-docs/4.1-getting-started-section | Real-world reference for `src/content/docs/index.mdx` + `template: splash` + custom hero component. |
| 22 | Migrating content collections 4→5 (Chen Hui Jing) | https://chenhuijing.com/blog/migrating-content-collections-from-astro-4-to-5/ | `entry.slug` → `entry.id`; `[slug].astro` → `[id].astro` (or remap `slug → id` in `getStaticPaths`). |

---

## Original Request

See `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/refined-requests/astro-starlight-site.md` for the full refined request (20 ACs, 18 Assumptions, 12 DoD items). Investigation scope and target sections were specified in the parent agent's instructions and traced 1:1 to the 11 area headings in §Per-area findings.
