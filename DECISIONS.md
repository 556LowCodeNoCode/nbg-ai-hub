# Decision log

Append-only. Each entry permanent. When a decision is superseded, add a new entry — never edit prior ones.

Per CLAUDE.md doc-hygiene: each entry ≤20 lines, structured as Decision (bullets) / Why (1-2 lines) / References. Long-form analyses live in `docs/reference/<topic>-YYYY-MM-DD.md` and `docs/design/`.

---

## 2026-05-29 — Tips: overhaul (UX rethink, content expansion 18→27, "Survival keys" → "Control keys")

**Decision:**
- **Filter UX rethink** — unified AudienceFilter + TopicFilter into one chip vocabulary (label-above-chips column layout, accent-teal active state regardless of chip count). Replaced `T1 / 4` mono section heads with serif `.listing-section__title` + quiet lede (Foundations vocabulary). Filters dispatch `nbg:filters-changed`; a per-page coordinator hides empty cluster sections (`.is-empty`) and reveals a "No tips match" aside with one-click Clear. Hero→content gap tightened ~88px → ~40px via `.hero--stack:has(.hero__filter)`. Double-hairline between sections fixed by dropping redundant `border-top` (the agentnews `.section { border-bottom }` already separates them).
- **Compact row variant** (`.listing-list--compact`, tips-only) — dropped redundant `TIP · CLUSTER` eyebrow, shrank title 1.35rem → 1.0625rem, clamped summary to 2 lines, tightened padding to 0.7rem. Row height 161px → 90px. Two Starlight unlayered-cascade gotchas patched in-place with `!important` (per the standing rule in CLAUDE.md). Skills layout untouched.
- **"Survival keys" → "Control keys"** retired across the site. Reason: bank colleagues new to Claude Code read "survival" as alarmist; "control" is plain and accurate. Touched tip frontmatter (`survival` → `control`), tip titles, Day 1 Step 6 + TOC label, about page, README, CLAUDE.md repo layout, SCOPE.md, plugin tests + fixture.
- **Content expansion 18 → 27** — deleted `prompt-context-first.md` (overlap absorbed into bad-vs-good-openers). Authored 10 new tips covering plan-first workflow, CLAUDE.md-as-living-memory (Boris Cherny's golden rule), session focus, `claude --continue`, custom `.claude/commands/`, `@`/`!` shortcuts, gh/az CLIs, subagents (advanced), hooks-vs-CLAUDE.md (advanced), think-harder + `/effort`. Added a 5th "Workflow & commands" cluster.
- **Cluster matcher correctness** — replaced regex substring tests with exact-string topic membership. The old `/model/i` was matching `"trust-model"` and pulling always-review-changes into Prompting cluster.
- **Topic-chip cleanup** — bundled two redundant pairs in tip frontmatter (`trust-model` ⊂ Safety on same tip; `llm-strategy` ⊂ Data-residency on same tip). 16 chips → 14, no information loss.

**Why:** Mid-session user feedback caught filter inconsistencies + visual noise (oversized cards, double borders, gigantic gaps), "survival" as alarmist for the bank-newcomer audience, and catalog gaps the research surfaced — plan-first workflow, custom commands, hooks vs instructions, subagents, resume sessions, thinking triggers.

**Refs:** `site/src/components/{Audience,Topic}Filter.astro`, `site/src/pages/tips.astro`, `site/src/styles/listing-rows.css`, `tips/*.md` (10 new, 1 deleted, several refined), `journeys/day-1.md`, `site/src/pages/{about,start-here/day-1}.astro`, `plugin/tests/{lib/journeys.test.ts,fixtures/snapshot/journeys/day-1.md}`, `plugin/snapshot/` (rebuilt). Sources for catalog research: Anthropic docs, Boris Cherny's published workflow, awesome-claude-code, dev.to / builder.io / kentgigger guides. Site tests: 310/310.

---

## 2026-05-28 (night) — Use Cases pillar v3: homepage refs, OS toggle, terminal-styled snippets, AudienceFilter parity

**Decision:**
- **Homepage Use Cases references** — added a third CTA "→ Try a Use Case" to the "Start with Foundations" router card (alongside Foundations + Day 1 setup), promoted Use Cases to the first pill in "Jump straight in", added it to the footer "Start" column. The newcomer card now flexes to wrap three buttons on narrow viewports.
- **OS toggle on use-case detail pages** — small segmented pair ("YOUR OS · macOS · Windows") rendered in the hero intro. Click switches the page's `<html data-os-prefer>` attribute and persists it to `localStorage.nbgaihub.os-prefer`. CSS rules then hide `[data-os="mac"]` or `[data-os="windows"]` blocks based on the attribute. macOS is the default. The toggle script is inline + runs as early as possible to keep first-paint flicker minimal.
- **OS-tagged blocks across all 12 markdown files** — every "Open the Terminal app" line now wraps the OS-specific instruction in `<div data-os="mac">` / `<div data-os="windows">` containers. Windows variant points readers at the WSL install in Day 1 if they don't have Ubuntu. mortgage-calculator Step 4 (open-the-file fallback) also got the OS split.
- **Terminal-styled `pre` blocks** — Shell-command snippets in use-case bodies now render as a fake terminal window: dark teal (`#052329`) background, light cream text, three coloured dots (red/yellow/green) top-left, a "TERMINAL" mono label top-right. Shiki's per-token inline styles overridden with `!important` so the palette reads consistently regardless of light/dark page theme. Inline `code` (not inside a pre) keeps the original subtle teal-on-grey pill.
- **AudienceFilter added to gallery** — page now stacks two filters in the hero matching the Tips/Skills pattern exactly: SHOW (Everything / For beginners / For experienced) above FILTER BY UNIT (multi-select chips). Cards carry `data-audience`; new coordinator script ANDs the audience-filter `audience-hidden` class with our `unit-hidden` class and listens for `nbg:filters-changed` events.

**Why:** User feedback identified four gaps after the v2 ship — main page didn't reference the new pillar, the gallery filter had a SHOW row missing relative to /tips, terminal-instruction code blocks read as "code" not "command", and Mac/Windows divergent commands forced every reader to mentally filter for their OS every time. All four addressed in one round.

**Refs:** `site/src/pages/index.astro` (3 edits), `site/src/pages/use-cases/index.astro` (AudienceFilter import + filter coordinator), `site/src/pages/use-cases/[slug].astro` (OS toggle + terminal pre styling), 12 `usecases/*.md` files. Astro check: 0 errors / 0 warnings.

---

## 2026-05-28 (late evening) — Use Cases pillar v2: 12 use cases, explicit file-creation steps, filter UI matches Tips/Skills

**Decision:**
- **Pillar doubled to 12** — 6 new use cases authored covering Risk (credit-memo-tldr), Data (sql-from-question), Accounting (invoice-data-extract), HR (onboarding-checklist), Operations multilingual (document-translator), Process improvement (runbook-from-interview). Together with the original 6 the pillar now spans Retail · Contact center · Compliance · Mortgages · Operations · Process improvement · HR · Risk · Data · Accounting.
- **Schema enum extended** — `business_unit` in `site/src/content.config.ts` adds `hr`, `risk`, `data`, `accounting`. `BUSINESS_UNIT_LABELS` map mirrored in both `index.astro` and `[slug].astro`.
- **All 12 use cases rewritten for zero-prior-knowledge file creation.** Every step that creates a file now starts with the explicit Terminal walkthrough — open Terminal app → `mkdir ~/Desktop/folder` → `cd` → `claude` — and then asks Claude to write the markdown/text file with inline content. Reason: feedback from user — readers don't know how to "create a new MD" by hand; assuming they know `nano`/`touch`/TextEdit broke the trust chain.
- **Filter UI overhauled to match Tips/Skills.** Dropped the bespoke `.unit-filter` markup + the "All" chip (the all-state is implicit when zero chips are pressed — same as TopicFilter on /tips). Now uses `.topic-filter` markup + classes, so chip styling, "Clear" link semantics, label-above-chips column layout, and accent-teal pressed state all inherit from `listing-rows.css`. Inline script ports TopicFilter's multi-select OR logic onto `data-business-unit` cards.
- **Hero filter breathing room** — `.hero--stack .hero__filter` margin-top bumped 1.5rem → 2.5rem so the filter doesn't feel crammed against the lede.
- **Splash-page nav** (`SplashAwareHeader.astro`) gained the Use Cases entry between Day 1 and Tips (the earlier `astro.config.mjs` sidebar entry only renders on content-detail pages).

**Why:** Earlier round shipped 6 use cases but skipped the "how do I make a file" gap and used a bespoke filter that didn't match the rest of the site. User feedback caught both — fix is a content rewrite + a small filter swap, not a redesign.

**Refs:** 12 files in `usecases/`. Schema: `site/src/content.config.ts`. Pages: `site/src/pages/use-cases/index.astro` + `[slug].astro`. Splash nav: `site/src/components/SplashAwareHeader.astro`. Astro check: 0 errors / 0 warnings.

---

## 2026-05-28 (evening) — Use Cases pillar: a 6-card gallery + per-case walkthroughs

**Decision:**
- New `usecases` content collection in `site/src/content.config.ts` — `baseShape('usecase')` + 6 use-case-specific fields (`business_unit` enum, `time_estimate`, `difficulty`, `order`, `outcome`, `inputs[]`). Markdown body uses the same `## Step N — Title` segmentation as journeys/day-1.md and journeys/foundations.md so the existing splitter pattern fits unchanged.
- Six beginner-friendly worked examples authored under `usecases/`: complaint-heatmap (Contact center), empathic-reply (Retail), policy-diff (Compliance), mortgage-calculator (Mortgages), minute-taker (Operations), regulator-brief (Compliance). Each is ~15–30 min, has a clear input + outcome, includes an explicit compliance/synthetic-data check, and ends with a "save the prompt as a template" Step 5 so the second run takes seconds.
- Gallery page `site/src/pages/use-cases/index.astro` — 2-column card grid, business-unit chip filter (vocabulary matches /tips), finale card pointing at /tips + /skills.
- Detail page `site/src/pages/use-cases/[slug].astro` — Day-1-style 2-column docs (240px sticky TOC + scrollable steps), hero with outcome + inputs side-by-side cards, next-use-case CTA at bottom.
- Sidebar adds "Use Cases" between Day 1 and Tips. Day 1's bottom "Next →" card switched from Tips to Use Cases as primary (Tips demoted to secondary). Foundations hero adds a third skip-link ("→ already installed? Try a Use Case") and the bottom "Next →" card adds a "Or jump to Use Cases" secondary CTA.

**Why:** Foundations + Day 1 left newcomers with mental models + a working install but no concrete first thing to do. Use Cases closes that loop with bank-relevant beginner examples — the same shape used by docs/design/project-design.md's "compress time-to-confidence" goal.

**Refs:** new files under `usecases/`, `site/src/pages/use-cases/`. Schema: `site/src/content.config.ts`. Sidebar: `site/astro.config.mjs`. Cross-refs: `site/src/pages/start-here/foundations.astro`, `site/src/pages/start-here/day-1.astro`.

---

## 2026-05-27 (overnight, follow-up) — Day 1 Step 4: add GitHub commit/push subsection

**Decision:** Added a new "Want to share your work? Push it to GitHub" subsection at the end of Step 4. Explains the local-vs-shared pivot, points back to `gh auth login` from Step 3, gives the two prompts ("create a GitHub repo for this folder and push it" / "commit and push"), and provides the two-word commit/push definitions. Also tweaked the Step 5 "Without `CLAUDE.md`" bullet ("two completely different reports" → "different reports every time you run it") per UAT.

**Why:** Day 1 was teaching first-session usage but leaving readers stranded at the local-folder boundary — no bridge to "now share it with your team". The new subsection closes that loop using only the `gh` tooling they already set up in Step 3 (no MCP, no extra setup).

**Refs:** current commit. Tests: site 310/310. Live: <https://chomovazuzana.github.io/NbgAiHub/start-here/day-1/#d4>.

---

## 2026-05-27 (overnight) — Day 1 public-safe content overhaul + CLAUDE.md before/after figure + Starlight `article + article` round 3

**Decision:**
- `journeys/day-1.md` rewritten to 6 ordered steps: Open terminal · Install Claude Code · GitHub account · First session · Write `CLAUDE.md` · Survival keys. All NBG-internal references scrubbed — no @nbg.gr, no clouddevops contact, no procurement-code flow, no hardcoded org/repo. Provider step lists all four Claude Code backends neutrally with placeholder env-var shape for Vertex/Bedrock.
- Step 4 happy path is now `mkdir ~/claude-playground && claude` (clone-from-GitHub demoted to the alternative); explicit don't-run-`claude`-in-`$HOME` warning added.
- Step 5 introduces a side-by-side **before/after figure** above the prose (left "Without CLAUDE.md" = three distinct grey report glyphs; right "With CLAUDE.md" = three identical accent-teal glyphs; same `loans.xlsx` + "analyse + report" pill in both). Story below restructured to bullets. Dropped `/claudemd` skill mention + "keep it under two pages" line; added "if it gets bigger, reference other docs". `claude --continue` caveat woven into the "no save button in Claude Code" framing.
- Mac terminal list reordered: **cmux** (new — purpose-built for AI coding agents, [cmux.com](https://cmux.com/)) → Ghostty → Warp → **iTerm2** (now last). Mac screenshot shortcut spelled exactly as user dictated: `⌘C` capture / `control V` paste.
- `journeys/foundations.md`: removed the "You don't need Claude Code to do your job" intro paragraph; CLAUDE.md bullet now links to `/start-here/day-1/#d5`.
- `glossary/wsl.md`: bank-specific framing ("bank Windows laptop" / "bank-managed machines") → generic "managed laptop"; added Microsoft + Git for Windows + Windows Terminal inline links.
- Body links on both pages (`.day-section__body` + `.foundation-step__body`): explicit `:global(a)` rule — accent colour + always-visible 1px underline (thickens to 2px on hover/focus). Stops links looking like normal text until hover.
- `site/src/pages/start-here/day-1.astro`: `tocLabels` reordered for the new step order; top-card grid bumped 5 → 6 columns mirroring Foundations' 75rem/48rem/30rem breakpoints; dummy `<TerminalDemo>` blocks + unused frame consts removed (no more "Stylised preview" callouts on Day 1).
- **Starlight `article + article` gotcha — round 3:** the figure's two `<article>` panels were Y-misaligned by 16px (probe confirmed `marginTop: 16px` on the 2nd panel). Same root cause Foundations already documented on `.foundation-compare__col` (DECISIONS 2026-05-21): Starlight ships an unlayered `article + article` rule injecting `margin-top: 16px` on subsequent siblings. Same fix applied — `margin: 0 !important` on `.claudemd-panel`, with a comment pointing back to Foundations so the pattern is discoverable. Post-fix probe: both panels pixel-identical (`top: 254`, `bottom: 683`, `height: 429`, `marginTop: 0`).
- `site/tests/build-output.test.ts`: drifted `Day-1 step segmentation` regex fixed — was asserting `id="step-N"`, page emits `id="dN"` since ff67a4a.
- Closed `Issues - Pending Items.md` #21 (Day 1 TerminalDemo mocks are gone).

**Why:** Day 1 was the most-trafficked page still leaking NBG-internal references (specific repo paths, "bank email", "bank-issued authenticator") — unsafe for the now-public Pages deploy. Rewriting to the 6-step ordered flow + scrubbing the NBG-isms makes the page safe for the live URL. The before/after figure visualises CLAUDE.md's value faster than prose ever could.

**Refs:** current commit. Tests: site 310/310 (1 skipped). Live: <https://chomovazuzana.github.io/NbgAiHub/start-here/day-1/>. Issue #20 (broader `@layer starlight` workaround) still deferred — round 3 is another datapoint for prioritising it.

---

## 2026-05-27 (late evening) — Day 1 docs-style layout + Starlight cascade hardening, round 2

**Decision:**
- Day 1 rewritten to the Foundations docs-style layout: 240px sticky TOC sidebar | scrollable main column with 48rem justified prose, clean title-only section heads, accent "Next → Tips" card at the bottom. Top 5-card `.journey-overview` kept (UAT preference).
- Foundations grew the matching 6-card top overview; one IntersectionObserver drives both the sidebar TOC `data-active` and the top-card `data-current` highlights in sync.
- `journeys/day-1.md`: removed the stale `> **2026-05-27 — sequence change**` blockquote.
- `!important` baked onto every body-prose `:global(<tag>)` rule (p, blockquote, h3, code, pre, table, strong) AND every layout/spacing property (`.day-layout`/`.foundation-layout` padding-block + grid, `.day-section__head`/`.foundation-section__head` margin-bottom, `.day-main`/`.foundation-main` gap, etc.). Intro sections renamed from `.section` → `.day-intro-section` / `.foundation-intro-section` to dodge `agentnews-layout.css`'s `.section { padding-block: 0 !important }` rule entirely.
- New canonical reference: `docs/reference/starlight-cascade-gotcha.md` — incident log + default posture + diagnosis ladder. Linked from CLAUDE.md new "Starlight cascade gotcha" section. Memory file `feedback_starlight_unlayered.md` updated with the layout-rule corollary.

**Why:** Round-1 cascade fix (Issue #20 / DECISIONS 2026-05-26) covered `:global(<tag>)` typography but not structural spacing; deploy showed layout-padding + section-head margin collapse before any local probe surfaced them. Documenting once, exhaustively, breaks the cycle of rediscovery.

**Refs:** commits `ff67a4a`, `facf572`, plus the current commit. Live: <https://chomovazuzana.github.io/NbgAiHub/start-here/day-1/> + `/foundations/`. Issue #20 retained (wider fix — wrapping Starlight CSS in `@layer starlight` via PostCSS — still deferred).

---

## 2026-05-27 (evening) — Homepage demo swapped from mock to real recording

**Decision:**
- `site/src/pages/index.astro` "What a session looks like" section: dropped the `TerminalDemo` mock + `homeDemoFrames` const; replaced with an autoplaying, looping `<video>` of a real Sonnet-4.6 `claude` CLI session (create dummy loans CSV → analyse → write report.md), framed in a macOS-style chrome.
- Recording produced via VHS driving the actual `claude` CLI in a fresh `~/Desktop/Claude Demo/real/` folder. Tape, source MP4, and the loans.csv/report.md it generated all live at `~/Desktop/Claude Demo/`.
- Post-processing chain on source: `ffmpeg` drawbox masks (3 boxes, Catppuccin-Mocha-base fill) to hide the welcome banner's "Welcome back \<name>" and "\<email>'s Organization" lines through the full scroll-out (t<12.2 stable + t=12.0–12.8 wide cover for the scroll transition) → `setpts=PTS/1.4` speedup → 6 s of idle-air cut between the first response completing and the second prompt starting.
- Final asset: `site/public/demo/claude-session.mp4` (696 K, 26.4 s, h264 +faststart). Path resolved via `import.meta.env.BASE_URL` so local dev (`/demo/...`) and Pages (`/NbgAiHub/demo/...`) both work.
- `TerminalDemo.astro` component kept (still used on `/start-here/day-1`).

**Why:** Mock terminal frames reading as a placeholder; a real recording is more credible to newcomers and matches the "no scripting" positioning. Cuts/masks remove PII and dead air without re-recording.

**Refs:** commit pending. Live URL after push: <https://chomovazuzana.github.io/NbgAiHub/>.

---

## 2026-05-26 (afternoon) — Site published to GitHub Pages + Starlight unlayered-cascade learning

**Decision:**
- Repo flipped public via `gh repo edit --visibility public`; Pages enabled with `build_type: workflow` via `gh api`. Live at <https://chomovazuzana.github.io/NbgAiHub/>. Closes Issue #18.
- Brand link + logo `src` made base-aware via `import.meta.env.BASE_URL` in `SplashAwareHeader.astro` (Astro doesn't auto-prefix raw `<a>` and `<img>` attributes).
- Topnav inner container centered via `margin-inline: auto` on `.nbg-topnav__inner` in `MarketingShell.astro`.
- 3 visual regressions on live (search trigger size, my-pins h3 size, `⌘K` hint reappearing) all traced to one root cause: **Starlight ships CSS unlayered, beats `@layer nbg.components` in production CSS order**. Fixed with `!important` on the specific properties + fully-global `:global(...)` selectors. New Issue #20; project memory `feedback_starlight_unlayered.md`.
- `TokenInvalidError` now auto-signs-out (in `my-pins.astro` + `PinButton.astro`) instead of dumping 401 JSON.

**Why:** Free Pages requires public repo. The unlayered-cascade behaviour is in the CSS spec (unlayered rules win over any `@layer` block); local dev order masked it.

**Refs:** commits `954b5dd`, `bf5b320`, `55e74e0`, `e8116eb`, `8b76942`. Tests: site 310/310, pipeline 205/205.

---

## 2026-05-26 — Listing-page parity pass + sign-in modal redesign + violet→teal focus-ring fix

**Decision:**
- Tips + Skills redesigned as structural twins of Foundations: `.hero hero--stack` title, inline filter (no own chrome), parallel section grouping. Shared row CSS in new `site/src/styles/listing-rows.css`.
- Hover-revealed pin icon on every listing row (`opacity: 0` at rest, `1` on row hover); click while signed-out dispatches `nbgaihub:open-signin-modal`. `PinButton` gains `iconOnly` prop.
- `SignInModal` redesigned end-to-end: centered via explicit `position: fixed; transform: translate(-50%, -50%)`; serif italic title; teal `01`/`02` numbered step cards; primary CTA "Sign in" (was "Validate & sign in"). All `data-nbg-signin-*` hooks preserved.
- Focus-ring token fixed site-wide: `--nbg-sh-focus-ring` overridden in `tokens/semantic.css` (light + dark) with `var(--nbg-bg)` + `var(--nbg-accent)`. Primitive in `tokens/primitives.css` still violet (Issue #19, semantic override wins).

**Why:** Operator review flagged listings felt off vs Foundations, modal pinned top-left, purple focus rings sitewide.

**Refs:** site 310/310 tests after rebuild; doc counts unchanged.

---

## 2026-05-25 (late-night) — UAT-driven UX overhaul

**Decision (UAT-feedback-2026-05-25.md, 16 of 17 ops-approved fixes):**
- Tip + Skill detail pages: solved by redesigning listings as single-column rich-row lists with `#tip-<slug>` / `#skill-<slug>` anchors. No new per-item routes.
- `AudienceFilter`: 3-checkbox → single-select segmented (Everything / For beginners / For experienced). LocalStorage array auto-migrates to string.
- Glossary: uniformity via renderer (IN ONE LINE / IN DETAIL / LEARN MORE zones around each entry's body) — no 36-file content rewrite.
- My Pins: 2-column layout (CTA panel + 4-card FAQ aside, `01`/`02`/`03`/`04`).
- `/submit-skill/` + `/contribute/` pages **deleted** (PAT-paste form read as phishing to non-devs). CI validator retained for direct-PR contributions. All `556lowcodenocode.github.io/Onboarding` references purged from 65 content files (`deeper_link: null`).
- `PinButton.setSignedOut()` hides the button entirely (no per-card "Sign in to pin" nag).
- Shiki dual-theme `{ light: 'github-light', dark: 'github-dark' }`; `pre.astro-code` bg overridden to `var(--nbg-c-teal-900)` for on-brand dark teal code blocks.
- Homepage: "New here?" intro panel, compass/lightning router icons, trailing-period H1 tic dropped, entry counts removed, truncated previews fixed (`line-clamp` removed), footer rewritten without repo link.
- `⌘K` hint hidden; theme toggle gets `title`/`aria-label`. Mobile hero clamp lowered to `1.75rem` min.

**Why:** Demo-day prep for colleague review; UAT pass surfaced ergonomic + tone gaps.

**Refs:** 310/310 tests after 3 stale-assertion updates. Operator declared demo-ready.

---

## 2026-05-25 (late-evening) — Micro-port from Crist + Onboarding guide

**Decision:** 4 surgical additions from external Claude Code references; 10+ candidates rejected for duplicating the Onboarding guide.
- `glossary/context-window.md` body: glass-of-water metaphor (every prompt/file/output pours in; full glass → oldest spills).
- `glossary/claudemd.md` body: "great long-term memory but amnesia about this morning" framing.
- New `tips/permission-modes.md` — Shift+Tab cycle (default / auto-accept-edits / plan).
- New `tips/prompt-briefing-template.md` — Role/Goal/Task/Constraints/Context, targets non-code work (existing `prompt-bad-vs-good-openers.md` is dev-shaped).

**Why:** Strengthens existing weak lines (vague "working memory" → vivid metaphor) and fills real gaps (no permission-modes coverage, no generic non-code briefing template).

**Refs:** Tip count 12 → 14. AUTO blocks regenerated.

---

## 2026-05-25 (evening) — Day 1 UX redesign + project-wide glossary tldr rewrite

**Decision:**
- Day 1 hero retitled "Where to start. Practically"; added 5-step chip-row overview under lede (inline IntersectionObserver active-state).
- Per-step `01`–`05` pill badge as primary visual landmark (mono "Step N / 5" eyebrow stays as global progress counter).
- Bottom CTA grid-3 → grid-2 (drop Skills card per operator direction).
- **All 36 glossary `tldr` rewritten in plainspoken beginner language.** Jargon-as-explanation ("statistical engine", "USB-C for AI integrations") swapped for analogies + concrete examples. Voice rule going forward: tldrs explain *to* beginners, not *between* experts.
- 2 new entries: `glossary/github.md` (the platform; distinct from `gh` CLI), `glossary/slash-command.md` (with `aliases: ["slash command", "slash commands"]` — hyphenated slug needs spaced variants).

**Why:** Operator flagged GitHub tooltip "filing cabinet…" as too dense for beginners — canary for systemic tldr-audience mismatch.

**Refs:** Glossary 34 → 36. Astro content-store cache gotcha hit again (Issue #17 — `rm -rf site/.astro` + restart needed).

---

## 2026-05-25 — Content-page reader mode, listing-page glossary auto-linking, MyPins redesign

**Decision:**
- New `mode="reader"` prop on `<MarketingShell>` → `data-mode="reader"` driving 5 quiet-rhythm CSS rules in `agentnews-layout.css`. New `.hero--stack` modifier. Applied to Foundations + Day 1.
- Glossary auto-linking extended to plain-text strings via new `site/src/lib/glossary-link-string.ts` helper. Shares the plugin's `getGlossaryIndex()`; emits identical button HTML. Wired into JSX-rendered card summaries + hero ledes (0 → 7-11 links per page).
- 2 new glossary terms: HTTP, API. Day 1 page cleaned (pullquote removed, Week 1 references + page deleted, "Where next" with Glossary card replacing Week 1).
- `/my-pins/` rebuilt as unified card pinboard (filter chips, real empty state, per-card unpin); fixed two Starlight-cascade bugs via Puppeteer + CDP `CSS.getMatchedStylesForNode`.
- `/glossary/` sticky rail actually sticky; `scroll-margin-top: 13rem` so hash anchors land below rail.
- Nested glossary tooltips ("hover inside hover") via build-time pre-linked `tldrHtml` + lazy nested `wire(pop)` on first show. Previous eager-recursive approach locked the page (hundreds of popovers + listeners).
- Local-dev `base: '/NbgAiHub'` removed from `astro.config.mjs` (broke local nav). Env-driven re-add later (Issue #18, since closed 2026-05-26).

**Why:** Listings showed terms in plain text while bodies linked them; my-pins felt like a barebones admin list; tooltips were terminal nodes that broke the navigation graph.

**Refs:** Visual-verification rule landed in global `~/.claude/CLAUDE.md` after the second blind-iteration Starlight margin bug.

---

## 2026-05-25 — Publish site to GitHub Pages (config landed)

**Decision:** Host static Astro build on Pages at `chomovazuzana.github.io/NbgAiHub/`. Configured `site` + `base: '/NbgAiHub'` + `trailingSlash: 'always'`. Added postbuild `site/scripts/rewrite-base-paths.mjs` for the 9 top-level routes. Pages workflow at `.github/workflows/deploy-pages.yml`.

**Why:** Free hosting matching the GitHub-as-CMS architecture; no new vendor.

**Constraint:** free Pages requires public repo — paths (a) flip public, (b) Pro $4/mo, (c) host elsewhere. Resolved 2026-05-26 (afternoon) — went public.

---

## 2026-05-25 — Navigation rework: two-door landing, News external

**Decision:**
- Sidebar flattened to one entry per pillar: Home · Foundations · Day 1 · Skills · Tips & Tricks · Glossary · News ↗ · My Pins (was 13 across 3 groups).
- `/news/` hard-redirects to `https://biks2013.github.io/AgentNews/` via `astro.config.mjs#redirects`. `site/src/pages/news/` deleted. Branding rule: "News" everywhere in UI, never "AgentNews".
- `/reference/` deleted (14 entries were redundant with Tips/Glossary or `status: "planned"`).
- `/contribute/`, `/submit-skill/`, `/start-here/week-1/` left as orphan routes (Issue #14).
- Landing page rewritten as two-door router: Newcomer card (teal-soft, Foundations + Day 1) vs Experienced card (4-pill row: Skills / Tips / Glossary / News ↗).

**Why:** User feedback "well-hidden information across subpages"; two-door makes the audience split explicit.

**Refs:** 232 site tests passing. Surfaced the Starlight `.sl-markdown-content` sibling-margin gotcha — `:not(a, ...) + :not(a, ...) { margin-top }` adding phantom 16px. Override `.router-grid > * + * { margin-top: 0 }`. Drove the new global "Visual verification" rule.

---

## 2026-05-25 — Glossary auto-link + hover tooltips (build-time, first-occurrence-only)

**Decision:**
- Custom remark plugin `site/src/plugins/remark-glossary-link.ts` walks markdown AST at build time. Wraps first occurrence per page of each glossary term (or alias) in `<button data-glossary-slug="…">`. Skip rules: code fences, inline code, headings, existing links, Starlight asides, own glossary page, `/news/published/`.
- Primitive `GlossaryTerm.astro` (17th, AC36/AC37 portable — zero Starlight imports) injects per-page JSON manifest + wiring script. Hydrates buttons into HTML `<span popover="auto">` tooltips: title + tldr + "Read more →". Hover/focus/click/ESC.
- Schema extension: required `tldr` (≤160, plain text, no fallback) + optional `aliases: string[]` (default `[]`).
- 7 new glossary terms backfilled: cli, frontmatter, yaml, markdown, rss, model, **hook** (caught mid-flight). Glossary 21 → 28.
- Three pages explicitly wire the plugin into `createMarkdownProcessor()` because Astro's content-collection `render()` bypasses project `markdown.remarkPlugins`: `foundations.astro`, `day-1.astro`, `glossary.astro` (Issue #15).
- Post-review follow-ons same session: XSS-safe JSON manifest escape (`<`/`>`/U+2028/U+2029); `alias.min(1)` schema tightening; popover positioning anchored at trigger bottom-right with viewport-edge clamping + scroll/resize repositioning.

**Why:** Make glossary load-bearing across all surfaces. Build-time linking is single-source-of-truth (no author burden, no rot on slug rename).

**Refs:** `docs/design/project-design.md` §S.14; `docs/design/plan-006-glossary-tooltips.md`; `docs/refined-requests/glossary-tooltips.md`; `docs/reference/authoring-glossary-terms.md`.

---

## 2026-05-21 — Reddit OAuth path parked; Reddit feeds reverted to `.rss`

**Decision:** Reddit feeds revert to `type: "rss"` + `www.reddit.com/r/<sub>/.rss`. OAuth + engagement-filter + JSON-parser code stays as dormant ready-to-reactivate scaffolding (`pipeline/src/{reddit-auth,parse-reddit,reddit-filter}.ts` + `readRedditCreds` + `fetchFeedXml.authToken`).

**Why:** Reddit blocks unauthenticated JSON from GH Actions IPs (403). Reddit's script-app creation form rejected captcha submissions across browser attempts (likely extensions / low-trust-account / network filtering). Not a code-side problem.

**Trade-off:** Engagement floor (drop stickies, `score>=50`, `num_comments>=10`) is **not active** — Atom has no engagement fields. 22:00 UTC cron shift **stays** (independent). Reactivation path: retry app creation on different browser/network, add `REDDIT_CLIENT_*` secrets, flip 2 entries in `config/rss-sources.json` (`type` + URL). No code change.

**Supersedes:** the same-day "Reddit feeds switch to JSON endpoint + engagement floor" and "Reddit access via Application-Only OAuth" entries (decisions still valid as dormant code; current runtime config differs).

**Refs:** Issue #13. Pipeline 205/205 tests still pass (dormant code paths covered, never entered).

---

## 2026-05-19 — Rolling 7-day retention for `news/published/`

**Decision:** Each daily pipeline run prunes any `news/published/<YYYY-MM-DD>-*.md` with date prefix strictly older than `today - 7 days` (UTC). Pruning lands in the same commit as the day's new items via new `pipeline/src/retention.ts` (`RETENTION_DAYS = 7` hardcoded, no fallback). Workflow gates direct-push branch on new `had_changes` step output.

**Why:** Bounded repo size + freshness for an ephemeral pillar.

**Refs:** Pipeline tests 145 → 161.

---

## 2026-05-19 — Unconditional auto-promote (reverses earlier same-day variant C)

**Decision:** Drop `editor_confidence` half of the auto-promote gate. Flip all feeds to `auto_promote_eligible: true`. Every relevant triaged item writes direct to `news/published/`; workflow pushes to `main` with no PR. `auto_promote_eligible` retained as per-feed kill switch.

**Why:** Daily-PR-review friction outweighs the cost of occasional off-topic Reddit posts. Cross-feed title dedup is now the load-bearing quality control.

**Supersedes:** earlier same-day "Auto-promotion of high-confidence professional-source news items" (variant C). Infrastructure (per-feed flag, 3-mode workflow branching, PR body splitting) stays in place; only policy values changed.

**Refs:** Pipeline tests 145 still pass.

---

## 2026-05-19 — Personalization + community contributions: PAT-scoped gist + URL-redirect submissions

**Decision:**
- Favourites: paste a `gist`-scope PAT into a sign-in modal; favourites live in user's unlisted gist `nbgaihub-favorites.json` (shape `{schema_version: 1, favourites: [{type, slug, pinned_at}]}`, last-write-wins read-modify-write).
- Skill submissions: GitHub `new file` URL redirect (`github.com/<owner>/<repo>/new/main/skills?filename=&value=`), not browser-side write APIs. CI validator catches malformed entries at PR time.

**Why:** Original Device Flow + OAuth App design blocked by CORS on GitHub's OAuth handshake endpoints. Cloudflare Worker proxy was the recommended fix; rejected to keep the project zero-infrastructure. PAT-paste reuses GitHub's existing token UI; `gist` scope narrower than `repo`. Gist is **unlisted not private** — 32-char hex URL is unguessable but not auth-protected (documented in user-facing privacy callout).

**Reverses:** SCOPE.md "Per-user personalization or bookmarking" (was Out of Scope) and "Community contributions" (was Deferred). Now MVP-IN.

**Refs:** `docs/refined-requests/personalization-and-contributions.md`; `docs/design/plan-003-personalization-and-contributions.md`; `docs/reference/gist-contract.md`. Commits `c1df291`, `5a08260`, `64f83b2`.

---

## 2026-05-19 — Hub plugin (plan-003) shipped

**Decision:** `/hub` plugin operational. Eleven `/hub-*` commands ship in `plugin/` sibling to `pipeline/` and `site/`. Marketplace at repo-root `.claude-plugin/marketplace.json` (`source: "./plugin"`); plugin manifest at `plugin/.claude-plugin/plugin.json`.

**Architectural calls (non-negotiable):**
- Commands filesystem-discovered from `plugin/commands/*.md` (no `commands` array in manifest).
- Per-user state at `${CLAUDE_PLUGIN_DATA}/state.json` (fallback `$XDG_DATA_HOME/claude-code/plugins/nbg-ai-hub/state.json`). State CANNOT live in repo.
- `/hub-open devMode: true` until production deploy (flip to `false` post-Pages — Issue #3).
- `/hub-refresh` via `git pull --ff-only --depth 1` into `~/.cache/nbg-ai-hub/snapshot/`. Reuses user's git auth.
- TS-guard frontmatter validation (not Zod) keeps bundle small. Search: pure TS, title×5 + topics×3 + body×1.

**Refs:** 130/130 tests; `docs/refined-requests/hub-plugin.md`; `docs/design/plan-003-hub-plugin.md`.

---

## 2026-05-19 — UI redesign: Linear/Vercel/Stripe aesthetic + Option 1 hybrid (theme Starlight, don't replace)

**Decision:** Keep Starlight; deeply theme via three-tier CSS custom-property tokens (~245 declarations). Bespoke layouts for 11 marketing surfaces via `MarketingShell.astro` wrapping Starlight's `splash` template. Content-detail pages keep Starlight chrome with `--sl-color-*` aliases. 16 primitives under `site/src/components/primitives/` are Starlight-free (AC36 portability gate — verified by grep for zero `@astrojs/starlight` imports).

**Why:** Option 2 (replace Starlight) reserved as escalation if Option 1 unsatisfying. Portability hedge means Option 2 only needs to rebuild MarketingShell, not the design system. Pure CSS custom props + Cascade Layers cover the design ceiling without adding Tailwind/UnoCSS.

**Refs:** 39/39 ACs MET, 14/14 DoD met, 174/174 tests. `docs/design/project-design.md §S.13`; `docs/design/plan-004-ui-redesign.md`.

---

## 2026-05-19 — Unified header via Starlight `Header` override + auth-state CSS fix

**Decision:**
- Override Starlight's `Header` with `SplashAwareHeader.astro`. On splash pages: one unified `<nav class="nbg-topnav">` with brand + section links + Search + `<AuthControls />` + ThemeSelect + mobile drawer + `<SignInModal />` mount. On non-splash: default Starlight Header markup.
- New `AuthControls.astro` extracted from `SocialIconsOverride`. CSS rule `.nbg-auth__signin[hidden], .nbg-auth__chip[hidden] { display: none !important }` to defeat author `display: inline-flex` beating `[hidden]` UA default.

**Why:** Before override, MarketingShell rendered nav INSIDE Starlight's content slot → two stacked navs, "NbgAiHub" twice, auth-state showed Sign in + signed-in chip simultaneously.

**Supersedes:** 2026-05-14 §S.13.14.3 "Header override rejected as fragile". New override is narrow (one conditional, no behavioral wrappers); fragility cost < two-stacked-navs cost.

**Refs:** 215/215 tests.

---

## 2026-05-18 — Foundational architecture (settled architecture, see code for ground truth)

- **Triangle architecture.** Single GitHub repo holds markdown source of truth. Astro Starlight builds static web UI. Claude Code plugin reads same content for `/hub-*` commands. Markdown native to both Claude Code and contributors.
- **Curated RSS, not auto-aggregated.** GitHub Action fetches feeds daily; manual PR promotion to `/news/published`. (Later relaxed 2026-05-19 to unconditional auto-promote — see entry above.)
- **Astro Starlight as SSG.** Cloudflare/Tauri/Biome reference users; built-in tag filtering, sidebar, dark mode, search, MDX.
- **Skill is the differentiator; web UI is table stakes.** Internal portals die unbookmarked; skill lives inside Claude Code.
- **Project docs pattern.** SCOPE.md (mutable) + DECISIONS.md (append-only) + project CLAUDE.md (wiring).
- **Onboarding guide is complementary, not duplicative.** Hub deep-links into `556lowcodenocode.github.io/Onboarding`; doesn't absorb or rewrite it.
- **Five user-facing pillars + cross-cutting substrate.** Skills · Tips & Tricks · News · Curated journeys · Glossary+Reference. (Reference removed 2026-05-25.)
- **Shared content shape across all pillars** — one frontmatter schema (`type`, `title`, `audience`, `topics`, `internal`, `authored`, `last_reviewed`, `external_link`, `deeper_link`, `ai_summary`).
- **Tips & Tricks distinct from Skills.** Tips = *read and apply manually*; Skills = *install once and invoke*.
- **Hub ships as its own Claude Code skill plugin.** One command bootstraps a colleague (`/plugin marketplace add chomovazuzana/NbgAiHub`).
- **Hybrid glossary.** Canonical `/glossary` page with anchors; inline links from elsewhere. No definitions duplicated. (Auto-link layer added 2026-05-25.)
- **AI strategy: build-time + Claude skill, not web runtime.** RSS triage via Azure OpenAI; runtime AI is the user's Claude session via `/hub-*`. No chatbot on the website.
- **Reframe "marketplace" → "hub" / "field manual"** (early framing call).

---

## 2026-05-18 — Repo: `chomovazuzana/NbgAiHub`, PRIVATE (supersedes prior public decision)

**Decision:** Repo on personal account `chomovazuzana`, single-repo, **private**. Naming + location + structure of the prior public-repo decision stand; only visibility flips.

**Implications:**
- Pages on a private repo on personal account requires Pro ($4/mo). Hosting was open until 2026-05-26 when repo went public for free-tier Pages.
- Bank-internal content technically permissible, but bank-confidential material still needs compliance review (personal account ≠ bank-managed infrastructure).
- Contributors added as individual collaborators (no public fork-and-PR).

**Resolved:** Hosting question closed 2026-05-26 — repo went public + Pages enabled.

---

## 2026-05-18 — Tooling pins (settled, see package.json for truth)

- **RSS library:** `@rowanmanning/feed-parser ^2.x`. `rss-parser` was effectively unmaintained (~3y no release, ~20 open '24 bug reports, no maintainer response). Tested against ~40 real-world feeds; typed `INVALID_FEED` errors; cleaner fetch/parse seam for testing.
- **Test framework:** Vitest ^4.1.6 (upgraded from 2.1.9 to clear 5 moderate-severity dev-tree CVEs).
- **Astro 6 + Starlight 0.39.** Astro 6 stable 2026-03-10; Starlight 0.38+ dropped Astro 5 support; 0.39 requires Astro 6. Greenfield workspace, zero migration cost.

---

## 2026-05-18 — RSS pipeline triage tightening (cumulative; superseded in parts)

Three rounds of prompt tightening across 2026-05-18 are captured here as the settled current state.

**Decision (current `pipeline/src/triage.ts` SYSTEM_PROMPT):**
- **Source-aware system prompt** with per-source-group rules (not per individual feed).
- **Two source groups.** Reddit group (r/ClaudeAI + r/ClaudeCode): 4 ACCEPT categories — tips/tricks, field reports, platform news, professional/enterprise use. Major tech/AI news group (HN/Wired/Verge): ACCEPT major model launches, capability breakthroughs, strategic moves, regulatory/policy with concrete impact, safety/security incidents, new developer-facing platforms; REJECT consumer gadget, AI-as-keyword content, paywalled previews, Claude-name false positives.
- **Cross-cutting rules:** English only; substance threshold; no retired-model content; **when in doubt, reject**; title-scannability (TITLE must be self-describing).
- **6 Reddit REJECT categories** added in round 2: celebratory personal projects, tool/extension announcements, personal setup stories, cost-tracking/spending, Reddit subculture jargon, feedback-solicitation. 11 anchored REJECT examples from actual flagged titles.
- **`editor_confidence` field** (high/medium/low) on every triage response, propagated to frontmatter (13 keys total) + PR body. Confidence prompt tuned to spread distribution (RESERVE high for stake-your-reputation; LOW when guessing; when in doubt go LOWER).

**Refs:** Tests grew 88 → 93 → ~120+ as rounds added.

---

## 2026-05-18 — RSS cron 22:00 UTC

**Decision:** Daily cron at `0 22 * * *` UTC = 00:00 Athens winter / 01:00 Athens DST.

**History:** Originally pinned 05:00 UTC for ~08:00 Athens. Shifted to 22:00 UTC on 2026-05-21 so previous-day Reddit posts have time to accumulate engagement before the cut. Cron shift stayed when Reddit OAuth path was parked.

---

## 2026-05-18 — Final feed list

**Decision (current `config/rss-sources.json`, 5 feeds):**
- **Reddit group:** r/ClaudeAI, r/ClaudeCode (both `type: "rss"`)
- **Major tech/AI news group:** Hacker News frontpage (unfiltered), Wired AI tag feed, The Verge full firehose

**Dropped (by direction 2026-05-18):** Anthropic news (feed 404 — deleted by Anthropic), Claude Code GitHub releases (`releases.atom`), Simon Willison's blog. Easy to re-add; documented for visibility.

**Trade-off:** Verge firehose + unfiltered HN roughly double daily item count (~120-180/day @ ~$0.001/item → ~$0.10-0.20/day Azure cost). Acceptable.

---

## 2026-05-18 — Operational milestones

- **RSS pipeline verified operational end-to-end.** Workflow run `26047997638`, 2m46s success, PR #1 with 43 items across 4 of 5 feeds. All 4 Azure secrets + GH Actions PR toggle wired. DoD #12 satisfied.
- **Astro Starlight site verified operational locally.** `npm run dev` → 200 on localhost:4321. Astro v6.3.5 + Starlight v0.39.2. AC1-AC20 all MET per `docs/reference/integration-verification-astro-site.md`. Production hosting was open until 2026-05-26.
