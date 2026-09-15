# UAT analysis — colleagues — 2026-05-26

## Executive preamble

Five bank colleagues — Elisavet, Mina, Natasa, Maria, Dimitris — were walked through the live NbgAiHub site at <https://chomovazuzana.github.io/NbgAiHub/> and gave open-ended UAT feedback. Their raw transcripts (mixed English/Greek, mixed surface coverage, mixed level of technical background) sit at `UAT-feedback-colleagues-2026-05-26.md` at the repo root.

This document consolidates those transcripts into a deduplicated, anonymised set of themes; validates each theme against the current state of the site (source under `site/`, deployed Pages build, `Issues - Pending Items.md`, and recent DECISIONS / SCOPE entries); and for every validated theme proposes five distinct improvement variants spanning from a minimal copy / CSS tweak through to an ambitious rebuild. Themes are flat — not ranked. The operator picks the shipping order downstream from this menu.

Methodology: cluster transcripts into themes (split when remediations diverge, merge when remediations are the same) → mark each theme `confirmed` / `partially confirmed` / `recently mitigated` / `misread` with concrete evidence → for validated themes propose exactly five constructive variants, each carrying an `Effort:` enum label, a `Tradeoff:` line, and a `Helps non-technical colleagues by:` line, with the five variants spanning at least three distinct effort levels so the operator can pick a level of investment per theme.

No colleague names appear in theme bodies — themes stand on their own merits per the operator decision at the refinement gate.

---

## Recommended implementation choices (2026-05-27 review)

This section is the **operator-facing shortlist** — one preferred variant per theme (occasionally two when the theme bundles distinct sub-concerns). Picks are guided by four lenses:

1. **Coherence** — reuse existing patterns (chip-row + IntersectionObserver from Day 1, MarketingShell primitives, glossary remark plugin, two-door router) rather than introduce new affordances.
2. **Navigation ease** — favour fixes that *remove* surface; resist new pages / new pillars / new sidebar entries unless the gap is large.
3. **Smooth for non-technical** — minimal/light effort that ships quickly beats ambitious rewrites for the audience the hub is built for.
4. **Relevance check** — for "partially confirmed" themes (esp. 2, 9, 10, 11, 13, 16, 18), lean light — part of the complaint is often misread or out-of-scope per SCOPE.md / DECISIONS, and the right move is to address the *real* sub-concern without revisiting settled calls.

Chosen variants are marked **★ RECOMMENDED** inline in each theme below.

### Summary table

| # | Theme | Pick | Effort | Why this one |
|---|-------|------|--------|--------------|
| 1 | Foundations long scroll | **V2** default-collapsed accordion per step | moderate (in practice ~minimal — native `<details>`) | Most faithful to the reviewer's literal ask ("the sections… we could choose to open them"); shrinks perceived page length at first paint rather than just adding navigation aids to the same long scroll. Pattern is appropriate because Foundations is *conceptual primer* content (graze titles, dive into what interests you), unlike Day 1 which is procedural and benefits from linear chip-row flow. |
| 2 | Homepage overwhelming | **V1** drop below-fold Skills/Tips grids | minimal | Lets the two-door router actually do its job; the 4-pill Experienced card already covers catalog access. |
| 3 | No "why am I here?" | **V1** "why we built this" paragraph in hero callout | minimal | Pure copy; no new component; pairs with Theme 9 V1 to layer the answer. |
| 4 | Examples / case studies missing | **V1** worked CLAUDE.md sample inline | minimal | Concretises the single most-asked-for gap; pairs with Theme 7 V2 ("show, don't tell" thread). |
| 5 | Day 1 sequencing + Mac/Win + shell vocab | **V1 + V2 + V3 (multi)** reorder steps + shell glossary entries + expanded Windows sub-section | minimal + light + moderate | Three sub-concerns → three minimum-footprint fixes; V4 (ShellCmd primitive) explicitly avoided because it compounds Theme 6 tooltip chaos. |
| 6 | Tooltip chaos | **V1** cap nested popover depth at 1 | minimal | Surgical, reversible, removes the cascade entirely; preserves hover affordance for power users. **Ship before Theme 18 V1 so the new glossary entries don't deepen the chaos.** |
| 7 | "Why use this" on skills | **V1 + V2 (multi)** time-saved chip + worked scenario | minimal + moderate | Reviewer's underlying goal is *the user understands the gain* — that needs the time number **visible** (chip) AND grounded (scenario). V2 alone buries the number inside prose; V1 alone reads as marketing claim. Together they're the comparison the reviewer asked for, without V3's strawman risk. |
| 8 | Filters + grid view | **V1** chip topic filter above AudienceFilter | light | Closes the "categorise them" half cleanly; V2 (grid view) deferred — author intent vs density tradeoff isn't worth the CSS surface for 6 + 14 entries. |
| 9 | News off-site + no About | **V1** add `/about/` page, footer-linked | minimal | Fills the real "who built this?" gap without re-opening the deliberate 2026-05-25 News redirect decision. |
| 10 | Pinning UX confusion | **V1** toast notification on pin action | light | Likely root cause is "did the click do anything?" not a code bug per codebase-scan §4.7; toast closes the loop with the lowest infra footprint. |
| 11 | `--dangerously-skip-permissions` framing | **V4 + new deep-dive tip** reconciliation callout in Day 1 Step 2 + new `tips/dangerously-skip-permissions.md` explaining the flag in depth | minimal + light | Team keeps the flag as the recommended Day 1 launch command (no posture change, no DECISIONS supersedure). The callout in Day 1 defuses the apparent contradiction with "always review the diff" in-place; the new tip carries the deep explanation (what the flag does, what it does NOT do, when to deviate) so Day 1 stays lean. |
| 12 | GitHub-account + bank-email | **V1** expand Step 5 wording (email / username / 2FA) | minimal | V2 dropped 2026-05-27 — hub does not comment on Claude pricing / NBG billing. |
| 13 | Sign-in PAT intimidating | **V1** inline screenshots of GitHub token page in SignInModal | light | V3 dropped 2026-05-27 — no staffed team channel yet. Revisit if/when a channel is monitored. |
| 14 | Project-hygiene tip | **V1** project-hygiene tip (clean CLAUDE.md / no stale files) | minimal | V3 dropped 2026-05-27 — operator will add the missing skills (create-apis / sandbox / superpowers) in a later round. Defer that work; do not seed placeholders. |
| 15 | Glossary count drift (36 vs 34) | **V2** read collection length at build time | minimal | Future-proofs against the same drift recurring; both V1 and V2 are minimal but V2 only takes one extra line and never breaks again. |
| 16 | Greek-language affordance | **V1 + V2 (multi)** hero one-liner + dedicated prompting-in-Greek tip | minimal + light | Closes the actionable concern (prompt-in-Greek visibility) without revisiting SCOPE.md's deferred bilingual-UI bucket. V3 explicitly avoided — partial bilingualism feels broken. |
| 17 | Sandbox surface absent | **V2** asciinema-style terminal session recordings on homepage + key tips | moderate | Authentic recordings beat staged "play prompt" demos (V1 risks feeling fake) and stay coherent with the static-site model (V4 = backend, V3 = workshop-as-content). Joins the visual thread (13/19). |
| 18 | Tech vocab (Docker/Postgres/etc.) | **V1** author 5 new glossary entries (docker, postgres, database, container, bash) | light | Reuses the existing glossary auto-link plugin; closes the highest-friction terms first. **Ship only after Theme 6 V1's depth cap** or this expansion makes tooltip chaos worse. |
| 19 | Visual content absent | **V2** annotated screenshots on Day 1 + key tips | light | Highest impact/effort; uses existing image pipeline; joins the visual thread with 13/17. SVG diagrams (V1) deferred — harder to author well. |
| 20 | NBG logo flicker | **V1** inline theme-attribute script in `<head>` | minimal | Root-cause fix for the FOUC pattern at initial paint; no symptom-masking, no new primitive. |

### Shipping-order dependencies (only the ones that matter)

- **Theme 6 V1 must ship before Theme 18 V1.** Capping nested-popover depth must land before the 5 new glossary terms are added, or the cascade gets worse before it gets better.
- **Theme 2 V1 should ship before Theme 19 V2.** Stripping the below-the-fold homepage grids first frees visual budget for screenshots elsewhere.
- **Themes 3 V1 + 9 V1 pair.** The hero paragraph is the "elevator pitch"; the `/about/` page is the "expanded story". One without the other is half-coverage.
- **Themes 4 V1 + 7 V2 share a thread** ("show concrete examples, not abstract claims"). Author them in the same session for tone consistency.
- **Themes 13 V1 + 17 V2 + 19 V2 share a thread** ("embed visual reality"). Same recording/screenshot workflow; same accessibility checklist; ship as one batch.

### Explicit rejections (themes where a *non-picked* variant deserves a "do NOT pick this" note)

- **Theme 8 V4** (faceted-browse sidebar) — overkill for 6 skills + 14 tips; would feel "industrial" and clash with the inviting tone.
- **Theme 9 V3** (revive on-site `/news/`) — contradicts the deliberate 2026-05-25 nav rework. Operator owns this call; do not relitigate without explicit go-ahead.
- **Theme 10 V5** and **Theme 13 V5** (server-side auth + Worker backend) — already operator-rejected per Issue #9; do not reopen until PAT friction is a top-3 complaint, not a top-13 one.
- **Theme 14 V2** (skill placeholders with `status: planned`) — broken-promise risk noted by the analysis itself; only use as a fallback if Theme 14 V3 turns out to be blocked.
- **Theme 16 V3** (partial bilingual subset on homepage only) — worst-of-both-worlds per the analysis; toggling EL on the homepage then landing on English Foundations feels broken.
- **Theme 18 V3** (inline `<dfn>` expansions via a second remark plugin) and **Theme 18 V4** (separate beginner dictionary) — both compound the tooltip-chaos surface or split the glossary source-of-truth.

### Operator decisions — resolved 2026-05-27

| # | Theme | Question | Resolution |
|---|-------|----------|------------|
| 1 | T14 V3 | Do the missing skills exist? | **DROPPED.** Operator will add skills later. V3 removed; T14 ships V1 only. |
| 2 | T12 V2 | What's the Claude billing model? | **DROPPED.** Hub will not comment on Claude pricing / NBG billing. V2 removed; T12 ships V1 only. |
| 3 | T5 V3 | Is the bank's WSL guidance documented? | **CLAUDE RESEARCHES.** Implementation-Claude is to research current Microsoft WSL install + bank-laptop-realistic troubleshooting (admin rights, store access) and author the Windows section from scratch. No external NBG-IT page is being relied on. |
| 4 | T11 V3 | Move Day 1 off `--dangerously-skip-permissions`? | **DROPPED.** Team keeps the flag as Day 1 launch. T11 ships V4 (reconciliation callout) + new `tips/dangerously-skip-permissions.md` deep-dive tip. |
| 5 | T13 V3 | Is a staffed team channel available? | **DROPPED.** No channel watching yet. V3 removed; T13 ships V1 only. Revisit later. |

### Theme 3 V1 wording note

Operator owns the "why we built this" paragraph copy; the recommendation is structural (one paragraph in the existing hero callout slot, not literally a section titled "Why am I here?"), not editorial.

---

## Theme 1 — Foundations is one long scroll with no progressive disclosure

From the raw feedback:

> "In the foundations, where we have the 6 sessions, and to see them all we have to scroll all the way to the bottom of the page. As an end user I think that many times I don't make it to the end; it looks long, uh, and maybe it would help if the questions were summarized or, in any case, the sections, uh, and we could choose to open them so we can see them all. Again, the same content, but cut up, uh, so it doesn't tire us out and scare us 'Wow, I have so much to read.'"

**Verdict:** confirmed

**Evidence:** `site/src/pages/start-here/foundations.astro` lines 42–95 segment the markdown body on `## Step N — Title` and render every step's HTML inline below the hero. There is no above-the-fold map of the 6 steps, no accordion, no anchor list visible until you scroll. `journeys/foundations.md` is long-form by design (it is the primary explainer of *what Claude Code is conceptually*). Reader-mode (`mode="reader"` on `<MarketingShell>`) collapses chrome but does nothing to compress the scroll length itself.

### Variant 1 — Add a sticky 6-step rail to the right of the Foundations body
A right-rail TOC fixed at `position: sticky; top: var(--header-h)` listing the six step titles as anchor links. Active link tracks the IntersectionObserver pattern already used on the Day 1 chip-row. Collapses to a sticky-top horizontal chip-row under 880px.
- **Effort:** light
- **Tradeoff:** small primitive footprint (a new `TocRail.astro` or reuse the day-1 chip-row CSS), zero content rewrite, zero risk to existing copy. May feel cramped on tablet sizes where the rail steals horizontal column space.
- **Helps non-technical colleagues by:** giving them a visible "you are step 2 of 6" anchor so the page stops feeling infinite; one glance answers "how much more is there?"

### Variant 2 — Convert each step into a default-collapsed accordion with summary preview  **★ RECOMMENDED**
Replace the inline step blocks with native `<details>` elements. The `<summary>` shows the step title + a one-sentence teaser pulled from the first paragraph; clicking expands the full body. Step 1 opens by default. Reader-mode CSS already handles the no-borders aesthetic; the accordion arrow is a simple chevron token.
- **Effort:** moderate
- **Tradeoff:** changes the reading rhythm — readers who want the linear flow now have to expand each step or click an "Expand all" link. Search/find-in-page still works because `<details>` content is in DOM. Slight loss of view-transitions polish since `<details>` toggles aren't animated by default.
- **Helps non-technical colleagues by:** making the page feel scannable in one screen — the perceived length drops from "wow that's long" to "six titles I can choose from".

### Variant 3 — Promote a single above-the-fold "What you'll learn in 6 steps" summary panel
Insert a `.hero__summary` block immediately under the hero lede listing the 6 step titles as a numbered, anchor-linked vertical list (no expand/collapse). The body below is unchanged — long-form remains long-form, but the reader has seen the whole skeleton before deciding to scroll.
- **Effort:** minimal
- **Tradeoff:** doesn't actually reduce scroll length; only sets expectations. Some readers might skim the summary and bounce without reading the body, but that's an acceptable outcome for a beginner page (they at least see the shape of what they'd be learning).
- **Helps non-technical colleagues by:** removing the "wall of unknown" anxiety on first arrival — they can decide to commit to the read because they know it's six bounded chunks, not an open-ended essay.

### Variant 4 — Split Foundations into 6 separate routed pages with prev/next pager
Break each `## Step N` into its own `/start-here/foundations/<n>-<slug>/` route. Reuse Astro's static page generation. Each page has its own URL (shareable), a prev/next pager at the bottom, and a breadcrumb back to the index. The index page (`/start-here/foundations/`) becomes a stripped-down dashboard of the 6 cards.
- **Effort:** substantial
- **Tradeoff:** more code surface (6 new pages or one `[slug].astro` dynamic route), need to redo the glossary auto-link wiring per page (Issue #16 already documents the per-segment vs per-page first-occurrence quirk), and external links pointing at `/start-here/foundations/` would need to redirect or anchor-link. Buys you per-step deep-linking, per-step pin-ability via the existing PinButton, and clean separate analytics.
- **Helps non-technical colleagues by:** every page is small enough to finish in one sitting; the act of clicking "Next →" gives them a sense of progress, which a long scroll cannot.

### Variant 5 — Replace Foundations long-form with a 3-minute illustrated explainer (video or animated diagram set) + Day 1 deeplink
Keep the markdown source as the authoritative reference but front the page with a 3-minute embedded video (or scroll-animated SVG sequence) walking through the same 6 conceptual beats. Below the video: a "Read the full explainer" disclosure and a primary CTA to "Skip ahead to Day 1 setup". Aligns directly with one transcript's "I can't read that much text, images and diagrams help me a lot" framing.
- **Effort:** ambitious
- **Tradeoff:** content production overhead (record screen + voiceover + edit, or commission an illustrator for the animated SVG); hosting an MP4 inflates the static bundle or pulls in a third-party embed (YouTube/Vimeo); accessibility requires captions + transcript. Highest impact for the lowest-text-tolerance audience, lowest impact for readers who actually prefer text. Does NOT replace the markdown — it overlays it.
- **Helps non-technical colleagues by:** finally addressing the "image/diagram help me more than text" learning style that at least one reviewer named explicitly, and lowering the cognitive load for everyone for whom English is a second language.

---

## Theme 2 — Homepage is overwhelming for a true beginner; landing should be minimal until the reader picks a level

From the raw feedback:

> "First, don't have all the material in the home page, because it scares you. I'd prefer a minimal home page and then expand after I choose a level."

**Verdict:** partially confirmed

**Evidence:** `site/src/pages/index.astro` already implements a "two-door router" pattern (Newcomer card with compass icon + teal halo; Experienced card with 4-pill row) above the fold per the 2026-05-25 nav rework (DECISIONS 2026-05-25). However below the fold the page still renders the top-6 Skills grid (lines 137–168) AND the top-6 Tips grid (lines 169–193) AND a Glossary teaser AND a footer-area Foundations CTA. So the "two doors" message is undermined by a 4-section dump below them. From a true beginner's first-paint perspective, the screen is busy.

### Variant 1 — Drop the below-the-fold Skills + Tips grids on the homepage  **★ RECOMMENDED**
Cut the `<section>` blocks at `index.astro` lines 137–193. Keep only: hero + intro callout + two-door router cards + footer. The homepage becomes a literal traffic router. Skills/Tips remain one click away via the Experienced card's 4-pill row and the global nav.
- **Effort:** minimal
- **Tradeoff:** Experienced users lose the at-a-glance "what's new in the catalog" surface. Mitigation: the 4-pill row in the Experienced card already routes to those listings in one click. Risk: feels too sparse to some operators — currently the homepage is doing double duty as both landing AND content index.
- **Helps non-technical colleagues by:** the first screen now contains only the one decision they need to make ("am I new or experienced?"); nothing else competes for attention.

### Variant 2 — Lazy-reveal the catalog grids only after a router-card click registers intent
Keep the Skills/Tips/Glossary previews in the DOM but `display: none` them by default. Wire the Newcomer card click to additionally reveal the "Foundations + Day 1" path (and only that), the Experienced card click to additionally reveal the 4-section catalog teaser. Use the existing `nbgaihub:audience-changed` event pattern.
- **Effort:** moderate
- **Tradeoff:** introduces client-side state on the homepage (currently zero JS-driven layout). A returning visitor's "I'm experienced" choice could persist in `localStorage` — but per the recent operator decision to drop AudienceFilter persistence on Skills/Tips, persisting state on the homepage may contradict the broader direction. Validate the contradiction explicitly.
- **Helps non-technical colleagues by:** they are never shown the experienced-user catalog at all until they self-identify, so the early-stage anxiety of "what are all these technical-looking tiles" never fires.

### Variant 3 — Replace the homepage entirely with a single-question landing modal
Make the landing route a near-empty page with one centered card: "Have you used Claude Code before?" + two buttons (Yes / No). Yes routes to `/skills/`. No routes to `/start-here/foundations/`. Persist the choice in localStorage so returning visitors skip the question. The current rich homepage moves to `/home/` for explicit reference but never auto-loads.
- **Effort:** substantial
- **Tradeoff:** strongest possible "minimal home" expression but loses the brand surface (the hero copy that names Claude Code as a terminal AI assistant is genuine onboarding value, especially for the colleague who asked "tell me *why* we're on this page"). Could be mitigated by showing the "What is Claude Code?" intro callout above the question.
- **Helps non-technical colleagues by:** zero scanning, zero scrolling, zero decision overload — one question, two buttons, the routing is done for them.

### Variant 4 — Keep current homepage structure but defer the Skills/Tips grids behind an "Explore the catalog" disclosure
Wrap the bottom-of-page grid sections in a `<details>` with summary "Explore the catalog". Default-collapsed for first-time visitors, default-open for returning visitors (read `localStorage.nbgaihub.has-visited`). First-paint stays minimal; the catalog stays one keystroke away.
- **Effort:** light
- **Tradeoff:** disclosure-widget UX is mediocre on touchscreens and screen-readers (the chevron + summary combo isn't always discoverable). Animation requires a small CSS height-animation polyfill to feel smooth. Returning-visitor branching is a complexity tax for an arguably small win.
- **Helps non-technical colleagues by:** first-paint is dominated by the two-door choice; below-fold content stays one *intentional* click away rather than scrolling them into it accidentally.

### Variant 5 — Rebuild the homepage as a guided-tour storyboard (3 screens, swipe/click forward)
Replace the static hero+router+catalog stack with a stepped landing: Screen 1 "What is Claude Code?" (current `hero__what` callout), Screen 2 "Are you new or experienced?" (the two router cards), Screen 3 "Here's what's next" (Foundations + Day 1 for newcomers, or Skills + Tips + Glossary + News for experienced). Implemented as 3 sections that animate horizontally on click; respects `prefers-reduced-motion` by falling back to plain anchor navigation.
- **Effort:** ambitious
- **Tradeoff:** high design + engineering cost; introduces a JS-driven horizontal carousel pattern not present anywhere else on the site (breaks the "stack-and-scroll" mental model). Excellent first impression for newcomers but adds maintenance cost forever. Carousel screens are notoriously bad for SEO crawlers — only Screen 1's content is reliably indexed.
- **Helps non-technical colleagues by:** each screen has exactly one decision; the page is paced for them rather than dumping everything at once.

---

## Theme 3 — No stated "why should I be here?" — the page assumes the visitor already knows why they're on it

From the raw feedback:

> "One part that I think is missing, or may be deliberately missing, uh, because it's been covered by other bank instructions, is why a user should be on this page. There's probably a bank policy that has updated all the units, all the users… that we're moving into a new reality where all of us, from the user at the cash register to business analysis, to developers, uh, and managers, will need to get familiar… If this is already covered by a different source, we're okay. If not, I think it would be good to have an introduction to this part, very briefly."

**Verdict:** confirmed

**Evidence:** `site/src/pages/index.astro` hero copy (lines 62–75) explains *what Claude Code is* (terminal-based AI assistant, ~6-month head start, etc.) but does NOT explain *why this audience, in this institution, at this moment*. There is no link to or summary of any internal NBG strategy or directive about Claude adoption. `SCOPE.md` audience section names "bank colleagues new to Claude Code" but that framing only exists in operator-facing docs, not on the live site.

### Variant 1 — Add a one-paragraph "Why we built this hub" block above the two-door router  **★ RECOMMENDED**
A short, plainspoken paragraph: "Over the next 6–12 months Claude Code adoption ramps across the bank. The AI unit has a ~6-month head start. This hub is what we wish we'd had on day 1 — captured for the colleagues who join us next." Lives in the existing `hero__what` callout slot or as a sibling block. Pure copy change, no new components.
- **Effort:** minimal
- **Tradeoff:** the operator owns the wording; risk is overclaiming organisational mandate ("the bank requires X") if no such directive exists. Stick to the AI unit's own voice ("we built this because…") to avoid speaking for management.
- **Helps non-technical colleagues by:** answers the unspoken "why am I being asked to learn this?" before they even start reading, which is the biggest source of motivational drag for non-volunteer learners.

### Variant 2 — Link to an internal NBG strategy document or memo from the hero callout
If a bank-internal Claude adoption directive exists (in SharePoint, in an all-hands deck, in an email from leadership), put a small "Why this matters at NBG ↗" link in the hero callout that points there. The hub itself stays out of policy framing; the linked document does the heavy lifting.
- **Effort:** minimal
- **Tradeoff:** depends on a discoverable URL for the policy doc — if no such doc exists, this variant degrades into Variant 1. If the doc lives behind SSO, the link is useless to anonymous external readers (but per SCOPE.md the primary audience is logged-in bank colleagues anyway). Requires confirming with whoever owns the policy framing.
- **Helps non-technical colleagues by:** anchors the hub in a familiar institutional context — "this is part of the X initiative we heard about" — rather than feeling like a side-project.

### Variant 3 — Add a "Who is this for?" disclosure section near the top of the homepage
A dedicated section (collapsed or always-visible) listing the personas the hub is built for: cashier / business analyst / data scientist / developer / manager. Each line is one sentence on what they'd get from the hub. Pulls the SCOPE.md "Audience" framing directly into the visitor-facing surface.
- **Effort:** light
- **Tradeoff:** persona lists age fast and can read as marketing-deck if not carefully written. Risk of leaving someone off the list (e.g. operations? risk? compliance?) and them feeling excluded. Keep the list short and end with "if your role isn't listed, you're still welcome".
- **Helps non-technical colleagues by:** explicit recognition that the hub is for non-developers too — addresses the "this looks like a developer tool, am I even allowed to be here?" hesitation.

### Variant 4 — Embed a 60-second leadership-voiced welcome video at the top of the homepage
A short embedded video of someone visible in the AI unit (or, if you can get it, an executive sponsor) explaining the mandate in their own voice. Authority signal that text cannot match. Place above the two-door router; respects `prefers-reduced-motion` by default-pausing.
- **Effort:** substantial
- **Tradeoff:** organisational politics (who is on camera? who approves? whose voice carries weight at NBG?). Production cost (record, edit, host). Risk of dating the content fast — leadership churn means the video might need re-shooting in 12 months. Captions + transcript mandatory for accessibility.
- **Helps non-technical colleagues by:** human face + voice carry institutional legitimacy in a way that no amount of plainspoken copy can — especially in a culture where "the AI unit says so" carries more weight than "the website says so".

### Variant 5 — Build a dedicated `/about/` page covering mandate, audience, contributors, governance, and contact
A separate route at `/about/` with sections: "Why this exists" (the mandate framing) / "Who it's for" (personas) / "Who built it" (AI unit + named maintainers) / "How it's governed" (compliance review process, content rules) / "How to reach us" (team channel, email, GitHub repo). Linked prominently from the homepage and the global footer.
- **Effort:** moderate
- **Tradeoff:** an About page is a content commitment — it needs to stay current as the team/process evolves, or it becomes a fossilised liability. Risk of bloating into a corporate-speak page if not written carefully. But it solves an existing surface gap (one reviewer separately complained the About surface "is the same as the landing page" — see Theme 8).
- **Helps non-technical colleagues by:** "About" is the universal mental model for "where do I find out what this site actually is?" — giving them a dedicated page they can read in their own time without the hub itself becoming an explainer.

---

## Theme 4 — Examples and bank-specific case studies are missing

From the raw feedback:

> "Maybe it would be useful, at least for me, an example would help me about Claude MD — what kind of file that could be, what information it might roughly contain in all this chaos. And in general, maybe there was also a section, a section with case studies, meaning with examples — real examples — where this tool was used at the bank and it had an effect, or it helped in the day-to-day life of some business, or an individual person, so that the ordinary user can also understand roughly how to proceed, what they can build, so they don't see it as a very technical tool."

**Verdict:** confirmed

**Evidence:** `tips/` (14 entries) contains advice but no full-worked CLAUDE.md sample or before/after case-study. `journeys/day-1.md` Step 4 (line 57–68) describes CLAUDE.md conceptually ("project conventions there once… keep it under two pages") but does not show one. `skills/` describes 6 skills by what they do, not by a story of someone using them. There is no pillar of the site dedicated to case studies or worked examples.

### Variant 1 — Add an "Example CLAUDE.md" callout block to the existing CLAUDE.md tip and the Day 1 Step 4  **★ RECOMMENDED**
Drop a code-fence-wrapped sample CLAUDE.md (15–25 lines, realistic for a small project) inside `tips/<claudemd-tip>.md` and reference it from `journeys/day-1.md` Step 4. Sample uses fictionalised but plausible content rules ("Use NbgAiHub's house style", "Never log customer IDs in plain text", etc.).
- **Effort:** minimal
- **Tradeoff:** one sample isn't a "case study", but it concretises the most-asked-for "what does one actually look like?" gap. Risk: if the sample contains anything that looks like a bank-policy claim, it has to go through compliance review per SCOPE.md's repo-visibility constraint.
- **Helps non-technical colleagues by:** moving from "you should have a CLAUDE.md" (abstract) to "here is what one looks like" (concrete) — the single biggest leap a beginner can make for this concept.

### Variant 2 — Add a "Worked examples" section to each Skill entry showing a before/after task
For each of the 6 skills, add a `worked_example:` frontmatter field carrying a 2-paragraph story: "Last week I needed to X; without this skill I would have done Y; with the skill I did Z in N minutes." Display the field as a third zone under each skill listing row (Title → Summary → Worked example).
- **Effort:** moderate
- **Tradeoff:** schema extension to skill collection (`site/src/content.config.ts`) + content authoring overhead per skill. Worked examples date faster than the skill itself does (the underlying skill might change while the story stays). Worth gating to "real examples" — invented ones read as stock photography.
- **Helps non-technical colleagues by:** the "why would I use this?" answer is no longer abstract — they read someone else's story and can map it to their own work.

### Variant 3 — Stand up a new "Case studies" content pillar (6th alongside Skills / Tips / News / Glossary / Journeys)
A new content collection `case-studies/` with a schema (title, audience, role, problem, approach, outcome, time saved, tools used). One listing page `/case-studies/`, one detail page per study. Seed with 3–5 short, anonymised real stories from the AI unit's last 6 months ("how a business analyst built a customer-segmentation dashboard", "how a developer migrated a Postgres schema in a day").
- **Effort:** substantial
- **Tradeoff:** new pillar = new authoring overhead, new navigation slot, new sidebar entry, new test coverage. Risk of the pillar going stale if it doesn't get fed (worse than no pillar at all — an empty Case Studies page is more damaging than no Case Studies link). Requires operator commitment to author at least one per quarter.
- **Helps non-technical colleagues by:** the single most validated UX pattern for "is this relevant to me?" — they see someone in their role solving a problem they recognise and the abstract tool becomes concrete.

### Variant 4 — Embed a single "Day in the life with Claude Code" diary post on the homepage
One narrative post (~600 words) by a real or composite bank colleague describing a normal workday with Claude Code: morning email triage prompt, mid-morning code review, afternoon report generation, evening cleanup. Lives at `/day-in-the-life/` and is featured on the homepage below the two-door router.
- **Effort:** light
- **Tradeoff:** one diary doesn't generalise — a developer's day looks nothing like a business analyst's day. Could mitigate by writing two: one technical, one non-technical. The diary format dates fast as the toolchain evolves.
- **Helps non-technical colleagues by:** narrative is the most accessible content form — readers who would not engage with a tips list will read a story; they can imagine themselves in it.

### Variant 5 — Build a "Try this prompt now" interactive sandbox embedded in the site
A small JS playground (no backend — purely client-side templating) where the reader picks a use-case ("write a meeting summary", "draft an email", "explain this Python function") and the site shows a fully-worked example prompt + sample output. No real Claude calls — pre-generated outputs from a curated set. Aligned with one reviewer's separate "sandbox where someone can play around" suggestion.
- **Effort:** ambitious
- **Tradeoff:** entirely new content type, new component primitive(s), new content schema for sandbox scenarios, ongoing curation overhead to keep examples fresh. Without real LLM calls it's a static demo (cheap, deterministic); with real calls it requires Azure OpenAI infra and a per-visitor quota. Sandbox confusion risk: visitors expect a "real" Claude and get a recorded one. Label boldly.
- **Helps non-technical colleagues by:** moving from "read about prompting" to "see prompting" without leaving the site — closes the gap between knowing-about and being-able-to-do.

---

## Theme 5 — Day 1 has internal sequencing problems (clone before GitHub) and Mac-vs-Windows imbalance and unexplained shell vocabulary

From the raw feedback:

> "In day one, in step 2, it says to go into a, to clone a repo, but the step to get a GitHub account is step 5, so maybe there it should be a bit more, maybe the step for the GitHub account should come higher, so this sequence makes more sense."
>
> "The guide there, especially the one you wrote, especially when it has to do with installations, with things like that, is more detailed for Mac users and less detailed for Windows users, and I think the biggest difficulty is with Windows rather than Mac, and I have the feeling that at the bank too most people use Mac. Maybe there we should give a bit more emphasis, uh, in a more explanatory way."
>
> "These commands like cd, change directory, etc. are used, bash language, which users also aren't familiar with. I mean, if you've never seen in your life an environment like that, a terminal, and you've never played with bash scripts or anything, I think the other person doesn't understand what this cd is."

**Verdict:** confirmed

**Evidence:** `journeys/day-1.md` line 31 ("Step 2 — Start your first session") says "`cd` into a real project folder (one of the team's repos — clone one if you don't have one yet)" but `cd` is not in the glossary (`glossary/` does not contain `cd.md`, `bash.md`, `shell.md`, or `terminal.md` per the codebase scan). The step explicitly says "clone one" but the GitHub account explainer is `Step 5 — Get a GitHub account` at line 72. So a reader following the sequence is told to clone something with a tool they haven't been introduced to yet, before they have an account on the platform being cloned from. Line 22 gives macOS four terminal recommendations + a fallback; line 23 gives Windows one sentence ("use WSL; PowerShell works in a pinch but WSL is what the team uses") with no link, no install steps, no troubleshooting. Mac/Windows asymmetry is real and visible on the rendered page.

### Variant 1 — Reorder Day 1: move "Get a GitHub account" from Step 5 to Step 1.5 (between current Step 1 and current Step 2)  **★ RECOMMENDED (multi-pick: ship with V2 + V3)**
Renumber the steps. The clone-a-repo reference in (new) Step 3 now follows the GitHub account in (new) Step 2. Also add one sentence to Step 1 noting that Step 2 will set up GitHub before the reader needs to clone anything. Pure markdown edit + step-renumber in the chip-row JS at `site/src/pages/start-here/day-1.astro`.
- **Effort:** minimal
- **Tradeoff:** breaks any external bookmark / link / hub-plugin reference that addresses Day 1 steps by number rather than slug. Issue #16 also surfaces because the journey-page renderer treats each step as a separate segment for glossary-link first-occurrence — renumbering doesn't change the rendering but does shift anchor IDs (`#step-2-…` → `#step-3-…`).
- **Helps non-technical colleagues by:** removes the "wait, I'm being asked to do something I literally cannot do yet" cognitive snag, which is the single most demoralising kind of friction for an early-stage learner.

### Variant 2 — Add explicit shell-vocabulary glossary entries (`cd`, `terminal`, `bash`, `shell`, `WSL`) and auto-link them  **★ RECOMMENDED (multi-pick with Theme 5 V1 + V3; ship after Theme 6 V1 depth-cap lands)**
Author 5 new glossary entries at `glossary/cd.md`, `glossary/terminal.md`, `glossary/bash.md`, `glossary/shell.md`, `glossary/wsl.md`, each with a beginner-friendly `tldr` ≤160 chars and aliases (`cd` → `["change directory"]`, `WSL` → `["Windows Subsystem for Linux"]`). The remark-glossary-link plugin auto-wraps first occurrences across Day 1, Foundations, and listing summaries. After authoring, run `node scripts/sync-doc-counts.mjs` and update the homepage "36 terms" counter.
- **Effort:** light
- **Tradeoff:** glossary entries date faster than concepts (e.g. WSL2 vs WSL) and add maintenance load. Tooltip explosion risk: more glossary terms means more nested popovers, which intersects with Theme 6 (tooltip chaos) — solve Theme 6 first or the new entries make it worse.
- **Helps non-technical colleagues by:** a hover on `cd` or `terminal` resolves the term inline without leaving the page — they don't have to context-switch to "what was that command again?"

### Variant 3 — Add a "If you're on Windows" expanded sub-section to Day 1 Step 1  **★ RECOMMENDED (multi-pick with Theme 5 V1 + V2)**
Split Step 1 in the markdown source into two sub-blocks under one heading: "If you're on a Mac" (current 4-line content) and "If you're on Windows" (new content: explicit WSL install command, what to do if WSL is blocked by bank IT, a link to a 5-minute Windows-specific setup video, what to do if you don't have admin rights on a bank laptop). The expanded block is roughly 3x the length of the Mac block — matches the actual difficulty curve.
- **Effort:** moderate
- **Tradeoff:** content authoring + needs accuracy verification against current bank-IT policy on WSL enablement. Risk: bank IT changes the rules and the content goes stale. Could mitigate by linking to an internal SharePoint page owned by IT that stays canonical.
- **Helps non-technical colleagues by:** explicit recognition that Windows users have a harder path is reassuring on its own; expanded content removes the "this site assumes Mac, I guess I'm on my own" sentiment.

### Variant 4 — Add a global glossary-aware shell-command tooltip pattern (`<kbd>`-styled, hover for inline explanation)
Introduce a new tiny primitive `<ShellCmd>` that wraps commands like `cd`, `gh auth login`, `claude --dangerously-skip-permissions` in a styled chip with a hover popover explaining what the command does. Different surface from glossary terms (commands not concepts). Live across all pages, not just Day 1. Build-time wiring via a remark plugin similar to glossary-link.
- **Effort:** substantial
- **Tradeoff:** new primitive + new remark plugin = bigger change to the design system; "yet another popover type" risks compounding Theme 6's tooltip-chaos complaint. Authoring overhead: every command in every doc needs a registry entry. But solves a class of problem cleanly — commands are a different mental model from concepts and arguably deserve their own affordance.
- **Helps non-technical colleagues by:** they see "`cd`" and can hover to learn what it does without breaking flow; commands feel transparent rather than obscure.

### Variant 5 — Replace Day 1 with two parallel routes: `/start-here/day-1/mac/` and `/start-here/day-1/windows/`
Forks the journey at the OS-choice landing page. Mac route is roughly the current content; Windows route is a fully separate, fully-elaborated path with WSL setup baked in, screenshots, troubleshooting for bank-laptop scenarios. A small OS-picker page sits at `/start-here/day-1/`. Hub plugin's `/hub-onboard day-1` would either pick automatically based on OS or prompt.
- **Effort:** ambitious
- **Tradeoff:** content duplication (two parallel maintenance burdens forever), risk that one fork rots while the other stays current, more pages = more glossary-link wiring per page, hub-plugin command needs to disambiguate. Cleanest possible OS-fairness solution but the cost is real and ongoing.
- **Helps non-technical colleagues by:** Windows users land on a page that's actually written for them — none of the "ok but how do I install WSL on a locked-down laptop" handwaving that the current single page does.

---

## Theme 6 — Glossary tooltips open in chains; nested explainers feel chaotic

From the raw feedback:

> "It seems a bit chaotic to me this browsing between the tooltips. 800 windows keep opening all the time, I understand the point of having everything in one, but personally I find it a bit chaotic and of course I'm not sure how to fix it so we can keep this as well."
>
> "Explanations of terms when you hover over them, if they include the same term over and over, can lead to endless repeats of the same explainer."

**Verdict:** confirmed

**Evidence:** `site/src/components/primitives/GlossaryTerm.astro` line 99 wires popovers via `[data-glossary-slug]:not([data-nbg-glossary-wired])` and recursively calls `wire(pop)` on first `.showPopover()` for any nested `[data-glossary-slug]` inside the popover body. `tldr` strings are pre-linked at build via `linkGlossaryTerms(entry.data.tldr)` (line 72). With 36 glossary entries that frequently cross-reference each other (per Theme 5's note that `tldr`s explain to beginners using other glossary terms), the nested wiring can generate hundreds of popovers + scroll listeners. No depth limit, no throttle, no breadcrumb back to the originating term. Codebase-scan Note 2 explicitly identifies this as a potential performance trap.

### Variant 1 — Cap nested popover depth at 1 (the outer term opens a popover, but terms inside that popover are NOT clickable)  **★ RECOMMENDED (ship before Theme 18 V1)**
In `linkGlossaryTerms()` (the JSX-string variant) and the remark plugin, accept a depth parameter; when called for `tldr` pre-linking, pass `depth=1` which means "skip the auto-link wrapping entirely inside this string". Inner terms render as plain text. The first popover is the last popover.
- **Effort:** minimal
- **Tradeoff:** loses the "hover-inside-hover" feature, which is a real value-add for the small fraction of users who actually want to drill down. Reading-comprehension argument wins for the larger non-technical audience. Reversible: ship the cap, watch for someone complaining about the loss, then offer "Read more →" as the depth-2 escape hatch.
- **Helps non-technical colleagues by:** popovers feel bounded — one hover, one explanation, done. No fear of triggering a runaway cascade.

### Variant 2 — Render inner terms in popover bodies as styled-but-unwired text (keep the visual cue, drop the interactivity)
The build-time pre-link still produces `<button data-glossary-slug>` markup, but the runtime wiring script ignores buttons that are descendants of a popover. The visual styling (the dotted underline / accent colour) survives so the reader still gets the cue "this is a glossary term", but clicking/hovering does nothing inside a popover.
- **Effort:** light
- **Tradeoff:** half-measure — readers see the affordance and try to use it, then are confused when nothing happens. Could mitigate with a small "Open the glossary entry ↗" footer link inside each popover that does the navigation explicitly. Worth pairing with Variant 3 below.
- **Helps non-technical colleagues by:** preserves the "this word matters" visual signal while removing the chaos of accidentally-triggered nested popovers.

### Variant 3 — Replace the inline popover with a single page-level glossary side-panel that slides in from the right
Click any glossary term anywhere on the site → a right-side panel slides in showing that term's full glossary entry (not just `tldr`). Clicking a link inside the panel updates the panel rather than opening a new popover. Closes on ESC or click-outside. The panel is the *only* glossary surface — no inline popovers at all.
- **Effort:** substantial
- **Tradeoff:** large interaction-pattern shift; users have to learn a new affordance (sidebar vs popover). The slide-in panel is a heavier affordance than a hover-popover, but cleaner for serial drilling-down. Loses the "I want a quick reminder without leaving my reading position" use-case the current popover serves well.
- **Helps non-technical colleagues by:** turns glossary exploration into a contained, predictable activity in a known location; no surprise pop-ups, no chaos.

### Variant 4 — Disable hover-triggered popovers entirely; require an explicit click on the term to open
The popover wiring keeps `focus` + `click` handlers but drops the `mouseenter` (80ms debounce) handler. Hovering over a term shows a subtle visual highlight only; opening requires intent. Combined with Variant 1's depth cap, this removes ~95% of the "endless cascade" risk.
- **Effort:** minimal
- **Tradeoff:** hover is a faster affordance than click — power users lose the "skim and check definitions in passing" pattern. But the affected audience is the technical minority; the broader non-technical audience is more likely to find hover surprising than helpful.
- **Helps non-technical colleagues by:** they don't accidentally trigger popovers by mousing across the page; explanations only appear when they explicitly ask for them.

### Variant 5 — Replace popovers with inline expansions: clicking a term inserts a small definition block right after the term in flow, the block can be dismissed with an X
No floating surface at all. The term becomes a toggle; activated, it inlines a `<details open>`-style definition block immediately after itself. Reading flow continues below. ESC or X collapses it. Multiple terms can be expanded simultaneously without occluding the page.
- **Effort:** ambitious
- **Tradeoff:** fundamental shift in interaction pattern — affects every page that auto-links glossary terms (homepage card summaries, Foundations, Day 1, Skills/Tips listings, Glossary catalog itself). Reflow on expand may feel janky if not animated carefully. But removes the entire class of "popover positioned wrong / clipped by viewport edge / occludes the next button I wanted to click" complaints in one stroke.
- **Helps non-technical colleagues by:** definitions appear *in their reading*, not on top of it — closest analog to a paper-book footnote, which is a familiar mental model.

---

## Theme 7 — Skill listings should show "why use this" (time-saving / outcome) not just "what this does"

From the raw feedback:

> "In the skills section, where they're all grouped together, I'd like us to somehow show the user *why* it's good to use them, not just what they do. I mean, if it's possible, show e.g. some time-comparison diagrams — like, if I do something with prompts it might take me, let's say, 2 hours; but if I do it with the skills, I save 15–20 minutes — so that the user understands why it's good to use these and what they gain, naturally."

**Verdict:** confirmed

**Evidence:** `site/src/pages/skills.astro` lines 130–168 render each skill row as: audience pill + title + `ai_summary` paragraph + the slash-command code chip + `when_to_use` line. The `when_to_use` field (line 162) is a sentence-level hint, not a quantified outcome. There is no time-saved field, no before/after diagram, no value-proposition framing. The current presentation tells the reader *what* the skill does without ever telling them *why they would pick it over doing the task by hand*.

### Variant 1 — Add a `time_saved:` frontmatter field rendered as a small chip next to each skill title  **★ RECOMMENDED (multi-pick with Theme 7 V2)**
Schema extension on the `skills` collection: optional `time_saved: z.string().optional()` (e.g. `"~30 min per use"`, `"~2 hours on the first run"`). Render as an accent-coloured chip next to the audience pill on each listing row.
- **Effort:** minimal
- **Tradeoff:** estimates are inherently fuzzy and vary by task complexity; readers may treat them as guarantees and feel misled. Mitigate with copy framing ("~30 min" not "exactly 30 min"). Authoring overhead: every skill needs an honest estimate.
- **Helps non-technical colleagues by:** "saves ~30 min" is a tangible value claim a non-developer instantly understands, whereas "automates the schema-design step" requires technical context to evaluate.

### Variant 2 — Add a "When you'd use this" worked scenario under each skill entry  **★ RECOMMENDED (multi-pick with Theme 7 V1; chip = visible time number, scenario = context that grounds it)**
Schema extension: optional `worked_scenario:` (markdown, 2–4 sentences). Tells one micro-story per skill: "You need to draft a 5-table schema for a new microservice. Without this skill: an hour pasting around. With this skill: `/database-schema-designer` once, review, done." Rendered as the third zone of each listing row.
- **Effort:** moderate
- **Tradeoff:** worked scenarios date faster than skills do — a tooling change can make the story misleading. Worth dating each scenario and adding a `last_reviewed` field. Authoring cost per skill is real (a good scenario is hard to write).
- **Helps non-technical colleagues by:** a concrete story is the fastest path from "I don't know what this skill is for" to "oh, I have that problem too" — closes the relevance gap.

### Variant 3 — Add a side-by-side "without / with" comparison block to each skill detail (and the listing row hover state)
For each skill: a `without_skill:` and `with_skill:` pair (each a short bullet list of steps). Render as a two-column block. On the listing page, this lives on hover/expand; on a per-skill detail page (when one exists per Issue #10), it lives near the top. Visual contrast immediately communicates the value.
- **Effort:** substantial
- **Tradeoff:** schema gets heavier (two new fields per skill), CSS for two-column blocks adds layout complexity, mobile fallback is tricky (do they stack or do they swipe?). Real risk that the "without" column comes across as strawman/exaggerated unless authored carefully.
- **Helps non-technical colleagues by:** the value-proposition is shown not told — they see how many steps disappear, which is more persuasive than any single number could be.

### Variant 4 — Add quantitative outcome data ("typical session length", "skills used per week", aggregate stats) to the skills index page header
Above the listing rows, a small "By the numbers" panel showing: total skills cataloged, ~hours-saved-per-week claim (with footnote on methodology), most-used skill in the last month. Pulls real numbers from the bank's actual Claude usage if you can get to that data; otherwise uses team estimates with disclosure.
- **Effort:** moderate
- **Tradeoff:** if the numbers are bank-internal, they can't ship in a personal-account repo without compliance review (per SCOPE.md). If they're team estimates, they need to be honest — overclaiming kills credibility. The panel needs to refresh or it becomes a fossilised lie.
- **Helps non-technical colleagues by:** institutional weight ("the team has used these N times this month") signals that skills are actually used, not just listed — answers the implicit "is this even a real thing people do?"

### Variant 5 — Build per-skill detail pages with embedded short demo videos / screencasts
For each of the 6 skills, a `/skills/<slug>/` page with: full description, slash command, prerequisites, worked example, embedded 30–60 second screencast showing the skill in action, time-saved estimate, links to similar skills. Resolves Issue #10 (which currently has skill pins deep-linking to the catalog index because per-slug pages don't exist).
- **Effort:** ambitious
- **Tradeoff:** 6 detail pages + 6 screencasts = real production cost. Screencasts go stale when Claude Code's UI changes (and it changes). Per-slug pages also need their own glossary auto-linking wiring (the manual `createMarkdownProcessor` pattern from Foundations/Day 1, per Issue #15). But: closes Issue #10 cleanly, provides surface for `time_saved` + `worked_scenario` + screencast all in one, and lets the listing page stay scannable.
- **Helps non-technical colleagues by:** "show, don't tell" at its strongest — they watch a 60-second screencast and *know* whether the skill is for them, without parsing any prose.

---

## Theme 8 — Skills/Tips listings need more filter dimensions and an optional grid view

From the raw feedback:

> "I'd add more filters mainly to the skills and to the tips. We have the for beginners and the for experience, but I'd also like to see a filter that categorizes them — which ones are for developing, which are for deploying, uh, which are for, I don't know, for brainstorming."
>
> "Maybe they shouldn't take up so much space or there should be a grid display option. Like, for example, right now a tab takes up the whole page. Maybe I'd like it to be, you know, three little tabs in a row so the user can see them directly… so their view is more immediate."

**Verdict:** confirmed

**Evidence:** `site/src/components/AudienceFilter.astro` lines 28–43 implements a single-select segmented control (Everything / For beginners / For experienced) — that is the only filter dimension. Listings are grouped on a hardcoded dimension (Skills by `origin` Internal/Community, Tips by `topics` cluster Prompting/Survival/Context/Compliance) but the grouping is not user-toggleable. Both pages render `.listing-row` flows (single-column full-width rows), one per entry, with no grid mode. There is no toggle, no chip filter for `topics`, no view-density control.

### Variant 1 — Add a chip-based topic filter row above the existing AudienceFilter  **★ RECOMMENDED**
A horizontal `Chip` cluster listing every distinct `topics` value across the collection (Prompting, Survival, Context, Compliance, Brainstorming, Development, Deploy, …). Multi-select. Active chips highlight in accent. Empty selection = show everything. Filter logic lives in the same client script as AudienceFilter.
- **Effort:** light
- **Tradeoff:** more controls = more surface for a non-technical user to be confused by ("which combination shows me everything again?"). Best paired with a small "Clear filters" link. Filter state is per-visit (matching the recent AudienceFilter decision to drop persistence).
- **Helps non-technical colleagues by:** they can scope a long list by "I'm just looking at prompting stuff today" without having to scan section headers.

### Variant 2 — Add a view-mode toggle (List / Grid) at the top of each listing page
A small two-button segmented control: List (current `.listing-row` flow) and Grid (a 3-column card layout — reusing the existing `.grid-3` AgentNews class). Selected mode persists in `localStorage.nbgaihub.listing-view`. Default is List.
- **Effort:** moderate
- **Tradeoff:** Grid mode needs different content density per card (probably drop the `when_to_use` line, drop the slash-command chip, show only title + audience pill + one-line summary). Authoring intent breaks if Grid mode hides the field the author considered essential. Two view modes = two sets of CSS = double the visual-regression surface.
- **Helps non-technical colleagues by:** users who prefer dense scanning (typically experienced users) get Grid; users who prefer one-at-a-time reading (typically newcomers) get List. Neither audience is forced into the other's preference.

### Variant 3 — Add a search box at the top of each listing page that filters by title + summary + topic
A single `<input type="search">` with debounced client-side filtering. Live-filters the rows as the user types. Pagefind already powers global search but this would be a local in-page filter for the current collection only — faster, no extra dependency.
- **Effort:** light
- **Tradeoff:** duplicates Pagefind's global search at a per-page scope, which may confuse users about which search to use. Mitigation: small inline label "Filter this page" not "Search". Empty state needs handling ("no matches — clear filter").
- **Helps non-technical colleagues by:** typing is a universally-understood interaction; chip-filters require the user to know the topic vocabulary up front, search doesn't.

### Variant 4 — Replace the static listing pages with a faceted-browse pattern (sidebar of filter facets + main results pane)
Larger redesign: a left sidebar (or top drawer on mobile) carries facet groups — Audience / Topic / Origin / "Skill or Tip" / Recently added. Each facet is checkbox-multi-select. Main pane is the live-filtered results, count-displayed ("Showing 3 of 6 skills"). Pattern borrowed from e-commerce category pages.
- **Effort:** substantial
- **Tradeoff:** big interaction-pattern shift; the design system has no faceted-browse component yet (would need a new primitive or two). Faceted browse is the right pattern when collections are large (100+) — for 6 skills + 14 tips it's overkill, and could feel "industrial" for a hub that's meant to feel inviting.
- **Helps non-technical colleagues by:** explicit faceted scoping is the most powerful way to narrow a list — they see the facet labels and learn the vocabulary by exposure.

### Variant 5 — Rebuild Skills/Tips as a tag-cloud entry surface (no rows at all, just a tag cloud as the landing UI)
Replace the listing page entirely with a tag-cloud surface — every topic, every audience tag, every origin tag, every skill name, sized by frequency. Clicking a tag scopes the view to matching entries. The cloud becomes a visual map of "what does this hub cover?" before the user ever sees a row.
- **Effort:** ambitious
- **Tradeoff:** visually distinctive but not a familiar pattern for non-technical users (more common in academic / archive contexts than in business knowledge hubs). Discoverability of specific items drops — if you know the name of a skill, hunting it in a tag cloud is slower than scanning a list. Best for browse, worst for lookup.
- **Helps non-technical colleagues by:** the cloud is a visual entrypoint — "oh, there are lots of tips about Prompting" — that abstract category labels in a sidebar do not match for at-a-glance density.

---

## Theme 9 — News surface routes off-site; there is no real "About" page for the hub itself

From the raw feedback:

> "For the News section, the About page is the same as the landing page."

**Verdict:** partially confirmed

**Evidence:** `site/astro.config.mjs` lines 36–38 redirect `/news/` to <https://biks2013.github.io/AgentNews/> per the 2026-05-25 nav rework. There is no `/about/` route on the site (the global nav has no "About" link). The reviewer's observation conflates two things: (a) the News destination is *off-site* (they meant "after I follow News, the page I land on doesn't tell me what the hub is, just shows me feeds"), and (b) there is no separate Hub About page anywhere. The hub's identity has to be inferred from the homepage hero copy.

### Variant 1 — Add an "About this hub" page at `/about/` and link it from the global footer + Experienced router card  **★ RECOMMENDED (pair with Theme 3 V1)**
A single-page `/about/` covering: what NbgAiHub is, who built it, why, who it's for, contact channel, last-updated date, link to the GitHub repo. Pure content page — uses existing `.hero` + prose primitives. Linked from the footer of every page.
- **Effort:** minimal
- **Tradeoff:** an About page is a content commitment to keep current. Risk of corporate-speak rot if not authored in the project's "what I wish I knew a year ago" voice. Largely overlaps with Theme 3 Variant 5 — pair these or pick one.
- **Helps non-technical colleagues by:** "About" is the universal mental model for "who built this site and why" — they have a place to verify legitimacy before trusting the content.

### Variant 2 — Add a sticky banner on the AgentNews redirect destination linking back to NbgAiHub
Since the News destination is a different site (owned by a colleague), drop the AgentNews owner a request to add a small "← Back to NbgAiHub" banner. Pure cross-site link, no code on either side beyond a single anchor. Closes the "I went to News and now I don't know how to come back" loop.
- **Effort:** light
- **Tradeoff:** depends on AgentNews owner agreeing; can't be done unilaterally. Cross-project coordination friction. Alternative: open News in a new tab (already implemented per codebase scan §4.6) which mitigates but doesn't fully solve the issue.
- **Helps non-technical colleagues by:** when they wander off-site they don't get lost — there's always a path back, which is the basic reassurance signal that they're not "off the map".

### Variant 3 — Replace the off-site News redirect with a slim on-site News index that links out per-item
Build a minimal `/news/` page on this site that reads `news/published/` (the data is still flowing in via the daily cron — Issue #14 notes it's "orphan data" right now) and lists items as title + summary + external-link chip. Clicking any item opens the source URL in a new tab. Brings News back as a real surface without duplicating AgentNews's curation.
- **Effort:** moderate
- **Tradeoff:** reanimates a route that was deliberately removed; risks reopening the news-surface design conversation that 2026-05-25 nav rework settled. But also closes Issue #14's "orphan data with no on-site surface" subitem. Operator call.
- **Helps non-technical colleagues by:** News becomes a hub-internal experience again — they're not bounced to a different visual brand they don't recognise.

### Variant 4 — Add a "Hub overview" card to the experienced-user router on the homepage
Add a fifth pill to the Experienced router card row: "About the hub" pointing at `/about/` (if implemented) or scrolling to a homepage `<section>` covering origin / governance / contributors. Treats hub-identity as a discoverable surface rather than an inferred one.
- **Effort:** minimal
- **Tradeoff:** five pills feels crowded — careful with horizontal spacing on mobile. Could equally be a footer-only link. Trade off discoverability against above-the-fold visual cleanliness (Theme 2 wants less, not more).
- **Helps non-technical colleagues by:** discoverable hub-identity surface — they don't have to "wonder" who's behind this, the link is right there in the same row as Skills/Tips/Glossary/News.

### Variant 5 — Rebuild News on-site as a curated newsletter format (weekly digest pages, archive index)
Convert the daily-cron output into weekly digest pages — `/news/2026-W21/`, `/news/2026-W22/` — each a curated 5–8 item summary, hand-edited from the auto-promoted incoming items. Provides newsletter-style cadence, archives nicely, gives the operator editorial control again.
- **Effort:** ambitious
- **Tradeoff:** reintroduces editorial labour (the daily cron + auto-promote model was specifically chosen on 2026-05-19 to eliminate this). Weekly digests are more readable than 50-items-firehose but require ~30 min/week of human curation. Operator call: does the value exceed the cost?
- **Helps non-technical colleagues by:** newsletter format ("what mattered this week, in 5 items") is the most accessible news consumption pattern — beats both raw firehose and external redirect.

---

## Theme 10 — Pinning works on paper but the "where do my pins live?" loop is unclear

From the raw feedback:

> "My pins don't work. I've pinned it after I connected my kit, but I don't see anything in my pins."

**Verdict:** partially confirmed

**Evidence:** Codebase-scan §4.7 notes "no known broken case documented" for the pin pipeline (PAT-paste → gist creation → addFavourite → build-time index join → render in `/my-pins/`). Issue #12 tracks a duplicate `SignInModal` render on content-detail pages, which is invalid HTML but doesn't break functionality. Issue #11 separately notes that the now-removed `/submit-skill/` slug-collision check failed against the (then-)private repo. The user's "pins don't work" complaint isn't reproducible from code, suggesting either: (a) state confusion (signed in / signed out / signed in as a different account between browsers), (b) cache lag between pin-action and /my-pins/ rendering (gist write → re-fetch latency), (c) cross-device sync expectation not matching the localStorage-PAT model. The likely root cause is **UX confusion about where pins live and what signed-in state looks like across surfaces**, not a code bug.

### Variant 1 — Add a "Just pinned: <title> — View pins" toast notification on every pin action  **★ RECOMMENDED**
After `addFavourite()` resolves, show a transient toast at the bottom-right with the just-pinned title and a "View pins" button linking to `/my-pins/`. Confirms the action visibly and provides the path to verify. Auto-dismisses after 5s.
- **Effort:** light
- **Tradeoff:** new toast primitive (or extend an existing one if MotionReveal can serve). Toasts are a small UX surface area — easy to get wrong (stacking, animation, accessibility). Solves the "did my click do anything?" half of the complaint without solving the "where do they live cross-device?" half.
- **Helps non-technical colleagues by:** immediate confirmation that the action worked is the single most important reassurance pattern in any web UI — silence breeds doubt.

### Variant 2 — Add a "Sync status" indicator next to the auth pill in the header
A small dot indicator (green = synced, amber = syncing, red = error) next to the signed-in email/handle in the header. Tooltip on hover: "Last synced 12 seconds ago" or "Sync failed — click to retry". Driven off the gist read/write timestamps.
- **Effort:** moderate
- **Tradeoff:** adds visible state to the header chrome; users who don't care about syncing now see an indicator they have to learn. Risk of false positives (network blip = amber dot) panicking users. Worth pairing with clear copy.
- **Helps non-technical colleagues by:** they have a clear answer to "is my data safe?" at a glance — institutional trust matters more for non-technical users than for technical ones.

### Variant 3 — Add a "What is My Pins?" intro card to `/my-pins/` for first-time visitors (signed-in OR signed-out)
The current `/my-pins/` page has a 4-FAQ anonymous panel for signed-out users (per 2026-05-26 morning redesign). Add a similar but smaller intro card for signed-in users who have zero pins yet — explaining that pins are stored in their personal GitHub gist, they sync across devices when signed in with the same PAT, and how to remove the explainer card.
- **Effort:** light
- **Tradeoff:** another callout in a page that already has callout density (the anonymous panel is already information-dense). Risk of making the page feel cluttered for users who get it. Mitigate with a "dismiss this hint" link that hides the card forever in localStorage.
- **Helps non-technical colleagues by:** the page tells them what to expect *before* they're confused — defuses the "I pinned, where is it?" moment by setting the expectation in advance.

### Variant 4 — Add a "Test your sign-in" button to the SignInModal that confirms gist access end-to-end
After a successful PAT-paste, an additional pre-flight check: create the gist if it doesn't exist, write a noop entry, read it back, delete the noop entry. Show a green "Synced — you're good to go" message in the modal before closing it. Confirms the full pipeline works before the user trusts it.
- **Effort:** moderate
- **Tradeoff:** four extra API calls on every first sign-in (latency hit). Failure of any one of them is a useful diagnostic but also a scary error to surface ("gist create failed — your token may need 'gist' scope"). Worth it because the alternative (silent failure on first pin) is much worse.
- **Helps non-technical colleagues by:** "Synced" is a definitive yes/no signal — they leave the modal knowing the system works, rather than discovering it doesn't an hour later when they pin something.

### Variant 5 — Replace the PAT-paste + gist model entirely with a server-side auth + database backend
Sets up a small backend (Cloudflare Worker, per Issue #9's documented alternative) that handles GitHub OAuth, stores favourites in a managed database, eliminates the need for the user to ever paste a token. Single sign-in carries across devices with zero PAT exposure.
- **Effort:** ambitious
- **Tradeoff:** dramatically increases the surface area: new infrastructure to operate (Worker + KV / D1 / external DB), GDPR exposure (real user data on bank-attached infrastructure), authentication maintenance, secret rotation, monitoring. Loses the "zero-infrastructure promise" that motivated the original PAT-paste design. Operator-rejected once already per Issue #9 — only revisit if PAT friction becomes a top-3 complaint.
- **Helps non-technical colleagues by:** removes the single most alien step of the current sign-in flow (creating a GitHub PAT) — replaces it with a familiar OAuth click-through.

---

## Theme 11 — Day 1's `--dangerously-skip-permissions` framing conflicts with Tips' "always review changes" advice

From the raw feedback:

> "When we tell them to bypass the permissions. Uh, that, okay, I know that Giorgos too gives this direction, but on the one hand it can be a bit riskier for a completely new user, uh, and the understanding — meaning if he completely ignores key permissions, he might not even understand correctly what Claude is doing, how it processes them. And secondly, I think there's a discrepancy, because on the one hand we tell him, bam, skip permissions, uh, and then somewhere in the tips we say to always check the difference, all that, uh, something that if he skips the permissions he won't see, uh, the changes, Claude won't ask him for input. Uh, that doesn't apply, so maybe that's where we should give him a better direction and a clearer one, so it isn't contradictory in the tips and in skipping permissions from day one."

**Verdict:** partially confirmed

**Evidence:** `journeys/day-1.md` line 34 instructs `claude --dangerously-skip-permissions` and line 37 attempts to defuse the flag name: "It just means 'don't ask permission for every single read or shell command' — you'll still review every code change before Claude applies it." That defuse is technically accurate (Claude still pauses on code edits — the flag only skips read/shell permission prompts) but does conflict in tone with the broader Tips advice ("always check the diff", etc.). The reviewer's concern is partially confirmed: the wording isn't *contradictory* but the framing IS confusing for a beginner who doesn't yet distinguish "permission prompt" from "edit approval".

### Variant 1 — Tighten the Day 1 Step 2 wording: explicitly enumerate what the flag does and does NOT do
Rewrite line 37 of `journeys/day-1.md`: replace the current single-sentence reassurance with a 3-bullet list — "The flag skips: read prompts, shell-command prompts. The flag does NOT skip: code-change reviews (you still approve every edit), destructive-action confirmations, network calls to external services." Explicit enumeration removes the "what else am I agreeing to?" anxiety.
- **Effort:** minimal
- **Tradeoff:** longer copy on a step already considered "alarming". Risk of overwhelming the beginner with a permissions taxonomy they don't yet have the vocabulary for. Worth it because the existing single-line reassurance demonstrably isn't enough.
- **Helps non-technical colleagues by:** explicit boundaries are easier to trust than a single reassurance sentence — they know exactly what they're opting into.

### Variant 2 — Add a "First-week mode" recommendation that delays the flag until week 2
Recommend in Day 1 that new users start *without* the flag for their first week, accept the latency cost, and adopt the flag once they understand the permission prompts they're seeing. Add a small "switch to expert mode" link in the Tips area covering the flag for week-2 adoption.
- **Effort:** light
- **Tradeoff:** trades latency-pain (without the flag, every action prompts — Claude feels glacial per the current copy) for understanding. New users may bounce in the first hour because of the latency, which is the original reason the flag was recommended in the first place. Operator call on which pain is worse.
- **Helps non-technical colleagues by:** the first hour is when they form an opinion about whether Claude Code is for them — letting them see the permission prompts means they understand the tool's behaviour, even if it's slower.

### Variant 3 — Replace the flag recommendation with a "Permission modes" tip linking the existing permission-modes tip

> **DROPPED 2026-05-27 (operator decision).** Team keeps `--dangerously-skip-permissions` as the recommended Day 1 launch command; Theme 11 ships V4 + a new deep-dive tip instead (see V4).
The current `tips/permission-modes.md` (added 2026-05-25 late-evening) describes Shift+Tab cycling between default / auto-accept-edits / plan modes. Refactor Day 1 Step 2 to introduce the same modes by name and recommend "default" mode for the first session, with a link to the permission-modes tip for when they're ready to graduate. Drops the scary flag name entirely from Day 1.
- **Effort:** light
- **Tradeoff:** the flag is still the dominant way the team launches Claude per the operator's framing — moving Day 1 away from it requires a deliberate position change. Worth pairing with a one-paragraph DECISIONS entry justifying the shift.
- **Helps non-technical colleagues by:** no scary flag name on Day 1, no "skip permissions" cognitive dissonance — they learn the in-product affordance (Shift+Tab) which is what they'd use long-term anyway.

### Variant 4 — Add an in-page reconciliation block in Day 1 explicitly addressing the perceived contradiction with Tips  **★ RECOMMENDED (paired with a new `tips/dangerously-skip-permissions.md` deep-dive tip — see resolution table)**
A small callout at the bottom of Day 1 Step 2: "Wait, doesn't this conflict with 'always review the diff' in Tips? — No. The flag skips *permission prompts* (which mostly cover reading files and running shell commands); it does NOT skip *change reviews* (Claude still pauses on every code edit for you to accept or reject). The two pieces of advice live at different layers." Treats the contradiction up-front rather than hoping the reader works it out.
- **Effort:** minimal
- **Tradeoff:** adds defensive copy ("we know what you're thinking, here's why we're right") which can come across as preachy if not tonally careful. Alternative: a dedicated `tips/permissions-vs-reviews.md` entry that both surfaces link to.
- **Helps non-technical colleagues by:** explicit recognition that the apparent contradiction is a real cognitive snag, plus the answer, in the place where the snag arises — they don't have to hold the question and resolve it later.

### Variant 5 — Build an interactive walkthrough of the first session with screenshots of every permission prompt and what it means
A new page (or a much-expanded Day 1 Step 2) with annotated screenshots: "Here's what the first permission prompt looks like" / "Here's what 'always allow read' means" / "Here's the edit-approval prompt — this is the one you should care about". Replaces the abstract "the flag skips permissions" framing with the actual visual reality.
- **Effort:** substantial
- **Tradeoff:** screenshots date as the Claude Code CLI evolves (and it evolves). Maintenance overhead is real. But the payoff is a uniquely clear answer to "what am I actually agreeing to?" — the kind of answer that text alone cannot deliver.
- **Helps non-technical colleagues by:** they can see the prompts before they encounter them, which is a profound anxiety reducer — recognition rather than discovery.

---

## Theme 12 — GitHub-account guidance lacks bank-specific clarity (which email? company-paid Claude?)

From the raw feedback:

> "About registering on GitHub, thinking now that we might be dealing with bank dinosaurs, people who are 800 years old, uh, we should clarify that they should log in with their company email, and somehow provide an official guide… we should clarify whether they should log in with their company email… And maybe that, meaning about the email they use to log in, and about the Claude account, to see, to clarify a bit more whether they'll pay for it themselves or the company."

**Verdict:** confirmed

**Evidence:** `journeys/day-1.md` line 89: "Go to [github.com](https://github.com/) and sign up. Five minutes. No credit card, no technical questions, use your bank email." That sentence does say "bank email" but doesn't elaborate on *which* bank email (work email vs. personal mailbox routed through bank infrastructure), does not link to or quote the bank's IT policy on GitHub-account creation, and does not mention Claude account billing at all. The reviewer's "should it be company-paid?" question is genuinely unanswered on the site.

### Variant 1 — Expand the GitHub sign-up line in Day 1 Step 5 with explicit guidance: which email, what username pattern, what 2FA to use  **★ RECOMMENDED (single pick — Theme 12 V2 dropped per 2026-05-27 operator decision)**
Rewrite the "What to do" list in `journeys/day-1.md` Step 5: "Use your bank email (`firstname.lastname@nbg.gr` or whatever the bank's pattern is — ask if unsure). For 2FA, use the bank-issued authenticator app, not SMS. Pick a username with your real name — this is a professional account, not a hobby one." All copy, no new pages.
- **Effort:** minimal
- **Tradeoff:** bank-specific guidance can become outdated when bank IT policy changes (e.g. authenticator app migration). Wording needs to be authoritative-sounding without overclaiming bank-IT mandate. Run by the IT contact before shipping.
- **Helps non-technical colleagues by:** removes the "I don't want to set this up wrong" hesitation — they have explicit defaults to follow.

### Variant 2 — Add a section "Claude Code at NBG — how billing works" to the journeys / tips

> **DROPPED 2026-05-27 (operator decision).** Hub will not comment on Claude pricing / NBG billing model. Theme 12 ships V1 only (email + 2FA + username guidance).
A short content piece covering: who pays for Claude usage (the team budget vs. the individual), how to request access if you're not already provisioned, what to do if your usage exceeds the standard quota, who to contact about license / billing. Lives under a new `tips/billing-and-access.md` entry.
- **Effort:** light
- **Tradeoff:** requires operator confirmation of the actual policy — content can't be invented. If the policy is genuinely TBD, this becomes a placeholder, which is worse than nothing. Operator dependency.
- **Helps non-technical colleagues by:** removes financial uncertainty — they aren't quietly worrying "wait, am I about to be charged for this?"

### Variant 3 — Build a dedicated "Bank colleagues — provisioning checklist" page covering the full institutional setup path
A `/start-here/provisioning/` page listing the full sequence: bank IT helpdesk request → email account → GitHub Enterprise (if applicable) or public GitHub with bank email → Claude Code license → Azure OpenAI tenant access (if Claude usage is via internal proxy) → first sign-in to NbgAiHub itself. One checklist, one source of truth.
- **Effort:** moderate
- **Tradeoff:** content overlaps with whatever IT helpdesk owns; risk of two sources of truth diverging. Best built *in coordination* with the IT/AI-unit ops people, not by the content team unilaterally.
- **Helps non-technical colleagues by:** they have a single document they can hand to their manager / open in a meeting with IT and say "I'm following these steps" — institutional legitimacy.

### Variant 4 — Auto-detect signed-in users' email domain and surface a "you're using a non-bank email" warning
On `/my-pins/` and the sign-in modal, after PAT validation, check the GitHub user's primary email. If the domain doesn't match a known bank domain (`@nbg.gr` or whichever), show a gentle warning: "Heads up — you're signed in with a personal email. The team recommends using your bank email for professional GitHub work. [Switch account]."
- **Effort:** moderate
- **Tradeoff:** adds a client-side check that may feel invasive ("how did they know?"); requires a hardcoded list of bank email domains (which is fragile if domains change). Mitigate by phrasing as advice, not blocking.
- **Helps non-technical colleagues by:** catches the wrong-account-on-sign-in mistake at the moment it happens, before it propagates into pins / submissions that the person later regrets.

### Variant 5 — Integrate with bank SSO so GitHub sign-in is automatic and the bank-email question never arises
Use the bank's identity provider (Azure AD / Entra ID / whatever) to gate access to NbgAiHub itself. The hub becomes a logged-in-only experience for bank colleagues. GitHub-account questions become moot because the SSO identity carries through.
- **Effort:** ambitious
- **Tradeoff:** dramatic increase in operational complexity (IdP integration, allowlists, claim mapping, ongoing identity-provider maintenance, SSO debugging when it breaks). Loses the public-readable site model (per SCOPE.md, the site is on free GitHub Pages and currently public). Requires operator decision on whether the hub stays public or becomes internal. Out-of-scope for current MVP; flag for the team-org migration described in SCOPE.md's "Migration path" section.
- **Helps non-technical colleagues by:** their bank login *is* their hub login; no separate GitHub account decision to make, no PAT to paste — the whole onboarding becomes invisible.

---

## Theme 13 — Sign-in flow requires PAT creation, which is opaque and intimidating to non-technical users

From the raw feedback:

> "The sign-in might require its own, uh, space to discuss it or rather to tell the users who are going to log in for the very first time. Uh, maybe it's worth giving something there at — I'm also thinking, uh, about starting with foundations, probably, to give some instructions as if the other person has no idea at all, which is what you do. Uh, just maybe a bit more, for example, the sign-in, now for the other person to log in and create a token, it's not, uh, it's not very easy. Uh, we need to somehow make it very easy and specific for them."

**Verdict:** partially confirmed

**Evidence:** `site/src/components/SignInModal.astro` was redesigned 2026-05-25 late-night and 2026-05-26 morning per UAT images #17 / #18. Current state: 2-step layout with bordered step cards, teal numbered chips `01` / `02`; Step 1 is a button-styled deeplink to `/settings/tokens/new?scopes=gist&description=NbgAiHub`; Step 2 is the PAT-paste input. Anonymous panel on `/my-pins/` was rebuilt as a 2-column grid with 4 FAQ mini-cards. The flow is already deliberately walk-through-y. But: PAT creation on GitHub is still a multi-step external journey (sign in → settings → Developer settings → tokens → fine-grained vs classic → scopes → expiry → generate → copy). The hub modal sends users into that journey but cannot guide them within it. Issue #9 (PAT-paste UX fallback to OAuth + Worker) is the documented escape hatch.

### Variant 1 — Add inline screenshots to the SignInModal Step 1 showing what the GitHub PAT-creation page looks like  **★ RECOMMENDED (single pick — Theme 13 V3 dropped per 2026-05-27 operator decision; visual thread with 17 V2 + 19 V2)**
The current Step 1 is "Click here to create a token on GitHub" (a button). Add below it a small thumbnail (or expandable larger screenshot) showing exactly what the GitHub token-creation page looks like with the relevant fields pre-highlighted ("Token name = NbgAiHub, scope = gist, expiry = your choice"). The screenshot is the bridge between the deeplink and the user's experience on GitHub's side.
- **Effort:** light
- **Tradeoff:** screenshot dates as GitHub redesigns its settings UI (and GitHub redesigns its settings UI). Maintenance check needed periodically. Adds visual weight to a modal that was recently slimmed down.
- **Helps non-technical colleagues by:** recognition over recall — they see the page they're about to land on before they leave the hub, which dramatically reduces the "did I do this right?" anxiety.

### Variant 2 — Add a 60-second screencast to the SignInModal showing the end-to-end PAT-paste flow
A small embedded video (or animated SVG) inside the modal showing: "Click the deeplink → log in to GitHub → token-creation page with fields filled in → click Generate → copy the token → paste back here → Sign in." Self-contained walkthrough.
- **Effort:** moderate
- **Tradeoff:** video production cost; needs accessibility (captions). Video has to be re-recorded when GitHub UI changes. Better than static screenshots for showing the *flow*; worse than static for letting users freeze on a single screen.
- **Helps non-technical colleagues by:** they see the entire process before doing it themselves — most powerful confidence-building affordance available short of doing it with them in person.

### Variant 3 — Add a "Talk to a human" link inside the SignInModal that opens a team-channel chat or email

> **DROPPED 2026-05-27 (operator decision — "not yet").** No staffed channel currently watching for first-time-sign-in support. Theme 13 ships V1 only (inline screenshots).
A small footer in the modal: "Stuck? Ping the team channel." Resolves to a Teams / Slack / email deeplink with a pre-filled subject. Non-technical users have a known escape hatch when the self-service flow stalls.
- **Effort:** minimal
- **Tradeoff:** invites support load on the AI-unit team. Mitigate by framing as a fallback ("most people get through this in 5 minutes, but if you're stuck, we're here"). Channel needs an actual person watching it for this to be reliable.
- **Helps non-technical colleagues by:** every onboarding flow with an opaque external step benefits from a "I'm not alone in this" escape hatch — the existence of the link reduces anxiety even when not used.

### Variant 4 — Build a `/sign-in-walkthrough/` page covering the whole PAT-paste path step-by-step before the modal even opens
A dedicated walkthrough page that the SignInModal links to as a primary action ("First time? Walk through this once.") with sections for each beat: what a PAT is, why we need it, how to create one (with screenshots), what scopes to grant, how to paste it back, what happens after. Modal becomes secondary — for users who already know the flow.
- **Effort:** moderate
- **Tradeoff:** another page in a hub that already has a personalization explainer panel on `/my-pins/`. Content overlap risk — the page has to be the canonical source and the modal/panel link to it, not duplicate it. Worth considering only if Variants 1–3 prove insufficient.
- **Helps non-technical colleagues by:** they can read the whole story in one place, at their own pace, before committing to the flow — defuses the "I'll just stare at the modal until I understand it" stall.

### Variant 5 — Replace PAT-paste with GitHub OAuth via a small Cloudflare Worker proxy (per Issue #9)
Implement the documented-but-rejected OAuth + Worker alternative from `docs/reference/investigation-personalization.md`. User clicks "Sign in with GitHub", goes through standard OAuth consent, never sees a token, never copies/pastes anything. The Worker holds the token server-side and stores favourites in KV (or proxies to gist on the user's behalf with appropriate scope).
- **Effort:** ambitious
- **Tradeoff:** dramatic increase in operational surface — a Worker to deploy, secrets to manage, OAuth app to register on GitHub-side, GDPR exposure if the Worker keeps user tokens. Operator explicitly rejected this once on the zero-infrastructure promise; only revisit if Variants 1–4 don't move the friction enough.
- **Helps non-technical colleagues by:** removes the single most-alien step of the current flow (creating + pasting a PAT) — replaces it with the OAuth click-through they recognise from "Sign in with Google" everywhere else on the web.

---

## Theme 14 — Beginners need richer skills: sandbox-API, superpowers, "clean CLAUDE.md / no stale files" tip

From the raw feedback:

> "Among the skills, uh, the create APIs is missing, the create sandbox skill. Uh, in general these skills are very useful in developing, uh, and when it comes to building apps that connect to the bank's external systems… also in the skills, uh, I'd add the superpowers… for some cases and for some implementations they're useful because they do the job for you, like, very correctly and methodically, uh, especially if you're a beginner."
>
> "In the tips I'd add — I didn't see it, maybe you've added it — I'd add that you need to have, uh, clean, uh, Claude MD, uh, and generally not to keep in your project 3 stale files — there needs to be proper organization."

**Verdict:** confirmed

**Evidence:** `skills/` contains 6 entries per SCOPE.md (team, claudemd, deploy, uat-panel, frontend-design, database-schema-designer, commit-work, jira, gsd — listed as 9 in older docs but canonical AUTO block in SCOPE.md says 6). There is no "create-apis" / "sandbox" / "superpowers" skill in the catalog. `tips/` (14 entries per AUTO) covers prompting, survival keys, context discipline, compliance — but no entry titled or topic-tagged as "project hygiene" / "clean CLAUDE.md" / "stale files cause hallucinations". The reviewer's gaps are real.

### Variant 1 — Author one new tip: "Clean CLAUDE.md and no stale files — why Claude hallucinates without project hygiene"  **★ RECOMMENDED (single pick — Theme 14 V3 dropped per 2026-05-27 operator decision)**
A new `tips/project-hygiene.md` entry, 200–400 words, covering: keep CLAUDE.md under two pages, prune stale README sections, delete dead code, why Claude reads everything in a folder regardless of relevance, real symptoms of stale-file confusion. Tagged `topics: [compliance, context]` and `audience: beginner`.
- **Effort:** minimal
- **Tradeoff:** one tip's authoring cost. Risk of repeating content already implicit in `tips/claudemd*` entries — need to position the new tip as the project-hygiene angle specifically, not the CLAUDE.md drafting angle.
- **Helps non-technical colleagues by:** the "Claude hallucinates because your project is messy" framing is a high-leverage insight for beginners who would otherwise blame the model. Names a real problem and gives a clear remediation.

### Variant 2 — Catalog the requested missing skills (create-apis / sandbox / superpowers) as `status: planned` entries with author-claim links
Add three new `skills/*.md` files with `status: "planned"` (existing schema field) and a small "Want to author this? Open a PR." note. Listing page renders them differently (greyed, "coming soon" badge). Reflects the team's intent without requiring the skills to exist yet.
- **Effort:** minimal
- **Tradeoff:** "planned" rows risk feeling like broken promises if they sit there for months without progress. Mitigate with a visible date ("planned as of 2026-05-26") so it's obvious if they age. Trade off transparency against perceived velocity.
- **Helps non-technical colleagues by:** they see "we know this exists and we want it" rather than "we forgot about this whole category". Signals an active roadmap.

### Variant 3 — Author three full skill entries for create-apis, sandbox, superpowers — with worked examples and slash commands

> **DROPPED 2026-05-27 (operator decision).** Underlying skills don't yet exist in `556LowCodeNoCode/Skills`. Operator will add them in a later round. Theme 14 ships V1 only (project-hygiene tip).
Real content. Each entry covers: what the skill does, the slash command, prerequisites, a worked example, audience tag, when_to_use. Brings the catalog up to 9 entries (closer to original target). Includes any necessary plugin/skill scaffolding files if these aren't yet in the team's plugin marketplace.
- **Effort:** substantial
- **Tradeoff:** authoring cost per skill is high (a real worked example takes hours, not minutes). May require corresponding work in the `556LowCodeNoCode/Skills` marketplace if those skills don't actually exist yet. Don't catalog skills that don't actually exist — empty links destroy trust.
- **Helps non-technical colleagues by:** they have a much richer catalog to draw from on day 1; the gaps the reviewer named were the ones beginners would benefit from most.

### Variant 4 — Build a "Request a skill" surface where beginners can submit ideas for what they wished existed
A small form (or a GitHub Issues template) where any colleague can submit "I wish there was a skill that did X". Surfaces collective demand to the AI unit. Could live as a `/request-skill/` page or as a clearly-linked GitHub Issues template.
- **Effort:** moderate
- **Tradeoff:** invites a flow of low-quality requests ("I want a skill that does everything"); needs a triage process or it becomes spam. Best paired with a public roadmap so requesters can see whether their idea is already planned. Anonymous form requires PAT-or-similar auth model.
- **Helps non-technical colleagues by:** they have agency — "this hub takes my suggestions" rather than "this hub tells me what skills I have access to". Cultural signal that they're a stakeholder, not just a recipient.

### Variant 5 — Rebuild the skills layer as a fully-fledged marketplace with skill authorship metadata, ratings, install counts
Treat each skill like a marketplace listing: author byline, install count (pulled from plugin telemetry if available), team-endorsement badge, "users who installed this also installed…" recommendations, in-page ratings/comments. Aligns with `556LowCodeNoCode/Skills` if that marketplace exists at scale.
- **Effort:** ambitious
- **Tradeoff:** dramatic complexity increase — telemetry pipeline, ratings storage (back to "we need a backend"), abuse moderation, ranking algorithm. Loses the "static site with markdown content" simplicity that makes the current hub maintainable. Only justified at >50 skills cataloged.
- **Helps non-technical colleagues by:** social proof — they see what their colleagues actually use, rather than guessing from a flat list. Most powerful relevance signal at scale.

---

## Theme 15 — Glossary count is inconsistent across pages (36 on Foundations, 34 on Day 1)

From the raw feedback:

> "An example I saw, if you go to, uh, if you go to the foundations page, all the way down, scroll all the way down where it says glossary, it says 36 terms in plain English. But if you go to day one page, uh, again all the way down where it says glossary, it says 34 terms, uh, in plain English. Okay, it's very small, but in case we want clarity in that too."

**Verdict:** confirmed

**Evidence:** `site/src/pages/start-here/foundations.astro:295` hardcodes the string `"Thirty-six terms in plain English"`. `site/src/pages/start-here/day-1.astro:185` hardcodes `'Thirty-four terms in plain English'`. The canonical AUTO block in SCOPE.md says glossary count is 36. Day 1 missed the update during the 2026-05-25 evening glossary expansion. Pure copy drift.

### Variant 1 — Hardcode-fix the Day 1 page string to say "Thirty-six terms" matching Foundations
Single-line edit at `site/src/pages/start-here/day-1.astro:185`: change `'Thirty-four terms'` to `'Thirty-six terms'`. Done.
- **Effort:** minimal
- **Tradeoff:** doesn't solve the underlying problem (two places hold a hardcoded number that needs to track the canonical count) — guarantees the same drift next time glossary grows.
- **Helps non-technical colleagues by:** removes a small but visible inconsistency that signals "this site isn't carefully maintained" — first-impression matters.

### Variant 2 — Replace the hardcoded count with an Astro expression that reads the glossary collection length at build time  **★ RECOMMENDED**
At both `foundations.astro:295` and `day-1.astro:185`, replace the hardcoded string with `${(await getCollection('glossary')).length} terms in plain English` or equivalent. Build-time evaluation; auto-tracks the canonical count.
- **Effort:** minimal
- **Tradeoff:** introduces a build-time data dependency in a paragraph of copy that's currently pure text. If the collection query fails at build, the copy breaks. Very low risk in practice but worth noting.
- **Helps non-technical colleagues by:** future-proofs the consistency — every glossary addition automatically reflects on these pages.

### Variant 3 — Extract the count to a single source-of-truth constant imported by both pages
Create a small `site/src/lib/counts.ts` or similar that exports `glossaryTermCount: number` (computed from `getCollection`). Both pages import it. Centralises any future copy that references the count.
- **Effort:** light
- **Tradeoff:** small new file for a small constant — borderline overkill for one number. Worth doing if other pages start referencing other counts (skills count, tips count, etc.) — a constants file pays off at >3 consumers.
- **Helps non-technical colleagues by:** they don't experience the inconsistency, plus the codebase becomes self-documenting about which counts matter.

### Variant 4 — Add a docs-drift CI check that scans for hardcoded counts in copy and fails the build if they don't match canonical
Extend `scripts/sync-doc-counts.mjs` (or add a sibling script) to grep source files for patterns like "Thirty-X terms" and validate against the actual count. Runs as part of the `.github/workflows/docs-drift.yml` workflow that already enforces SCOPE.md / CLAUDE.md count blocks.
- **Effort:** moderate
- **Tradeoff:** more CI complexity. Greppable patterns for spelled-out numbers are fragile ("Thirty-six" vs "36" vs "more than 30"). Worth it only if hardcoded counts are a recurring source of drift.
- **Helps non-technical colleagues by:** transparently — they don't see the CI but they reliably see consistent numbers.

### Variant 5 — Remove the numeric claim from both pages entirely and let the glossary page speak for itself
Rephrase both pages' copy to drop the specific count: "Plain-English definitions for every term used across the hub — what they mean, when they matter. Use it as a reference, not a reading list." Numerals only on `/glossary/` itself, where they're computed live from `getCollection`.
- **Effort:** minimal
- **Tradeoff:** loses the implicit "this hub has substantial content" signal that the specific number provides. Drop only if you trust the rest of the page to convey scope.
- **Helps non-technical colleagues by:** no drift to spot, no inconsistency to lose trust over.

---

## Theme 16 — The hub doesn't visibly tell users they can prompt in Greek

From the raw feedback:

> "I think it's important to emphasize somewhere that we can speak our own language and explain things as they come naturally to us, uh, so we can move forward, meaning to speak Greek, to write in the cloud code. Uh, I think it's good to emphasize that here too, so people won't be afraid of it."
>
> "There should be a Greek option, so it's bilingual."

**Verdict:** confirmed (partial — two distinct sub-concerns)

**Evidence:** No copy on the live site mentions that Claude Code accepts Greek prompts. `glossary/`, `tips/`, `skills/` content is in English. SCOPE.md "Deferred — LATER" explicitly includes "Greek-language content" as deferred — so a full UI translation is out-of-MVP-scope by prior decision. But the *prompt-in-Greek* affordance is a property of the underlying model, not a translation effort — it deserves its own visibility on the site even if UI translation is deferred.

(Note: this theme has been kept whole because the two sub-concerns share the same primary remediation surface — the "you can speak Greek" affordance — even though the bilingual-UI sub-concern overlaps SCOPE.md's deferred bucket.)

### Variant 1 — Add a one-line callout in the homepage hero: "Claude Code understands Greek. Prompt in whichever language feels natural."  **★ RECOMMENDED (multi-pick with Theme 16 V2)**
Single-sentence addition to `index.astro` hero or to the `hero__what` callout. Makes the language affordance visible without committing to a full bilingual UI.
- **Effort:** minimal
- **Tradeoff:** doesn't address the "bilingual UI" half of the original ask. But solves the most actionable concrete sub-concern with one copy edit.
- **Helps non-technical colleagues by:** removes the "I'm not confident in English, can I even use this?" gate — explicit permission to use their first language.

### Variant 2 — Author a dedicated tip "Prompting in Greek (or any language) — what works and what doesn't"  **★ RECOMMENDED (multi-pick with Theme 16 V1)**
A new `tips/prompting-in-greek.md` entry covering: yes you can, the model is multilingual, here's a Greek prompt example with the result, watch out for code identifiers staying in English even if your prose is Greek, mixed-language prompts work too. Tagged `audience: beginner`.
- **Effort:** light
- **Tradeoff:** authoring a real worked example in Greek requires native fluency (likely no problem internally but worth flagging). Tip dates as model capabilities evolve, but the answer is durable in shape.
- **Helps non-technical colleagues by:** concrete example removes the abstract "does it really work?" doubt — they see a Greek prompt and a Greek response and know.

### Variant 3 — Add a language-switcher chip to the homepage hero (EN / EL toggle) that swaps copy on key pages
A small EN/EL toggle that swaps a hand-curated subset of copy (hero, intro callout, the two router cards, top-level nav labels). The bulk of content stays English; the toggle covers the visitor's entry surfaces only. Selected language persists in localStorage.
- **Effort:** moderate
- **Tradeoff:** introduces a language-switching pattern that the rest of the site doesn't follow — visitor toggles EL on the homepage, navigates to Foundations, finds English content; experience feels broken. Best paired with Variant 4 below as a single phased rollout.
- **Helps non-technical colleagues by:** visible bilingual surface is a strong signal that the hub is for them; even partial bilingualism beats none if the entry surfaces are covered.

### Variant 4 — Build a fully bilingual `/el/` route tree mirroring the English content for top priority pages
Astro i18n routing: every page also exists at `/el/<path>` with Greek translations. Start with homepage + Foundations + Day 1 only; expand as content owners can translate. Per-page language switcher in the header.
- **Effort:** substantial
- **Tradeoff:** translation maintenance is forever — every English content change has to be mirrored to Greek or the two diverge. SCOPE.md's "Deferred LATER" bucket exists for good reason. Risk of half-translated state (English remains canonical, Greek lags) feeling worse than English-only. Best with operator-confirmed translator capacity.
- **Helps non-technical colleagues by:** for Greek-first colleagues, reading in their native language is universally easier — a real accessibility win, not a cosmetic one.

### Variant 5 — Explicitly decline the bilingual-UI ask and document the reasoning in DECISIONS + a visible "About language" note
Acknowledge that full bilingual UI is deferred per SCOPE.md, add a `DECISIONS.md` entry explaining why (translator capacity, prioritisation, that the prompt-in-Greek affordance is the primary actionable need), and surface the reasoning in a short footer note on the homepage ("UI is in English; prompts can be in any language Claude supports — see the prompting-in-Greek tip"). Closes the question without leaving it open.
- **Effort:** minimal
- **Tradeoff:** explicit declines can feel cold — frame as "we're focusing on X first" rather than "we decided no". Combined with Variant 1 (prompt-in-Greek copy) this is the most honest minimal-effort response.
- **Helps non-technical colleagues by:** no false expectations — they know what the hub will and won't do for them on language, so they can plan accordingly.

---

## Theme 17 — A sandbox where colleagues can try Claude Code without committing

From the raw feedback:

> "If I remember correctly, you've already mentioned that you're thinking of adding a section like a sandbox, where someone can play around, try things, and see what Claude Code means. If you already have it in mind, uh, okay. If not, I think it would help."

**Verdict:** confirmed (gap — no sandbox surface exists)

**Evidence:** No `/sandbox/` route on the site. No interactive surface anywhere. The closest equivalent is the in-content code-fenced examples (`claude --dangerously-skip-permissions`, etc.) which are read-only. SCOPE.md "Deferred — LATER" doesn't explicitly list sandbox, but the broader content + tooling surface area is MVP-scoped — sandbox is implicitly out-of-MVP. The reviewer flagged it as a gap they think would help; worth surfacing as a real proposal regardless.

### Variant 1 — Add a "Try a prompt now" card to the homepage linking to a guided first-prompt experience
A simple card in the homepage Newcomer route that opens a guided overlay: "Type a prompt below" → user types → site shows a pre-canned example response (no real LLM call) with a "Try this in Claude Code yourself" CTA underneath. Pure illustration, zero infrastructure.
- **Effort:** light
- **Tradeoff:** the "response" is staged — risks feeling fake if not labelled clearly. Must be honest that it's a recording / mock, not a live model. Done well, it's a faithful demo; done sloppily, it's misleading.
- **Helps non-technical colleagues by:** they see what a Claude session looks like before deciding to install — lowest-commitment "try before you buy" surface.

### Variant 2 — Embed a curated set of pre-recorded "asciinema-style" terminal sessions on the homepage and key tips  **★ RECOMMENDED (visual thread with 13 V1 + 19 V2)**
Asciinema (or similar) is a terminal-session recorder/player. Record 3–5 short sessions (~30s each) showing real Claude Code interactions: "summarise this README", "find the bug in this function", "draft a commit message". Embed the players inline. No live computation; just authentic recordings.
- **Effort:** moderate
- **Tradeoff:** asciinema embeds add a script dependency. Recordings date as the Claude UI evolves. But they're cheap to produce and re-record. Embeds need accessibility (text alternative for the recording playback).
- **Helps non-technical colleagues by:** seeing a real session in motion is much more informative than reading about one; they see the pace, the prompt-response rhythm, the visual feel.

### Variant 3 — Build a "Workshop in a browser" page with a sequence of guided exercises (text-only, no live LLM)
A `/sandbox/` page with 5–7 exercises: "Here's a prompt — what would you change to make it more specific?" / "Read this Claude response — what would you ask next?" / etc. User answers in a `<textarea>`; site shows the team's worked solution on submit. Pedagogical, not interactive-with-the-model.
- **Effort:** substantial
- **Tradeoff:** content authoring intensive (each exercise needs careful pedagogy). Risk of feeling like a corporate-training module. But effective at building the *thinking* skill rather than just demonstrating the tool.
- **Helps non-technical colleagues by:** active engagement beats passive reading for skill acquisition — they practice the thinking pattern before facing the real tool.

### Variant 4 — Build a live in-browser Claude playground using the bank's Azure OpenAI tenant
A real chat surface on the site, with quota-limited per-visitor calls, backed by the bank's Azure OpenAI tenant. User types a prompt, gets a real model response. Constrained: no file access, no shell access, just chat (since that's all the browser can offer). Closest to a real "sandbox".
- **Effort:** ambitious
- **Tradeoff:** infrastructure cost (Azure tokens per visitor), abuse exposure (rate limiting, prompt injection), governance (chat logs, retention policy, PII redaction). Diverges sharply from the "static site with markdown content" architecture. Not bank-compliance-free.
- **Helps non-technical colleagues by:** lowest-cognitive-load "try it now" — they form an opinion of the tool in 30 seconds without installing anything.

### Variant 5 — Partner with the team to host periodic "Open hours" sandbox sessions (real Claude, real colleagues, real questions)
Not a digital surface — an *event* surface. Scheduled weekly "drop in and try Claude Code with us" sessions in a meeting room (or Teams call). Hub page lists the schedule and the contact. People who don't want to install Claude get to use it under a colleague's account briefly.
- **Effort:** light (calendar-wise; high in human-time commitment per session)
- **Tradeoff:** human-time cost is the real expense — someone has to host every session. But the social affordance ("you can ask any dumb question, nobody's judging you") is unmatched by digital surfaces. Best paired with one of the digital variants above.
- **Helps non-technical colleagues by:** lowest-anxiety entry point — a real human walking them through, no public failure surface.

---

## Theme 18 — Tech vocabulary (GitHub, Docker, Postgres) used without beginner-level definitions

From the raw feedback:

> "Now that I have a bit of experience — having shown the project to Eleni, who is essentially a user without much technical background — I'd say something more about what, for example, GitHub is, because users have never used GitHub, Docker, Postgres; there should be a completely dummy version. What I mean is, I think the text is a bit too technical in that section. If you have a technical background, sure, you understand; but if you're a business user and you've never heard these terms, I think it's hard to understand what they are and why you need them to do development."

**Verdict:** partially confirmed

**Evidence:** Glossary covers GitHub itself (`glossary/github.md`, added 2026-05-25), `gh` CLI, `repository`, `pull-request`, `commit`, `branch`, `hook`, `markdown`, `frontmatter`, `yaml`. NOT in glossary: `docker`, `postgres`, `database`, `container`, `bash`, `cd`, `terminal`, `shell`, `WSL`, `PAT`, `ghp_*`. Day 1 mentions WSL (line 23) without a glossary entry. Foundations likely uses Docker/Postgres in context per the reviewer's claim (the codebase scan flagged this in §4.9). The auto-link plugin can't help words it doesn't know.

### Variant 1 — Author 5 new glossary entries: docker, postgres, database, container, bash  **★ RECOMMENDED (ship after Theme 6 V1 depth-cap)**
Five new `glossary/*.md` files, each with beginner-friendly `tldr` (≤160 chars), 200–400 word body, and aliases (e.g. `docker` → `["Docker", "docker container", "docker containers"]`). The auto-link plugin auto-wraps first occurrences across the site.
- **Effort:** light
- **Tradeoff:** content cost per entry is real (good tldrs are hard to write — see the 2026-05-25 evening project-wide rewrite). Five more terms intersects with Theme 6 tooltip-chaos risk — solve Theme 6 first or accept compounding.
- **Helps non-technical colleagues by:** every "what is Docker?" hover answers itself inline without context-switch — primary mechanism for closing the technical-vocabulary gap.

### Variant 2 — Add a "Stack 101" tip explaining the common tech stack a Claude Code user encounters
A single `tips/stack-101.md` entry, 500–800 words, covering: what GitHub is for, what Docker is for, what a database is for, what Postgres is, why developers use these things, what a non-developer needs to know to read a tech conversation. Doesn't try to teach the tools — just decodes them.
- **Effort:** moderate
- **Tradeoff:** long-form content; harder to keep concise than 5 small glossary entries. Risk of becoming a textbook section if not tightly scoped. Better as the long-form companion to Variant 1's glossary entries.
- **Helps non-technical colleagues by:** they can read one piece and walk away with a working mental model of the tech stack rather than five disconnected definitions.

### Variant 3 — Add inline `<dfn>`-style first-encounter expansions when a tech term appears in a journey/tip body
A new remark plugin that wraps the first occurrence of a configured set of "high-friction" terms (Docker, Postgres, etc.) in an inline `<dfn>` element with a short definition shown as italic parenthetical: "Docker *(a way to package an app with all its dependencies)*". Persistent (not hover) — they see the definition immediately on the page.
- **Effort:** moderate
- **Tradeoff:** another remark plugin = more build-time complexity, intersects with the glossary-link plugin (overlap rules need defining: glossary terms win, or `<dfn>` wins, but not both). Inline text expansion is visually noisier than tooltips — risk of breaking reading flow.
- **Helps non-technical colleagues by:** zero interaction required — they read the definition the first time they encounter the term, no hover, no click.

### Variant 4 — Build a "Beginner's tech dictionary" page distinct from the technical glossary, focused on non-Claude-specific terminology
The current glossary is Claude-specific + adjacent (claude-code, claudemd, MCP, skill, plugin, hook, etc.). A separate `/dictionary/` page would focus on the *general* tech vocabulary a colleague encounters: developer workflows (PR, code review, branch), backend (database, API, server), DevOps (Docker, deployment, container), tooling (CLI, terminal, shell). Doesn't compete with the Claude glossary; complements it.
- **Effort:** substantial
- **Tradeoff:** new content pillar = new authoring burden. Two glossaries may confuse users about which to consult first. Could mitigate by cross-linking (a Claude glossary entry that uses "Docker" inline links to the dictionary's Docker entry). But the question "where do I look this up?" becomes nontrivial.
- **Helps non-technical colleagues by:** the dictionary's scope matches their actual confusion ("I'm fine with Claude jargon, it's the general dev jargon that loses me"), so it's hit-rate-better than expanding the existing glossary.

### Variant 5 — Replace the entire technical content with a parallel "non-technical edition" track of the hub
A full second content track where every journey, tip, and skill is rewritten for a non-technical reader — no command-line invocations, no code, no shell vocabulary. Lives at `/business/` or as an alternative AudienceFilter mode that hard-filters content rather than just labelling it.
- **Effort:** ambitious
- **Tradeoff:** dramatic content duplication — every piece of content authored twice, maintained twice. Risk of the non-technical track being patronising or, worse, *wrong* (over-simplification of technical concepts produces myths). But it's the only way to genuinely serve a non-technical audience as a first-class citizen rather than as a "we'll add definitions" afterthought.
- **Helps non-technical colleagues by:** they get content that's actually authored for them, not authored for developers and softened — different content shape, not the same content with annotations.

---

## Theme 19 — Visual content (diagrams, screenshots) would help reduce reliance on prose

From the raw feedback:

> "I'm the kind of guy who can't read that much text, and I really can't memorise any text at all. Images and some diagrams help me a lot. Maybe something like that could help users who are like me — to read more easily and get more help."

**Verdict:** confirmed (gap — site is text-dominant)

**Evidence:** No diagrams in `journeys/foundations.md` or `journeys/day-1.md` per the codebase scan. No images in `tips/` or `skills/`. The only image surface site-wide is the NBG wordmark logo. The reader-mode CSS specifically optimises for typography rhythm of long-form prose — the existing design pattern is text-first. SCOPE.md notes "diagrams/screenshots on Foundations" as a forward improvement in the 2026-05-25 late-night UAT entry.

### Variant 1 — Add 3–5 simple SVG diagrams to the Foundations page (one per major concept: CLAUDE.md, session lifecycle, skill flow)
Hand-authored SVGs (or commissioned), one per Foundations step that has a conceptual shape worth visualising. Diagrams are small (≤400px wide), in-line, accessible (text alternative + meaningful titles).
- **Effort:** moderate
- **Tradeoff:** SVG authoring takes a designer's time; bad diagrams (cluttered, unclear) are worse than no diagrams. Investment is per-diagram. Set a quality bar before commissioning.
- **Helps non-technical colleagues by:** diagrams hold information that prose has to spread across paragraphs; a good diagram is the fastest way to convey a process or a hierarchy.

### Variant 2 — Add screenshots of Claude Code in action to Day 1 and key tips  **★ RECOMMENDED (visual thread with 13 V1 + 17 V2)**
Annotated screenshots: terminal showing a Claude session in progress, the permission prompt UI, the edit-approval UI, the `/compact` summary output. Numbered callouts highlighting the parts that matter. Reuses existing PNG/image pipeline.
- **Effort:** light
- **Tradeoff:** screenshots date as the Claude Code UI changes (and it does). Maintenance check needed. PNGs add page weight (mitigate with `<picture>` + WebP).
- **Helps non-technical colleagues by:** they recognise the UI before they encounter it, so when they install Claude Code, the visual is familiar rather than alien.

### Variant 3 — Add an inline visual table-of-contents diagram to the homepage showing the hub's 5 content pillars
A single SVG (or CSS-styled HTML) diagram showing the hub at a glance: 5 pillars (Skills / Tips / News / Glossary / Journeys) with their counts and a sentence each on what they cover. Lives above the two-door router or in the Experienced card's pill row.
- **Effort:** moderate
- **Tradeoff:** another above-the-fold element competing for first-paint attention (Theme 2 wants less, not more). Best paired with Variant 1 of Theme 2 (remove the below-fold catalog grids) to free up space.
- **Helps non-technical colleagues by:** the hub's structure becomes visible at a glance — they understand the shape of what they're navigating before they navigate it.

### Variant 4 — Author one explainer animation (Lottie or GIF) per major concept (CLAUDE.md, session, permission-prompt, slash command)
Short loop animations (3–6 seconds each), embedded inline. Show the concept rather than describe it. Hosted as Lottie JSON (lightweight) or static GIF (broader compatibility).
- **Effort:** substantial
- **Tradeoff:** animations are content-production-heavy (need a designer comfortable with motion graphics). Risk of distracting motion (mitigate by respecting `prefers-reduced-motion`). Worth it for the visual learners that prose simply can't reach.
- **Helps non-technical colleagues by:** motion shows process (a still image can show structure but not flow) — concepts like "session memory fills up" are perfect for animated illustration.

### Variant 5 — Commission a full illustrated style for the hub — every major surface gets bespoke illustrations
A designer creates a cohesive illustration set: a CLAUDE.md illustration, a session illustration, a skill illustration, a pin illustration, a journey illustration, etc. Each is on-brand (teal accent, AgentNews aesthetic), accessible, and gives the hub a memorable visual identity.
- **Effort:** ambitious
- **Tradeoff:** real designer engagement (external or internal), significant timeline and cost, ongoing commitment to maintain the visual language as content evolves. Highest-impact lift on first impression but commensurate cost.
- **Helps non-technical colleagues by:** professional visual design signals institutional investment — "this hub matters" — and provides memorable visual anchors that pure text cannot.

---

## Theme 20 — NBG logo briefly disappears/reappears on home-tab click

From the raw feedback:

> "When you tap the NBG logo, uh, sometimes, or anyway, you press one of the buttons that takes you to the home screen or it refreshes them, the NBG logo, you know, sometimes disappears and then shows up again. Super minor, it's just that maybe — okay — we'll see it at some point, I don't know, in 10 years, it doesn't matter, I just saw it and said it."

**Verdict:** confirmed (visual flicker, low severity)

**Evidence:** `site/src/components/SplashAwareHeader.astro` lines 100–116 render two `<img>` tags (light + dark wordmarks) with CSS toggling visibility based on `html[data-theme]`. Per codebase-scan §4.10, if the theme attribute is unset at initial render (Starlight's `ThemeProvider.astro` sets it on `DOMContentLoaded`), both logos may render briefly before the swap. Astro view-transitions may also cause flicker on navigation. No issue currently tracks this; the reviewer's observation is the first mention. This is plausibly the same family as Issue #20 (Starlight unlayered cascade) — local-vs-deploy CSS load order causing visual artefacts.

### Variant 1 — Set the theme attribute synchronously via a tiny inline script in `<head>` so both logos never co-render  **★ RECOMMENDED**
Inline a `<script>` in the head that reads the saved theme from localStorage and sets `document.documentElement.setAttribute('data-theme', …)` before any CSS or body content paints. Eliminates the flash-of-both-logos at initial render.
- **Effort:** minimal
- **Tradeoff:** inline scripts in `<head>` are a render-blocking pattern that needs care (must be tiny + synchronous + safe to fail). Already a known pattern (anti-FOUC scripts in dark-mode-aware sites). Works for the initial load case; doesn't help if the flicker is from view-transitions on internal navigation.
- **Helps non-technical colleagues by:** they don't see the visual glitch — the site feels more polished, which contributes to overall trust.

### Variant 2 — Combine both logos into a single CSS-`mask`-based image that recolours based on theme
A single neutral-colour PNG of the wordmark, recoloured at runtime via `mask-image` + a background colour token. One image element, one CSS toggle, no two-image-swap race.
- **Effort:** moderate
- **Tradeoff:** CSS masking has cross-browser quirks (especially older Safari versions). The wordmark detail might not render perfectly via mask — needs testing. Aliasing artefacts possible on high-DPI screens.
- **Helps non-technical colleagues by:** the logo behaves identically across themes — no visible artefact, ever.

### Variant 3 — Use a CSS-only logo (SVG inline with theme-aware fill) instead of two PNGs
Replace the two `<img>` tags with one inline `<svg>` whose `fill` is a CSS variable (`var(--nbg-ink)` or similar). One element, instant theme-following recolour, no image swap.
- **Effort:** light
- **Tradeoff:** requires the NBG wordmark to be available as SVG (or vectorised from the PNG). SVG of brand marks needs brand-team sign-off if the bank has strict logo guidelines. SVGs are more accessible (text alternative is automatic) but inline SVGs increase HTML size slightly.
- **Helps non-technical colleagues by:** invisible improvement to them; they just don't experience the flicker. Lowest-friction technical fix.

### Variant 4 — Wrap the logo in a fade-in animation that masks the flicker with a smooth 200ms opacity ramp
On `astro:page-load`, the logo fades in from `opacity: 0` over 200ms. Any flicker during the transition is hidden because the element is invisible during the swap. Respects `prefers-reduced-motion` (no fade — just direct render).
- **Effort:** light
- **Tradeoff:** treats the symptom not the cause. If the underlying flicker logic ever breaks worse, the animation hides the breakage. Better to fix the root cause (Variant 1 or 3) than mask it.
- **Helps non-technical colleagues by:** they don't see the flicker; the page feels smooth.

### Variant 5 — Fully refactor the header logo pipeline: move to a single source-of-truth SVG primitive used everywhere, drop the dual-PNG approach
Create a `<NbgLogo />` primitive in `site/src/components/primitives/`. Component encapsulates the SVG, the theme-aware fill, accessibility, sizing. Replace every `<img class="nbg-topnav__logo">` usage across the codebase. Cleans up logo handling for the long term.
- **Effort:** substantial
- **Tradeoff:** primitive-level changes need testing across every surface that uses the header (every page). Adds a 17th primitive (current count is 16 per CLAUDE.md). Justifies its own effort only if the logo issue is part of a broader header-rationalisation pass.
- **Helps non-technical colleagues by:** invisible to them; benefits accrue to the next person who touches header / branding code by having one obvious place to look.

---

## Open questions

These could not be resolved at analysis time:

- **Are Themes 9 (off-site News) and 17 (sandbox) considered actionable or are they out-of-scope per SCOPE.md / DECISIONS?** News is a deliberate redirect per 2026-05-25 nav rework — the operator may treat any "bring News back on-site" variant as unwelcome. Sandbox is not explicitly deferred in SCOPE.md but is implicitly out-of-MVP. The analysis surfaces both because the colleagues flagged them; the operator decides whether to engage.
- **Is the "300+ tooltips" complaint (Theme 6) a real performance issue or a perception issue?** No profiling data exists. A headless-Chrome run with timing instrumentation on the Glossary page would resolve this empirically. If it's purely a perception issue (no actual perf degradation, just visual noise), Variants 1/2/4 cover it. If it's a real perf issue, Variants 3/5 become more attractive.
- **Does Issue #19 (the violet primitive leftover) deserve its own Theme?** The colleagues did not flag focus-ring colour as a UAT concern — the issue is internal cleanup, not a UAT signal. Surfaced inside Theme 8 (design tokens) implicitly via the codebase-scan reference but not given its own theme per the "don't invent themes the colleagues didn't raise" rule.
- **For Theme 16 (Greek bilingualism) — is the operator open to revisiting the SCOPE.md LATER decision in light of multiple colleagues raising it independently?** Theme 16's variants include both "explicitly decline" and "stage a minimal bilingual subset" as legitimate constructive options. Operator decides whether the LATER bucket needs revisiting.

---

## Theme index

| # | Theme | Verdict | Effort spread |
|---|-------|---------|---------------|
| 1 | Foundations is one long scroll with no progressive disclosure | confirmed | minimal → ambitious |
| 2 | Homepage is overwhelming for a true beginner | partially confirmed | minimal → ambitious |
| 3 | No stated "why should I be here?" | confirmed | minimal → substantial |
| 4 | Examples and bank-specific case studies are missing | confirmed | minimal → ambitious |
| 5 | Day 1 sequencing, Mac/Windows imbalance, unexplained shell vocab | confirmed | minimal → ambitious |
| 6 | Glossary tooltips open in chains (tooltip chaos) | confirmed | minimal → ambitious |
| 7 | Skill listings need "why use this" (time-saving / outcome) | confirmed | minimal → ambitious |
| 8 | Skills/Tips listings need more filter dimensions + grid view | confirmed | light → ambitious |
| 9 | News redirects off-site; no real Hub About page | partially confirmed | minimal → ambitious |
| 10 | Pinning works but "where do my pins live?" loop unclear | partially confirmed | light → ambitious |
| 11 | Day 1 `--dangerously-skip-permissions` framing conflicts with Tips advice | partially confirmed | minimal → substantial |
| 12 | GitHub-account guidance lacks bank-specific clarity | confirmed | minimal → ambitious |
| 13 | Sign-in flow PAT-creation is opaque and intimidating | partially confirmed | minimal → ambitious |
| 14 | Skills catalog missing entries (sandbox/superpowers); no "project hygiene" tip | confirmed | minimal → ambitious |
| 15 | Glossary count inconsistent across pages (36 vs 34) | confirmed | minimal → moderate |
| 16 | Greek-language affordance not visible; no bilingual UI | confirmed | minimal → substantial |
| 17 | No sandbox surface for colleagues to try Claude Code | confirmed | light → ambitious |
| 18 | Tech vocabulary (GitHub/Docker/Postgres) used without beginner definitions | partially confirmed | light → ambitious |
| 19 | Visual content (diagrams, screenshots) absent; site is text-dominant | confirmed | light → ambitious |
| 20 | NBG logo briefly flickers on home-tab click | confirmed | minimal → substantial |
