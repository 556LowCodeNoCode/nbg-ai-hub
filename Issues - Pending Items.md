# Issues - Pending Items

Pending items first (most critical at top). Per CLAUDE.md doc-hygiene: each entry is 3-4 lines max — long-form analyses go in `docs/reference/`.

## Pending

24. **PinType union restated in 5 places — should derive from `FavoriteEntry['type']`** (low / DRY follow-up to 2026-06-08 cleanup).
    Same 5-tuple lives in `gist.ts` (canonical), `pin-store.ts` `isPinType`, `PinButton.astro` (×2), `my-pins.astro` (already uses `FavoriteEntry['type']` post-cleanup), `build-pin-index.ts` `PinType`. Fix path: re-export from `gist.ts` and import everywhere; `.astro` script blocks can `import type` since 2024.

23. **Real GitHub-token-page screenshot for SignInModal Step 1** (low / asset capture, 2026-05-27 UAT T13 V1).
    A CSS/HTML mock of the GitHub token-creation page now sits inside the SignInModal Step 1 (`site/src/components/SignInModal.astro` — `.nbg-signin__preview` block) because this environment can't log into github.com to capture the real page. **Replace path:** capture `github.com/settings/tokens/new?scopes=gist&description=NbgAiHub` while logged in, save as `site/public/brand/github-token-page.png`, swap the mock block for a single `<img>`.

22. **Real asciinema recording on homepage** (low / asset capture, 2026-05-27 UAT T17 V2).
    A CSS/HTML "terminal preview" via `<TerminalDemo>` now sits in `site/src/pages/index.astro` (`homeDemoFrames`) because asciinema isn't installed and Claude Code can't be run interactively here. **Replace path:** record a 30-60s session with `asciinema rec`, host the JSON cast file, drop in `asciinema-player` and replace the `<TerminalDemo>` slot.

20. **Starlight CSS ships unlayered, beats `@layer nbg.components` in production** (medium / recurring footgun).
    Per CSS spec, unlayered rules beat any `@layer` block regardless of declared order. Same trap also fires from `agentnews-layout.css` (unlayered rules on `.section` + `.wrap`). Round-1 (2026-05-26) patched typography; round-2 (2026-05-27 late) patched layout/spacing on Day 1 + Foundations.
    **Fix path:** wrap Starlight + agentnews CSS imports in `@layer starlight, agentnews;` via Vite/PostCSS plugin (single-source). Until then: `!important` on every losing property, prefer custom class names over `.section`/`.wrap`. Canonical doc: `docs/reference/starlight-cascade-gotcha.md`.

19. **`--nbg-sh-focus-ring` primitive in `tokens/primitives.css:243-244` still references `var(--nbg-c-violet-500)`** (low / cosmetic-debt).
    Semantic-layer override in `tokens/semantic.css` already wins in production. Leftover primitive is a footgun if anyone resets the token. One-line cleanup, not urgent.

17. **Astro 6 content-collection data-store cache survives config-touch reloads** (low / authoring-flow quirk).
    New `glossary/*.md` files don't show until full dev-server restart. Workaround: Ctrl+C + `npm run dev`, or touch an existing file in the same directory. Already documented in `docs/reference/authoring-glossary-terms.md` Step 4.

16. **Journey-page auto-link is "first occurrence per RENDERED SEGMENT" not "first occurrence per page"** (low / known quirk, design-acceptable).
    `foundations.astro` and `day-1.astro` call `processor.render()` separately per step, each gets a fresh first-occurrence set. Verdict: readers landing on a specific step benefit from in-context links. If strict per-page wanted, render segments in a single processor call with a marker.

15. **Future manual `createMarkdownProcessor()` calls must re-pass `remarkPlugins` explicitly** (low / process note).
    Project-level `markdown.remarkPlugins` doesn't propagate to direct `createMarkdownProcessor()` calls. Forward improvement: extract `createNbgMarkdownProcessor()` helper if a third manual-processor page lands.

14. **Orphan routes and orphan RSS-pipeline data after 2026-05-25 nav rework** (low / decide-later).
    Orphaned page files (`contribute.astro`, `submit-skill.astro`, `start-here/week-1.astro`) and the RSS pipeline (cron + `pipeline/` workspace) still run but nothing on the site reads `news/published/` — only the hub plugin's `/hub-news` does. Decide whether to delete pages, turn off the cron, or accept steady-state Azure OpenAI cost. See DECISIONS 2026-05-25 nav-rework.

13. **Reddit OAuth path blocked at app creation; engagement-floor scaffolding parked dormant** (medium / external blocker).
    Reddit blocks unauthenticated JSON from GH Actions IPs (403). OAuth app creation failed on reCAPTCHA. Reddit feeds reverted to `.rss`. OAuth + engagement-filter + JSON-parser code stays in repo as dormant scaffolding. Reactivation: retry app creation on different browser/network, add `REDDIT_CLIENT_*` secrets, flip `type: "rss"` → `"reddit-json"` in `config/rss-sources.json`. See DECISIONS 2026-05-21 (three entries).

12. **SignInModal renders twice on content-detail (non-splash) pages — pre-existing latent** (low / cleanup).
    Starlight chrome instantiates `SocialIcons` in two locations (header + mobile drawer), so the modal `<dialog>` appears twice → duplicate IDs. JS uses `querySelector` so only the first dialog wires up; visually works. Fix: move SignInModal mount out of `SocialIconsOverride` into a single page-level location.

11. **`/submit-skill/` slug collision pre-check returns false-"free" against private repo** (now moot — `/submit-skill/` removed 2026-05-25).
    `submission.ts::checkSlugCollision` calls unauthenticated `GET .../contents/skills/<slug>.md` which 404s for every slug on a private repo. **Status:** UX-only and the page is gone. Keep entry in case `/submit-skill/` ever returns — recommended fix is to check against build-time `public/_data/skill-index.json` instead.

10. **Pinned `skill`/`tip` items deep-link to catalog index, not per-item page** (low / UX).
    `urlForPin()` routes to `/skills/` and `/tips/` because no per-slug pages exist. Revisit when per-slug pages are introduced.

9. **PAT-paste UX fallback to OAuth App + Cloudflare Worker proxy** (low / follow-up).
    Designed but not built — see `docs/reference/investigation-personalization.md`. Revisit only if user feedback specifically flags PAT friction.

8. **Opt-in team-wide aggregate pin stats** (low / future feature).
    No aggregation surface exists; gists are user-owned (unlisted-not-private). Opt-in design TBD.

7. **Extract shared schema package between `site/` and `pipeline/`** (low / refactor).
    Skill frontmatter contract is duplicated in `site/src/content.config.ts` and `pipeline/src/validators/skill.ts`. Folds in #6. Worth doing only once monorepo tooling lands.

6. **`site/src/lib/slug.ts` duplicated from `pipeline/src/slug.ts`** (low / dedup).
    Drift-test ensures byte-identical. Dedupe when monorepo tooling lands (folds in #7).

5. **Manual marketplace-install verification** (medium / pre-release).
    Run `/plugin marketplace add 556LowCodeNoCode/NbgAiHub` against a fresh Claude Code session; verify marketplace.json + plugin.json resolve, all 11 commands appear, env vars set. Tests cover parse-time; install-time end-to-end is the gap. Block on this before publishing the marketplace publicly.

4. **Confirm by-role journey slug spellings (OQ4)** (low / content-prep).
    Decide canonical slugs (`backend` vs `backend-dev`; `data-scientist` vs `data-science`; `ml-engineer` vs `mle`) so `/hub-onboard <slug>` and `/hub-open <slug>` resolve predictably once content is authored.

2. **Refactor `z.string().url()` → `z.url()` in `content.config.ts`** (low / cosmetic).
    `astro check` flags 4 Zod 4 deprecation hints (lines 46, 47, 69, 76). Old form still works; refactor when next touching the schema.

1. **Periodic `npm audit fix` for dev-tree** (low / housekeeping).
    `npm audit` reports 5 moderate advisories chained through `@astrojs/check` → `volar-service-yaml` → `yaml`. All dev-only. `npm audit --omit=dev` is clean.

## Completed (archive)

One-liners only. Full context in DECISIONS.md or git log.

- **#3** Flip `devMode: false` in `plugin/config.json` ✓ 2026-05-29 — site live at https://556lowcodenocode.github.io/NbgAiHub; `/hub-open` now resolves the public URL, hub-open e2e test green (130/130). Plugin dist/ still needs `npm run build` to bundle the new config for users on `/hub-refresh`.
- **#21** Day 1 TerminalDemo mocks ✓ 2026-05-27 (overnight) — removed entirely during Day 1 content overhaul; no replacement needed. See DECISIONS 2026-05-27 (overnight).
- **#18** Site `base` env-driven for GH Pages deploy ✓ 2026-05-26 — `PUBLIC_BASE` env + postbuild rewrite + base-aware logo/brand. See DECISIONS 2026-05-26 (afternoon).
- **#17** `/glossary/` catalog page didn't auto-link cross-references ✓ 2026-05-25 — rewrote `glossary.astro` to use `createMarkdownProcessor({ remarkPlugins })` per entry.
- **#6** `MarketingShell` no longer double-wraps `StarlightPage` ✓ 2026-05-19 — moved homepage from `content/docs/index.mdx` to `pages/index.astro`.
- **#5** UI redesign UX defects (nav, hero void, duplicate H1, gaps, hidden clusters) ✓ 2026-05-19 — see DECISIONS 2026-05-19 UI-redesign entry.
- **#4** `npm run dev` smoke test ✓ 2026-05-18 — site renders at localhost:4321.
- **#3** RSS triage tightening (source-aware prompt + `editor_confidence`) ✓ 2026-05-18 — 93/93 tests.
- **#2** Live end-to-end RSS run ✓ 2026-05-18 — run `26047997638`, PR #1 with 43 items.
- **#1** SCOPE.md cross-reference to RSS refined request ✓ 2026-05-18.
