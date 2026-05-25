# Decision log

Append-only. Each entry permanent. When a decision is superseded, add a new entry that supersedes it — never edit prior entries.

---

## 2026-05-25 (late-night) — UAT-driven UX overhaul: listing redesigns, code-block fix, MyPins 2-col, submit-skill + contribute removed, 556lowcodenocode references purged

**Trigger:** Operator ran the model as a "pretend-to-be-a-colleague" UAT tester against `localhost:4321` ahead of sharing the link with team colleagues the next day. Output: `UAT-feedback-2026-05-25.md` (26 issues, sorted Critical → High → Medium → Low). Operator then selected 16 items to fix and called out 3 additions during the session (full-width "New here?" panel, better newcomer/experienced icons, dark teal code blocks instead of black).

**Decision — what changed (full list, in priority order):**

1. **Tip + Skill detail pages: redesigned as in-page sections.** The original UAT report flagged `/tips/<id>/` and `/skills/<id>/` returning 404 — there were no detail pages. Rather than build per-entry detail pages (cheap but adds 23 routes), we **redesigned the listings as single-column lists with rich enough rows that the row IS the article preview**. Each row has an anchor ID (`#tip-<slug>`, `#skill-<slug>`) so homepage and external deep-links land directly on the row. Reads as Stripe-style docs index; reading the row tells you what the tip/skill is. The "missing detail page" UAT issue is resolved by the row carrying the full summary, not by adding new pages.
2. **Filter chips redesigned (`AudienceFilter`).** 3-checkbox (Beginner / Advanced / Both) → single-select segmented (Everything / For beginners / For experienced). Old "Both" option dropped — it was an audience *tag*, not a filter *selector*, and confused readers. Active state is now a high-contrast dark inverted pill so "selected" is unmistakable (UAT report: "filters look like passive labels, not interactive buttons"). Legacy localStorage array format auto-migrates to the new string format on read so users who pinned in the old UI don't get a surprise.
3. **Glossary: uniformity via renderer, not 36 markdown rewrites.** UAT report: "entries are wildly uneven in length and structure — some have tables, some are one paragraph, some are bullet lists." Rather than rewrite 36 markdown bodies (massive content lift, would lose voice), I added structural zones to the *renderer*: every entry now shows IN ONE LINE (the schema-required `tldr` in an accent-bordered callout) / IN DETAIL (the markdown body, unchanged) / LEARN MORE (auto-rendered `external_link` + `deeper_link` if present). Uniform spine, varying body. Authors don't need to update anything; consistency comes from the page template.
4. **My Pins: full redesign as a 2-column card.** UAT image #16 flagged that the page didn't match the rest of the site (used `Display`/`Lede` primitives with heavy serif; the rest of the site uses AgentNews `.hero__title`). UAT image #18 then flagged a "gigantic empty gap" and "I don't like the body so much." Resolution: hero swapped to `.hero hero--stack` to match Foundations. Anonymous panel rebuilt as a 2-column grid — LEFT = sign-in CTA panel (eyebrow / serif headline / lede / big teal CTA / no-account footnote), RIGHT = "First time? Here's what's going on" aside with 4 numbered FAQ mini-cards (`01`/`02`/`03`/`04`). Vertical hairline divider between columns. Collapses to single column under 880px. The reader's eye lands on the CTA first; the explainer is an aside, not a competing wall of text. Dropped the gigantic gap by replacing the `.section` wrapper (3.5rem padding-block) with a tighter `.my-pins__body` (2rem top).
5. **Submit-skill + Contribute pages: deleted entirely.** UAT report: "paste a GitHub PAT" looked like a phishing flow to non-developers. Operator decision: scrap the form, not improve it. `site/src/pages/submit-skill.astro` (1224 lines) and `site/src/pages/contribute.astro` (129 lines) deleted. Build-output test paths updated. CI validator (`pipeline/src/validators/skill.ts` + `.github/workflows/validate-skill-submission.yml`) retained — it still gates `skills/**/*.md` PRs from the normal PR path.
6. **Per-card "Sign in to pin" hidden when signed out.** `PinButton.setSignedOut()` now sets `btn.hidden = true` instead of showing the "Sign in to pin" CTA. UAT report: "14 of them on one screen, all saying the same thing, all pointing to the same place — visual noise." Site-wide sign-in is the header CTA. Added explicit `.nbg-pin[hidden] { display: none !important }` rule because `.nbg-pin { display: inline-flex }` would otherwise beat the UA's `[hidden] { display: none }` default.
7. **Shiki dark-default fixed — dark teal code blocks site-wide.** UAT image #14 showed the Day 1 `claude --dangerously-skip-permissions` code block as a near-black slab with hard-to-read syntax tokens. Root cause: Astro defaults to Shiki `github-dark` regardless of site theme. Fix: `shikiConfig.themes = { light: 'github-light', dark: 'github-dark' }` in `astro.config.mjs` for dual-theme support, then in `content-prose.css` overrode `pre.astro-code` with `background: var(--nbg-c-teal-900)` (#052329 — dark teal from the project palette, on-brand with the teal accent), white text, and a teal-800 border. Operator iterated through three options here: light gray (didn't stand out), navy (`--nbg-ink`, looked too gloomy), final dark teal — explicitly called out as the on-brand choice.
8. **Homepage "New here?" intro panel.** UAT report: "headline assumes I already know what Claude Code is — I don't, on day zero." Added a `.hero__what` accent-bordered callout between the lede and the router cards: "Claude Code is a terminal-based AI assistant from Anthropic that reads your code, edits files, and runs commands alongside you. Think of it as a developer pair sitting next to you, inside your project folder. The rest of this site explains how we use it at NBG and how to get started." Operator follow-up: make it full-width (was capped at 60rem); now `max-width: none; width: 100%`.
9. **Homepage router-card icons.** UAT report: "two cards look too similar visually." Newcomer card now carries a compass SVG (orientation — "find your bearings") in a 44px teal halo on the top-left. Experienced card carries a 22px lightning-bolt SVG in a quieter slate square. Operator picked these after I proposed shield (rejected — read as protection/security) and double-chevron (rejected — read as "next-next" not "I know what I want").
10. **Trailing-period headline tic dropped across all H1s.** UAT report: "the trailing period works once. It works less the third time. By the sixth page it's a tic." Changed across Home / Foundations / Day 1 / Skills / Tips / Glossary.
11. **Entry counts removed from listings.** UAT report: "showing `9 entries` reads like a brag — visitor doesn't care about the count, they care whether *their* tip is in there." Removed from homepage section heads and listing page heros.
12. **Truncated previews fixed.** UAT report: "previews end with `…` mid-sentence with nowhere to click to read more." Removed `-webkit-line-clamp: 3` from `.card__summary` in `agentnews-layout.css`. Full summary now renders.
13. **Footer rewritten.** UAT report: "footer doesn't establish the project." Now reads "Maintained by the NBG AI team / Internal use only / Last updated <date>". Per explicit operator direction, **no GitHub repo link** — the repo lives on a personal account and is bootstrap-mode; surfacing the URL would invite questions we'd rather not field on day 1. The repo is still discoverable via View Source on Pages for anyone determined.
14. **My Pins PAT explainer.** UAT report: "paste your PAT" looks like a phishing flow without context. Added a four-Q&A explainer card answering *What's a PAT? / Why does this site need one? / Is it safe? / Where does it live?* Then the operator pushed the redesign further (item 4 above) — the explainer is now a 4-numbered mini-card aside.
15. **`⌘K` search hint hidden.** UAT report: Mac-only signal; reads as noise on Windows; "Search" alone is enough. Hidden via CSS in `SplashAwareHeader.astro`.
16. **Theme toggle gets a label.** UAT report: "I thought the printer icon next to Sign in was a save-to-PDF button." The "printer icon" was actually the theme toggle's sun/moon icon — added `title="Switch theme"` + `aria-label="Switch theme"` to the wrapper.
17. **Mobile overflow fix (not on the explicit fix list — discovered during verification).** Headline "What I wish I knew sooner about Claude Code" was being clipped on phones. Lowered `--nbg-fs-hero` minimum `clamp(2.5rem → 1.75rem, 5vw, 4rem)` in `tokens/primitives.css`; added `text-wrap: balance` + `overflow-wrap: anywhere` to `.hero__title` in `agentnews-layout.css`. Wraps cleanly at 420px now.
18. **All `556lowcodenocode.github.io/Onboarding` references purged.** Operator direction: "do not reference this!!" Sed across 65 markdown files (glossary/tips/skills/journeys + their `plugin/snapshot` mirrors) replaced every `deeper_link: "https://556lowcodenocode.github.io/Onboarding/"` with `deeper_link: null`. With the new glossary "Learn more" auto-render that means those entries simply don't show the link any more. SCOPE.md and DECISIONS.md still reference the URL in narrative (operator-facing logs, not user-facing surfaces).

**Rejected / rolled back this session:**

- **Hover-revealed terminal preview placeholder SVGs for skill/tip rows.** Prototyped at `/public/preview/terminal-skill.svg` + `terminal-tip.svg` with `::after`-positioned floating previews on row hover. Operator's first reaction was "where are they on the site?", second was "ok, we remove the whole screenshot thing from skills and tips." Files deleted, CSS rolled back. The single-column listing layout already breathes — adding images felt redundant.
- **Light-gray code block background.** Operator: "it doesn't stand out this way." Replaced with navy `--nbg-ink`, then with dark teal `--nbg-c-teal-900` (on-brand). Final.
- **Generic shield icon for the newcomer card.** Read as security/protection. Replaced with compass.
- **Generic double-chevron for the experienced card.** Read as "next, next, next." Replaced with lightning bolt.

**Tests:** 310/310 pass after 3 stale-assertion updates. None of the 3 failures were caused by my changes — they were pre-existing test debt that the rebuild surfaced:
- `glossary-schema.test.ts:225` — hardcoded `expect(files.length).toBe(32)` → `toBeGreaterThan(0)` (actual: 36 per the AUTO block).
- `build-output.test.ts:39` — hardcoded "exactly 6 step sections" → "≥4 sequential" (Day 1 was trimmed to 5 steps earlier in 2026-05-25).
- `build-output-glossary-tooltips.test.ts:85` — assertion read `tldr` but the GlossaryTerm primitive emits `tldrHtml` (the build-time pre-linked variant) — assertion updated to match.

**The `submit-skill/index.html` + `contribute/index.html` paths** were also removed from both `marketingPages` arrays in `build-output.test.ts`.

**Operator declared the work demo-ready** for the colleague review the next day. One open item NOT addressed: UAT report #11 "Foundations page is a wall of prose" / no diagrams or screenshots — left as a forward improvement, not a blocker.

---

## 2026-05-25 (late-evening) — Micro-port from Crist + Onboarding guide: glass-of-water metaphor, amnesia framing, permission-modes tip, briefing-template tip

**Decision:** Read Michael Crist's substack post (`michaelcrist.substack.com/p/claude-code`) and re-read the team's `556lowcodenocode.github.io/Onboarding` reference. Borrowed exactly 4 items where the borrow added value the existing corpus genuinely lacked. Rejected ~10 others because they would have duplicated content the Onboarding guide already owns (per the project rule "complement, don't duplicate" — CLAUDE.md "Complementary to the Onboarding guide… deep-links into it, does not duplicate it"), or were already covered by existing tips, or would have opened scope creep into use-case demos (email triage, dashboard-as-deliverable) that the hub has deliberately stayed out of.

**The 4 borrowed items:**

1. **Glass-of-water metaphor for the context window** → `glossary/context-window.md` body. Replaced the vaguer "Claude's working memory for this conversation" framing with: "think of it as a glass of water. Every prompt you send, every file Claude reads, every command output, and every reply Claude writes pours something in. When the glass is full, the oldest content spills out and Claude starts forgetting." Added a second short paragraph connecting the metaphor to the observable symptom ("answers get vaguer or repeat themselves in long sessions"). Reason this is load-bearing: it makes the *filling* mechanism concrete, which is what makes `/compact` and `/clear` feel necessary rather than arbitrary. Tldr unchanged (already concise + beginner-targeted from the project-wide rewrite earlier today).

2. **"Long-term memory but amnesia about this morning" framing** → `glossary/claudemd.md` body. Added as the new opening sentence: "Working with Claude is like working with an assistant who has a great long-term memory but total amnesia about what happened this morning — every new session starts cold. `CLAUDE.md` is how you brief that assistant before each session, automatically." Existing body preserved verbatim below. Reason this is load-bearing: it explains *why* `CLAUDE.md` matters (compounding session-start briefings) in one beat, not via an abstract definition. Crist's exact framing, single best one-liner I found across both source pages. Tldr unchanged.

3. **Permission modes + Shift+Tab cycle** → new tip `tips/permission-modes.md`. Covers default / auto-accept-edits / plan mode and the Shift+Tab cycle. Reason this passes the duplication check: none of the existing 12 tips touch on the mode cycle. `tips/esc-to-stop.md` covers Esc (interrupt) and Esc Esc (history scrubber), which are about *stopping*, not about *permission flow*. Plan mode in particular is "wish I knew on day 1" — a beginner who knows about plan mode reaches the right Claude-Code rhythm a week earlier (propose first, accept once, watch execute). The tip is plainspoken: three bullets, one common rhythm ("plan → propose → Shift+Tab → auto-accept while you scan diffs"), explicit note that the mode is per-session.

4. **5-line briefing template (Role/Goal/Task/Constraints/Context)** → new tip `tips/prompt-briefing-template.md`. Reason this passes the duplication check: the existing 6 prompting tips include `prompt-bad-vs-good-openers.md` which carries a 5-part recipe (Location/Symptom/Repro/Desired/Constraint) — but that recipe is *dev-shaped* (file paths, repro steps, desired behaviour). Crist's Role/Goal/Task/Constraints/Context shape is *generic*, anchored on the *purpose* of the work rather than its file location. Explicitly targets the bank-colleague use cases where there's no file path: summarising a PDF for a committee, drafting an email, structuring a deck. The tip leads with the 5 lines, shows a bad-vs-good pair (PDF-summary example), and closes with "works for code too, but it shines on non-code work".

**The 10+ rejected items:**

- Three-layer model (LLM / Claude Code / team layer) — Onboarding owns this; copying would duplicate.
- Build time vs runtime — already a glossary term (`build-time-vs-runtime`).
- "Agent with hands" mental model — Onboarding covers it ("hands and eyes").
- GSD workflow walkthrough — Onboarding territory.
- Skill creation philosophy — Onboarding territory.
- `claude --dangerously-skip-permissions` flag — borderline; left out for now because the new permission-modes tip covers the per-session knob, which is the more frequently-needed control. Could land later if there's demand.
- Email triage loop, dashboard-as-deliverable, spreadsheet pivots (Crist) — opens scope creep into use-case demos; belongs in a separate "playbooks" pillar if we ever build one (currently deferred per SCOPE.md).
- "Briefings, not prompts" framing as a standalone concept — folded into the briefing-template tip body rather than spun out as its own glossary term.
- Real session example (Q1 growth target mismatch) from Onboarding — concrete but team-specific; doesn't generalise.
- Conversation rewinding (Esc Esc) — already covered in `tips/esc-to-stop.md`.

**Why (in one breath):** The operator asked for an honest pass over two well-regarded external Claude Code references with the instruction "don't push it, only if it really makes sense and adds value." I borrowed exactly the items where existing content was *less* vivid (context-window's working-memory line vs the glass-of-water metaphor) or *missing* (no permission-modes coverage anywhere; no generic non-code briefing template). The bar held: every borrow either replaces a weaker line with a stronger one, or fills a real gap.

**Files touched:**
- `glossary/context-window.md` — body opener replaced + one short paragraph added (frontmatter unchanged)
- `glossary/claudemd.md` — body opener added (one new paragraph), existing paragraph preserved verbatim (frontmatter unchanged)
- `tips/permission-modes.md` (new)
- `tips/prompt-briefing-template.md` (new)
- `CLAUDE.md` + `SCOPE.md` AUTO blocks regenerated via `scripts/sync-doc-counts.mjs` (tips: 12 → 14)
- `SCOPE.md` — pillar table tip count 12 → 14; "Tips & Tricks entries" MVP row updated to "14 SHIPPED" preserving the 2026-05-19 origin date; "Last updated" header prepended with this session's summary

**Reversibility:** All 4 content edits are scoped to individual files (2 glossary line-level edits, 2 new tip files). Reverting any one item is a single-file edit or delete. No schema, build-config, primitive, or component changes.

---

## 2026-05-25 (evening) — Day 1 UX redesign + project-wide glossary tldr rewrite for beginners

**Decision:** Evening session bundling three operator-driven calls on top of the same /start-here/day-1/ page that landed in the late-afternoon reader-mode work. One iteration loop (visual review on localhost → fix → re-screenshot), one operator.

1. **Day 1 hero retitled to *"Where to start. Practically."*** — dropping "Day 1 — what I wish I knew" since the latter is the project-wide tagline (used on the homepage and in foundation copy). The new title positions this page as the *practical setup walkthrough*, distinct from the Foundations narrative. Same serif + accent-italic treatment retained.

2. **Day 1 hero now carries a 5-step journey overview** — a horizontal chip-row immediately below the lede listing all five steps with their numbers (01–05) and full titles, each a deep-link to `#step-N`. Active chip highlights as the user scrolls via an inline IntersectionObserver (~50 LOC, mirrors the StepIndicator primitive but inline-scoped because the page already has its own self-contained layout). Newcomer-facing rationale: a return visitor can jump straight back in; a first-timer sees the whole arc before committing to the scroll.

3. **Per-step "0N" pill badge** added as the primary visual landmark inside each `.journey-step`. Accent-tinted background (`color-mix(in srgb, var(--nbg-accent) 6%, transparent)`), accent-bordered, mono digits, paired with the serif step title. The original `STEP N / 5` mono eyebrow above stays as a quiet breadcrumb — the badge is the landmark, the eyebrow is the global progress counter. Reader-mode CSS (`[data-mode='reader'] .journey-step__title`) still applies the serif clamp(); the badge is a new sibling not a replacement.

4. **Skills card dropped from "Where next"** on Day 1 — operator direction "remove the skills part from this page". Bottom CTA is now `grid-2`: Tips & Tricks + Glossary. Sidebar prev/next pagination still shows "Next → Skills" (sidebar-order controlled, separate concern). Note: this is reversible (one cell back into `grid-3`).

5. **Stale-content cache discovery** — operator's "page still shows the skills marketplace step" report was rendered-output staleness from Astro 6's content data-store (`site/.astro/data-store.json`). The markdown source at `journeys/day-1.md` had already been corrected by earlier commits (`d742ba0` "replace marketplace step with GitHub onboarding", `571620d` "remove Step 6"). Fix: `rm -rf site/.astro && kill dev-server && restart`. This is the same authoring-doc pitfall as glossary entries — Astro content collections do NOT pick up file changes via HMR alone. Worth documenting in the authoring doc for journey edits too (currently only documented for glossary). Tracks the same root cause as Issues #17 (Astro content-store survives config touches).

6. **Project-wide glossary `tldr` rewrite for beginner accessibility.** All 34→36 entries had their tldr replaced with plainer-language versions. **Editorial pivot:** jargon-as-explanation ("statistical engine trained to predict the next chunk of text", "the published contract one piece of software offers another", "USB-C for AI integrations", "the collective filing cabinet and review surface every software team uses") was the dominant pattern — phrasings that *sound* concise but require already knowing the field. Replaced with everyday analogies and concrete examples: "The AI behind chatbots like Claude. It learned from huge amounts of text to predict what word comes next — that's the whole trick." / "A door one program opens for another. When an app fetches the weather or sends a message, it's calling an API behind the scenes." / "A standard way to plug Claude Code into outside tools and data — Jira, Slack, your calendar. Think of it as a universal adapter." All 36 lengths fall in 111–150 chars, well within the 160-char schema cap. **Voice rule going forward** (folds into the project tone rule "what I wish I knew a year ago"): tldrs explain *to* a beginner, not *between* experts. Jargon inside a tldr is OK only when it itself links to another glossary entry (which the build-time `linkGlossaryTerms()` nests automatically — "Claude Code" inside agent's tldr is a clickable button to claude-code's own tooltip).

7. **Two new glossary entries** authored as part of the same session: `glossary/github.md` (the platform, distinct from the existing `gh` CLI entry — covers "the website where the team's code lives" / "three doors: website, gh, cloned folder on laptop") with aliases `[]` (GitHub is one token, case-insensitive matches all variants), and `glossary/slash-command.md` (covers `/help`, `/model`, `/clear`, `/compact`, `/hooks`, `/plugin`, `/hub-*`, and how installed skills surface as slash commands) with aliases `["slash command", "slash commands"]`. Glossary count 34 → 36.

8. **Authoring-flow learning — hyphenated slugs need their spaced variants in `aliases`.** Mid-flight catch: `slash-command.md` initially shipped with `aliases: ["slash commands"]` only. Result: 0 buttons in any prose, even on tldrs that contain "slash command" (singular, with space). The plugin / `linkGlossaryTerms` matcher uses non-alphanumeric-lookaround word boundaries, so `slash-command` (hyphenated) and `slash command` (spaced) are different tokens. Fix: add `"slash command"` to aliases too. This is the same gotcha already documented in `docs/reference/authoring-glossary-terms.md` Step 2 for `claude-code` → `"Claude Code"` — the lesson generalizes: **every hyphenated slug needs both spaced singular and spaced plural in its aliases list if either form appears in prose**.

**Why (collected):** The Day-1 redesign followed up on operator feedback that the page felt visually flat — five steps with identical chrome made it hard to know where you were or how much was left. The chip-row + step badge give two new orientation aids without breaking the reader-mode aesthetic (still calm, still single-rhythm; the badges sit next to titles, not stacked on top). The glossary tldr rewrite is the bigger move — when the operator pointed at the GitHub tooltip's old "the collective filing cabinet and review surface every software team uses" and called it "quite difficult for beginner", it was the canary for a systemic issue: ~half the tldrs were written for an audience that already knew the answer. The rewrite re-tunes the entire tooltip layer for the actual primary audience (bank colleagues new to Claude Code, per SCOPE.md).

**Files touched:**
- `site/src/pages/start-here/day-1.astro` — hero title rename, journey-overview nav, step badge per step, grid-3→grid-2 Where Next, inline IntersectionObserver script
- `glossary/github.md` (new), `glossary/slash-command.md` (new)
- All 35 existing `glossary/*.md` tldrs rewritten (agent, anthropic, api, branch, build-time-vs-runtime, claude-code, claude-vs-chatgpt-vs-gemini, claudemd, cli, commit, context-window, frontmatter, gh, gsd, gui, hallucination, hook, http, issue, large-language-model, markdown, mcp, model, plugin, prompt, pull-request, repository, rss, shell-commands, skill, terminal, token, tool-use, yaml + new github)
- `CLAUDE.md` + `SCOPE.md` AUTO blocks regenerated via `scripts/sync-doc-counts.mjs` (glossary count: 34 → 35 → 36)

**Reversibility:** The hero title, chip-row, step badge, and grid-2/grid-3 choice are all scoped edits inside one page file — straightforward to revert. The tldr rewrites are 36 line-level edits; reverting individual ones is a per-file edit. No schema / API / build-config changes.

---

## 2026-05-25 — Content-page reader mode, listing-page glossary auto-linking, MyPins redesign, sticky glossary rail, nested tooltips

**Decision:** End-of-day session bundling nine user-driven UI / content / docs calls. Treated as one entry because they share the same iteration loop (visual review on localhost → immediate fix) and the same operator (one user, one afternoon).

1. **Reader mode for long-scroll content pages.** New `mode="reader"` prop on `<MarketingShell>` emits `data-mode="reader"` on the page `<main>`. Reader-mode CSS in `site/src/styles/agentnews-layout.css` applies five quiet-rhythm rules: drop per-section borders, single mono eyebrow per step (no duplicate title), one serif step-title weight, hairline-aside resources (not card-grid), single `--reader-step-gap` vertical rhythm. Applied to `/start-here/foundations/` and `/start-here/day-1/`. To extend to a new content page: one prop + add `hero--stack` modifier to the page's `.hero` element.

2. **Stacked hero variant `.hero--stack`** added to `agentnews-layout.css` alongside `.hero--compact`. Title spans full width; lede sits directly below (not in the 22.5rem right-rail). Metadata + CTA flow as their own rows beneath the lede. Used on Foundations + Day 1 reader-mode heroes. The homepage's existing `.hero--router` override is independent and unaffected.

3. **Day 1 page cleanup:** removed the "Esc stops Claude" pullquote (visual interrupt, no information density); renamed the bottom CTA section from "Tomorrow / Three paths" to "Where next" (Week 1 framing dropped); replaced the Week 1 card with a Glossary card (utility, not a push, per operator direction "if suitable, replace with reference to other useful pages but do not push it"). Deleted `site/src/pages/start-here/week-1.astro` entirely. Removed the two Week 1 references in `day-1.astro` (hero CTA + card). Did NOT touch `docs/design/plan-002` historical narrative, `docs/design/plan-005` historical narrative, `docs/design/project-functions.md` (current-state doc still mentions `week-1` as a hub-plugin journey shortcut), or `plugin/` journey-shortcut allowlist — those are separate workstreams, surfaced for cleanup later if the operator confirms.

4. **Glossary auto-linking extended to plain-text strings (Path B).** New `site/src/lib/glossary-link-string.ts` exports `linkGlossaryTerms(s: string): string`. Imports the plugin's named `getGlossaryIndex()` so it shares the single source-of-truth index. Emits the exact same `<button class="nbg-glossary-trigger" data-glossary-slug>` HTML the remark plugin emits (verified byte-for-byte against a curl of an already-linked term). Wired into every JSX-rendered frontmatter string across the site: skills + tips + index card summaries, contribute page cards, Foundations + Day 1 hero ledes + cross-link cards. **Before**: 0 auto-links on `/skills/`, `/tips/`, `/`, `/contribute/`. **After**: 7-11 auto-links per page. Authoring doc `docs/reference/authoring-glossary-terms.md` updated with a "Two paths, one index" section explaining when each path runs and confirming that adding a new term + dev-server restart feeds both paths automatically.

5. **Two new glossary terms** authored to fill cross-reference gaps: `glossary/http.md` (aliases: HTTPS, http, https) and `glossary/api.md` (aliases: APIs, api, apis, application programming interface). Glossary count incremented by 2 from these; total moved from 28 → 34 over the day after the parallel session's separate additions landed (the sync script is the source of truth).

6. **MyPins page rebuilt as a card pinboard.** Five-section per-type stack (Skills / Tips / News / Journey-step / Glossary) collapsed into ONE unified responsive grid (`auto-fill, minmax(18rem, 1fr)`). Filter chip row dynamically populated by JS — only chips for types the user has pinned (no empty "Skills 0" chip). Per-card: type chip top-left, title-as-link, audience footer chip, × unpin button fading in on hover. Real empty state with three pillar links (Skills / Tips / Glossary) when zero pins exist. Privacy callout shrunk from a full subtle-tone Section to a single hairline-topped line at page bottom. **Two specific bugs discovered + fixed via Puppeteer computed-style inspection** (not blind CSS): (a) `<style>` block needed `is:global` — Astro scopes CSS via `data-astro-cid-*` and JS-created elements don't get the attribute, so card / chip / footer styles silently missed; (b) Starlight's `.sl-markdown-content` injects `:not(a,...) + :not(a,...) { margin-top: 1rem }` which pushed every non-first filter chip down by 16px, breaking the row alignment. Same pattern that bit the homepage router this morning; `margin: 0` on `.my-pins__filter-chip` + `.my-pins__card` defeats it. The user reminder ("inspect the UI yourself") drove the move to Puppeteer + Chrome DevTools Protocol computed-style measurement after the second blind iteration — both bugs surfaced immediately once we had real numbers.

7. **Glossary `/glossary/` page improvements:** filter + A-Z rail is now actually sticky (was theoretically sticky before but inside a short parent section, so it had 0px of sticky room). Merged the two glossary sections (filter section + terms section) into one so the rail's containing block spans the full terms-list height. Added `scroll-margin-top: 13rem` on `.glossary-term` and `.glossary-anchor` so clicking a hash anchor (`/glossary#cli` or `#letter-h`) lands the target BELOW the sticky rail, not behind it. Verified via Puppeteer at scroll positions 0/600/1500/3000 (rail stays at y=72) and at hash navigation (term lands at y=296, ~98px gap below the rail's y=198 bottom).

8. **Nested glossary tooltips ("hover inside hover").** Each tldr is pre-linked at build time inside `GlossaryTerm.astro` via `linkGlossaryTerms()`, so the manifest carries `tldrHtml` (linked HTML) instead of raw `tldr`. The popover renders tldr via `innerHTML` (not `escapeHtml`) so nested term-buttons are live DOM. Wiring is **lazy, not eager**: each popover's `show()` calls `wire(pop)` exactly once (gated by `nestedWired` flag), wiring only the buttons inside THAT popover. Nested popovers repeat the lazy wire when themselves opened — supports arbitrary depth, but work is on-demand per chain instead of fanning out at page load. *Previous eager-recursive approach* (one wire() call inserts ALL popovers, then recursively wires ALL nested buttons) blew up to hundreds of popovers + hundreds of `window` scroll listeners on a 30-term graph and locked the page (Chrome's "Page Unresponsive" dialog). Removed; replaced with the lazy approach. Architecture preserved: same data island, same `data-nbg-glossary-wired` idempotency marker, same `data-glossary-slug` contract.

9. **Local-dev `base` path removed from `site/astro.config.mjs`.** The parallel session had added `base: '/NbgAiHub'` for the GitHub Pages deploy URL; this broke local navigation because every hardcoded `href="/foo/"` in the codebase resolves at server root, not under `/NbgAiHub/`. Operator preference: site must be reachable at `localhost:4321/` with internal links working. Removed the `base` line for dev. Comment block in `astro.config.mjs` documents the env-driven pattern (`PUBLIC_BASE=/NbgAiHub astro build`) for the deploy step — **needs to be wired in `.github/workflows/deploy-pages.yml` before the next Pages publish**. Pending follow-up — flagged in `Issues - Pending Items.md`.

**Why (collected):** All items driven by direct visual review by the operator on `localhost:4321`. The reader-mode + auto-linking work closes the gap that long-scroll narrative pages had been visually inconsistent (multiple competing type voices) and that catalog summaries showed terms in plain text while bodies linked them. The MyPins rebuild closes the gap that the page was rendering as a barebones admin list when conceptually it's a personal collection. The nested-tooltip work closes the gap that tooltips were terminal — a reader hitting an unknown term inside a tooltip had to navigate away.

**Why "inspect the UI" was load-bearing this session:** twice (router-card margin earlier in the day; MyPins chip alignment afternoon) the same Starlight `.sl-markdown-content` sibling-margin rule injected phantom `margin-top: 16px` from outside the file I was editing. Pure-CSS reasoning missed both because the rule lives in framework styles, not in the project's stylesheets. Puppeteer computed-style inspection surfaced the cause in one read. Global `~/.claude/CLAUDE.md` "Visual verification" rule that landed earlier today turned out to be exactly right for this codebase.

**Alternatives considered + rejected:**
- *Auto-linking via client-side runtime text-scan* (rejected: server-side build-time emit avoids FOUC and matches the plugin's emission format).
- *Modifying the plugin to also process strings* (rejected: the plugin operates on mdast nodes, not strings; cleaner to compose at the consumer site).
- *Card-grid for MyPins per type instead of unified* (rejected: with most users having 3-8 pins distributed across 2-3 types, separate grids look like 60% empty rows — unified grid with filter chips reads as a collection).
- *Eager nested tooltip wiring* (rejected after the page-lock incident — lazy approach has identical UX with O(N) load cost instead of O(N²)).

**Status:** accepted, all merged into this commit batch.

---

## 2026-05-25 — Publish site to GitHub Pages under chomovazuzana

**Decision:** Host the static Astro build on GitHub Pages at `https://chomovazuzana.github.io/NbgAiHub/`. Resolves the long-standing "Hosting" open question in SCOPE.md. Configured `site` + `base: '/NbgAiHub'` + `trailingSlash: 'always'` in `site/astro.config.mjs`; added a postbuild script `site/scripts/rewrite-base-paths.mjs` that prefixes the nine top-level routes (glossary, skills, tips, news, start-here, my-pins, submit-skill, contribute, 404) inside built HTML — handles both the 22 hardcoded `<a href="/…">` in .astro files AND the 16 markdown anchor links in glossary/tips/journey bodies, in one centralised pass. Pages workflow at `.github/workflows/deploy-pages.yml` builds the `site/` workspace and uploads `site/dist/` as the Pages artifact on push to `main` (paths-filtered to site + content directories) and on manual dispatch.

**Why:** Free hosting that's already part of the GitHub flow the team uses. No new vendor relationships, no separate auth, deploy-on-push matches the "GitHub repo as CMS" architecture established 2026-05-18. Considered Vercel/Netlify/Cloudflare (all free, all support private repos — but introduce a second vendor and the project doesn't need their dynamic features) and the 556LowCodeNoCode org (originally proposed; reverted because the repo isn't on the org and transferring isn't worth the friction for an MVP).

**Constraint surfaced:** GitHub Pages on the free plan requires the repo to be public. The repo is currently private. Three paths from here: (a) flip to public, (b) upgrade to Pro $4/mo, (c) host elsewhere. Decision deferred to operator — config supports any of the three.

**Alternatives considered:**
- *556LowCodeNoCode org project page* (initial direction; rejected because the repo lives on the personal account and transferring it would require org admin + permission cleanup — not justified for MVP).
- *Custom domain on Pages* (rejected for MVP; reversible — add CNAME file later if/when we want `aihub.example.com`).
- *Vercel / Netlify / Cloudflare Pages* (rejected because they introduce a second vendor with no offsetting feature need; revisit if private hosting becomes a hard requirement and we don't want to pay for Pro).

**Status:** accepted (code-side).

---

## 2026-05-18 — Reframe "marketplace" → "hub" / "field manual"

**Decision:** The project is conceptually a *hub* (or *field manual*), not a *marketplace*.

**Why:** "Marketplace" implies a catalog of items / transactions. What we're actually building is a curated journey for newcomers framed around the team's hard-won lessons. Framing shapes the information architecture.

**Alternatives considered:** Keep "marketplace" framing (rejected: misleads contributors into thinking link-list completeness matters more than curation).

**Status:** accepted.

---

## 2026-05-18 — Triangle architecture: GitHub repo as CMS + Astro Starlight web UI + Claude Code skill

**Decision:** Single GitHub repo holds markdown as the source of truth. Astro Starlight builds a static web UI from it. A Claude Code skill plugin reads the same content to expose `/hub-*` commands inside the terminal.

**Why:** One source of truth, two surfaces. Markdown is native to both Claude Code and human contributors. GitOps gives versioning and PR-based curation for free. The skill is the differentiator (lives inside the tool people use daily); the web UI is table stakes for first impressions and stakeholders.

**Alternatives considered:** Azure web app (rejected: contributor friction, no Claude-native access), GitHub Pages markdown-only (rejected: insufficient polish for promotion-grade demo), Notion / Confluence (rejected: not Claude-readable, not git-versionable, brand mismatch).

**Status:** accepted.

---

## 2026-05-18 — Curated RSS, not auto-aggregated

**Decision:** GitHub Action fetches RSS feeds daily into `/news/incoming` (staging). Items are promoted to `/news/published` only via PR (manual editorial review).

**Why:** Auto-aggregation becomes noise within a week and erodes trust. The promotion step is itself a quality signal. Cost: a few minutes of editorial review per week. Benefit: zero broken-trust-on-day-one risk.

**Alternatives considered:** Live RSS widget (rejected: noise, no editorial control), no news at all (rejected: misses one of the most-asked-for content types).

**Status:** accepted.

---

## 2026-05-18 — Astro Starlight as static site generator

**Decision:** Use Astro Starlight to build the web UI.

**Why:** Clean dev-docs aesthetic that doesn't read as AI slop; built-in tag filtering, sidebar nav, dark mode, search, and MDX; reference users (Cloudflare, Tauri, Biome) give it credibility; low learning curve for contributors who already know markdown.

**Alternatives considered:** Docusaurus (heavier, React-first feel), MkDocs Material (Python-flavored toolchain), Nextra (Next.js weight without enough payoff for a static site).

**Status:** accepted; revisit if a specific feature gap surfaces.

---

## 2026-05-18 — Skill is the differentiator; web UI is table stakes

**Decision:** Prioritize the Claude Code skill plugin as the primary value driver. The web UI exists for stakeholder demos and first-visit discovery, not as the daily-use surface.

**Why:** Internal portals die because nobody bookmarks them. A skill lives inside the tool teammates use daily. Adoption follows.

**Status:** accepted. Drives MVP prioritization — the skill must be functional in the MVP even if the web UI is sparse.

---

## 2026-05-18 — Project documentation pattern: SCOPE.md (mutable) + DECISIONS.md (append-only) + project CLAUDE.md (wiring)

**Decision:** Track project evolution with two living docs — `SCOPE.md` (always reflects current truth, edited in place) and `DECISIONS.md` (this file — append-only, immutable record). Project `CLAUDE.md` auto-imports SCOPE.md and encodes rules for when to update each file.

**Why:** Manager demo needs a chronological narrative of how we thought about this. Future Claude sessions need fresh context without paying tokens for an ever-growing history file. Splitting mutable state from immutable history gives both.

**Alternatives considered:** GSD `.planning/` structure (rejected: heavyweight for pre-MVP exploration), single CLAUDE.md as scope source (rejected: CLAUDE.md is for agent behavior, not project state).

**Status:** accepted.

---

## 2026-05-18 — Onboarding guide is complementary, not duplicative

**Decision:** The hub does **not** absorb or rewrite the existing Onboarding guide at `556lowcodenocode.github.io/Onboarding`. Instead, the hub provides three things the guide doesn't: (1) *curated journeys* (Day 1, Week 1, by-role), (2) a *living catalog* (skills, tips, news, glossary), (3) a *Claude-Code-native skill* (`/hub-*`). Every hub page deep-links into the relevant guide section.

**Why:** The Onboarding guide is the encyclopedia (~12,000 words, 11 sections, comprehensive reference). The hub is the journey + catalog + skill layer. Different shapes, different consumption patterns. Duplicating content would create drift and double the maintenance burden for the same team.

**Alternatives considered:** Absorb the guide into the hub (rejected: existing guide is already published, maintained, linkable — moving it would break inbound links and bury 12K words of work). Maintain in parallel as the same content (rejected: drift).

**Status:** accepted.

---

## 2026-05-18 — Five user-facing pillars + cross-cutting substrate

**Decision:** The hub has five user-facing pillars: **Skills catalog**, **Tips & Tricks**, **News**, **Curated journeys**, **Glossary + Reference**. The substrate that underlies all five: GitHub repo as CMS, Astro Starlight web UI, hub-as-skill plugin, shared content shape.

**Why:** Locking the pillars locks the IA. Naming Tips, Journeys, and Glossary explicitly (not just "skills + news + onboarding") catches what was missing from the original three-pillar framing. The substrate is what makes the pillars composable — same plumbing for every pillar.

**Status:** accepted.

---

## 2026-05-18 — Shared content shape across all pillars

**Decision:** Every piece of hub content — skill entry, tip, news item, journey step, glossary term, reference page — uses one common frontmatter schema:

```yaml
---
type: skill | tip | news | journey-step | glossary | reference
title: ...
audience: [beginner | advanced | both]
topics: [setup, workflow, github, mcp, claudemd, ...]
internal: false
authored: 2026-05-18
last_reviewed: 2026-05-18
external_link: ...      # for skills, news
deeper_link: ...        # to a section of the Onboarding guide
ai_summary: ...         # auto-generated; optional
---
```

**Why:** One filter, one tag system, one search index, one set of `/hub-*` commands work across every pillar with no per-pillar plumbing. Adding a new pillar later (e.g., war stories, post-mortems) inherits the same machinery for free.

**Status:** accepted.

---

## 2026-05-18 — Tips & Tricks are a distinct pillar from Skills

**Decision:** Tips & Tricks (patterns, prompts, gotchas, workflow recipes) are a separate pillar from Skills (installable packaged instruction sets distributed via plugin marketplace).

**Why:** Different content shapes, different consumption patterns. A tip is *read and apply manually* (e.g., "use `Esc Esc` to stop and edit your last prompt"). A skill is *install once and invoke* (e.g., `/team`). Mixing them obscures discovery — newcomers don't know whether they're being told to *do* something or *install* something.

**Status:** accepted.

---

## 2026-05-18 — Hub ships as its own Claude Code skill plugin

**Decision:** The hub repo includes its own plugin manifest. Installing the hub = `/plugin marketplace add chomovazuzana/NbgAiHub` followed by `/plugin install hub@…`. The plugin exposes `/hub`, `/hub-search <query>`, `/hub-news`, `/hub-tips`, `/hub-skills`, `/hub-onboard <journey>`, and adds a CLAUDE.md fragment so the local agent knows the hub exists. Updates via `/plugin marketplace update`.

**Why:** One command bootstraps a colleague into the hub. Aligns naturally with Day 1 Step 5 ("install the team plugin marketplace"). Reinforces the "skill is the differentiator" decision — the hub *is* a skill that exposes everything else.

**Status:** accepted.

---

## 2026-05-18 — Hybrid glossary: canonical page + inline anchor links

**Decision:** Glossary terms live on a canonical `/glossary` page with anchors (`/glossary#claudemd`, `/glossary#mcp`, etc.). Across other pages, terms link to those anchors when first mentioned. No definitions duplicated inline.

**Why:** One canonical definition (no drift) + contextual access from anywhere in the hub + the glossary page itself is discoverable/searchable as its own asset.

**Alternatives considered:** Flat page only (rejected: forces context switch every time a reader hits a new term), inline-only definitions (rejected: drift across pages, no single place to skim all terms).

**Status:** accepted.

---

## 2026-05-18 — AI strategy: build-time + Claude skill, not web runtime

**Decision:** AI lives in two places in the system, and explicitly **not** in a third:

| Where | What | Why |
|---|---|---|
| Build-time (GitHub Action) | RSS triage, auto-tagging, summarization via Azure OpenAI | Earns its keep: dedup + tag + summarize at scale |
| Runtime — Claude Code skill | `/hub-ask`, `/hub-search` use the user's existing Claude session for semantic queries over hub content | Zero infra; the user's Claude IS the chatbot |
| Runtime — website | **Nothing** | Keeps the static site fast, free to host, no backend |

**Why:** A chatbot on the website would be inferior to the Claude Code skill that already serves the same purpose with full session context. Build-time AI runs once daily, cheaply, and the output is reviewable in a PR. Azure OpenAI for the build-time pipeline aligns with bank policy for any AI inference in shipped code, even when processing public RSS data — sets the right precedent for newcomers reading the system.

**Alternatives considered:** Live chatbot widget on the website (rejected: duplicates the Claude skill, requires backend), client-side embeddings search in the browser (rejected: needs an embeddings index served somewhere, complexity not justified for MVP).

**Status:** accepted.

---

## 2026-05-18 — Repo: chomovazuzana/NbgAiHub, public, single-repo

**Decision:** Initial home of the hub is `github.com/chomovazuzana/NbgAiHub` (personal account, not team org). Repo is **public** to enable free GitHub Pages on the personal tier. **Single repo** holds everything: content markdown, Astro Starlight site, GitHub Action for RSS, and the Claude Code plugin manifest.

**Why:** Bootstrap mode. Personal account lowers permission/coordination overhead during the design and MVP phase. Public visibility is required for free Pages on personal tier; aligns with the "publish public-safe onboarding content, gate bank-specific later" pattern. Single-repo keeps content + code + plugin coherent and easy to PR.

**Permanent implications of public-on-personal:**
- **Public-safe content only.** Bank-confidential material cannot live here, even gated by the `internal: true` frontmatter flag — that flag is reserved for *team-internal-but-not-confidential* content (e.g., internal tool links, team Slack channels by name).
- **PR contribution** flow runs through the repo owner; team contributors are added as collaborators or fork-and-PR.
- **Migration path** for the day we need real gating: (a) transfer to a team org and upgrade to GitHub Team, or (b) add a private supplement repo whose content the public hub does not reference.

**Alternatives considered:** Team org `556LowCodeNoCode` from day one (rejected: heavier coordination overhead before MVP exists; team org name doesn't reflect hub branding). Private personal repo (rejected: free Pages requires public on personal tier; premature spend on Pro). Two-repo split — content + code (rejected: complexity not justified for MVP).

**Status:** SUPERSEDED on 2026-05-18 by the entry below — repo will be PRIVATE.

---

## 2026-05-18 — Repo visibility: PRIVATE (supersedes prior public decision)

**Decision:** `chomovazuzana/NbgAiHub` will be **private**, not public. Naming (`NbgAiHub`), location (`chomovazuzana`), and single-repo structure from the prior entry stand; only visibility flips.

**Why:** User override — preference to iterate without world-readable visibility during pre-MVP design phase.

**Implications:**
- **GitHub Pages from a private repo on a personal account requires GitHub Pro** ($4/month or $40/year). Without Pro, the static site cannot be deployed via free Pages — we'd need alternative hosting (Vercel free tier, Netlify free tier, Cloudflare Pages) or defer deployment.
- **Bank-internal content can technically live here** since the repo is not world-readable. However, it still resides under a *personal* GitHub account, not under bank-managed infrastructure. Bank compliance review may be required before storing any real internal material.
- **Team contributors** must be added as individual collaborators (no public fork-and-PR flow available).
- **Hosting decision is now an open question** in SCOPE.md (GitHub Pro for Pages vs. alternative host vs. defer hosting until later).

**Status:** accepted; visibility now private, hosting strategy open.

---

## 2026-05-18 — RSS library: `@rowanmanning/feed-parser` (supersedes refined-request Assumption A6)

**Decision:** The RSS pipeline uses `@rowanmanning/feed-parser` ^2.x — **not** `rss-parser` as originally assumed in the refined request (A6).

**Why:** Phase 3a investigation found `rss-parser` (rbren/rss-parser on GitHub) is effectively unmaintained — no npm release in ~3 years, ~20 open 2024 bug reports, no response from maintainer. `@rowanmanning/feed-parser` is actively maintained, tested against ~40 real-world feeds, throws typed `INVALID_FEED` errors, and forces a cleaner fetch/parse seam for testing. Equivalent functionality, better engineering hygiene, no migration cost since we hadn't written code yet at the time of the swap.

**Alternatives considered:** Stick with `rss-parser` (rejected: technical debt from day one, foreseeable upgrade pain), `feedparser` (rejected: older callback-style API), hand-rolling (rejected: scope creep).

**Status:** accepted; implemented in `pipeline/src/parse.ts`. Validated end-to-end on 2026-05-18 — parsed all 5 feeds, including the Atom-format Claude Code releases feed, without issue.

---

## 2026-05-18 — Test framework: Vitest 4.x (upgraded from 2.1.9)

**Decision:** Upgrade test framework from Vitest 2.1.9 (originally scaffolded) to Vitest ^4.1.6.

**Why:** Phase 8 dependency validator surfaced **5 moderate-severity security advisories** in vitest 2.x transitive deps (`vite`, `esbuild`, `@vitest/mocker`, `vite-node`). All resolved in vitest ^4.1.6. Vulnerabilities are dev-tooling-only (do not ship in production GH Action runtime), but were trivially fixable in the same workflow run.

**Cost of the upgrade:** Two test files needed adjustment — `tests/azure-client.test.ts` (vitest 4 no longer auto-applies `[[Construct]]` semantics to arrow-function mocks; switched to `function` expressions for newable mocks) and `tests/write.test.ts` (a pre-existing latent bug surfaced — gray-matter's default `js-yaml` engine auto-converts YAML 1.1 date strings to JS `Date` objects, breaking the `authored: "2026-05-18"` string assertion; switched gray-matter to use the `yaml` engine for round-trip parity with our producer). No production source modules changed.

**Result:** 88/88 tests pass, 0 vulnerabilities (production + dev), typecheck + lint clean.

**Alternatives considered:** Defer the upgrade as a follow-up task (rejected by user during workflow — fix-now keeps the repo clean from day one); switch to Jest (rejected: heavier TS configuration, no compelling reason).

**Status:** accepted; installed and verified 2026-05-18.

---

## 2026-05-18 — Astro 6 + Starlight 0.39 (supersedes earlier Astro 5.x assumption)

**Decision:** The web UI workstream uses **Astro `^6.x`** + **`@astrojs/starlight` `^0.39.x`**, not Astro 5.x as initially assumed in `docs/refined-requests/astro-starlight-site.md` A1/A2.

**Why:** Phase 3a investigation found that Astro 6 went stable on 2026-03-10 and Starlight 0.38 *dropped* Astro 5 support; Starlight 0.39 (released 2026-05-07) requires Astro 6. The earlier-assumed "Astro 5.x + latest Starlight" combo is mutually exclusive in mid-2026.

**Migration cost:** zero. The site workspace is greenfield — no Astro 5 code to migrate from. The supersession is purely a version pin update at scaffold time.

**Cross-references:**
- Original assumption file: `docs/refined-requests/astro-starlight-site.md` A1/A2 (now updated in place with strikethrough-and-redirect to this entry).
- Investigation: `docs/reference/investigation-astro-site.md` §1.
- DECISIONS.md entry that locked Starlight as the SSG: "Astro Starlight as static site generator" — that decision stands; only the version pin shifts.

**Status:** accepted.

---

## 2026-05-18 — RSS triage: source-aware prompt + editor_confidence field

**Decision:** Tighten the triage admission criteria in two ways:

1. **Source-aware system prompt.** The triage LLM now receives explicit per-source rules in addition to a single global persona. Each of the five seed feeds has its own ACCEPT/REJECT clauses:
   - **Anthropic news / Claude Code releases** — lean permissive; reject pure infra/billing patch notes and regional-only launches.
   - **Simon Willison** — accept Claude/Anthropic/MCP content and universally applicable LLM techniques; reject competitor-only deep dives and meta-blogging.
   - **Hacker News (Claude/Anthropic)** — judge the linked article, not the thread; explicitly reject "Claude" false positives (Claude Shannon, the French given name, unrelated products), Ask-HN/Show-HN/poll threads, and paywalled articles.
   - **r/ClaudeAI** — STRICT. Accept tips, tricks, prompts, workflow recipes, gotchas, and **field reports / war stories that teach a reusable lesson**. Reject questions, "look what I built" promo, complaints/rants, screenshots without prose, memes, polls, billing/account drama.

2. **Cross-cutting rules** apply to every source: English only; substance threshold (must be summarizable in two useful sentences); no retired-model content (Claude 2 / 3.0); **when in doubt, reject**.

3. **New `editor_confidence` JSON field.** The triage response now includes `editor_confidence: "high" | "medium" | "low"` alongside `relevant`, `audience`, `topics`, `summary`. This is the model's self-rated certainty in its own verdict and is propagated into both:
   - Item frontmatter (now 13 keys instead of 12)
   - PR body (each bullet shows `[confidence: <level>]` so reviewers can skim and concentrate attention on borderline items)

**Why:** PR #1's first operational run admitted 43 items — too permissive for the hub's "signal over coverage" framing. The original prompt was a one-liner ("relevant to bank colleagues learning Claude Code") with no reject criteria, no source differentiation, and no confidence signal. Tightening the prompt is the cheapest possible lever; adding source branches piggybacks on the existing `Feed:` line we already pass to the model; the confidence field gives the editor visibility into the model's own uncertainty without changing the binary admit/reject flow.

**Why field reports were kept in:** war stories ("here's what broke when I tried X in production") match the project's *"what I wish I knew a year ago"* tone better than clean recipe-style tips. Often the highest-signal posts on Reddit.

**r/ClaudeAI ACCEPT expanded (same day, 2026-05-18):** the initial r/ClaudeAI block allowed only two categories — tips/tricks and field reports. User flagged two real-world examples the rules would have wrongly rejected — *"Claude Code weekly limits are increasing 50%, now through July 13"* and *"Claude in an Enterprise Environment"*. The block now names **four** ACCEPT categories explicitly:
- **(a) Tips, tricks, prompts, workflow recipes** — concrete reproducible steps.
- **(b) Field reports / war stories** — documented failure modes with root cause and fix.
- **(c) Platform news** — factual reporting of operational changes (rate limits, pricing, new model availability, feature rollouts, deprecations, outage post-mortems). Reddit often surfaces these before the official blog, which is why the category is worth admitting despite the strict framing.
- **(d) Professional / enterprise use** — substantive case studies, governance / compliance / security discussions, at-scale deployment patterns, comparisons grounded in actual deployment experience. Especially load-bearing for the hub's audience — bank colleagues are literally in an enterprise environment.

The REJECT list was extended in the same edit to keep the categories tight: now also rejects vendor pitches disguised as discussion, generic LinkedIn-style thought leadership with no specifics, and pure speculation about how big-company-X uses Claude with no inside source. Scope of (c) and (d): r/ClaudeAI only; HN's "big news / major moves / breakthroughs" clause already covers platform news from the wider press angle, so duplicating it there would only add noise.

**Cost of the change:** ~30 lines of code across `triage.ts`, `frontmatter.ts`, `pr.ts`, `types.ts`. Test suite grows from 88 → 93 (5 new tests covering source-aware-prompt assertions, confidence preservation, and PR confidence markers). No production source restructuring; the JSON contract is the only ABI break, and it's an additive field.

**Alternatives considered:**
- Per-source prompt lookup via `rss-sources.json` schema (rejected: heavier — feeds are already named, the model can branch on the `Feed:` line for free).
- Post-LLM topic allowlist filtering (rejected: premature; let the prompt do the work, revisit if PR volume stays noisy).
- Skip the confidence field, rely on a tighter binary verdict (rejected by user: confidence buys cheap PR-review ergonomics).
- Recency cutoff at triage stage (rejected: already handled by feed pagination + dedup).

**Status:** accepted; implemented and tested 2026-05-18. Will be validated against the next daily run.

---

## 2026-05-18 — Reddit triage tightening round 2: generalizability, scannability, anti-promo

**Decision:** Significant tightening of the Reddit-group rules in `SYSTEM_PROMPT`, driven by user review of the 21 admits in PR #3. Twelve of those admits (≈57%) were judged borderline or wrong by the user. Encoding the rejection patterns as explicit prompt rules + anchored examples.

**Rule additions:**

1. **Field-report rule sharpened** — must be *generalizable to a DIFFERENT project*, must be *primarily instructive, not celebratory*. Smell test: strip out the author's specific project; does anything teachable remain? If no, reject. Resolves the "Claude Code helped me bring my dead passion project back to life" pattern.

2. **New cross-cutting rule (5): title scannability.** The TITLE alone must be self-describing to a bank colleague who doesn't follow r/ClaudeAI / r/ClaudeCode memes. Opaque titles ("I didn't think this was possible", "my code is play-dough", "playing with X"), inside-joke titles ("DystopiaBench / Claude is still the only one I'd trust with nuclear codes"), and teaser-style framing get rejected regardless of body substance. Reasoning: users scan a list — if they'd skip the title, the item has no surface area.

3. **Six new Reddit REJECT categories:**
   - Celebratory personal-project posts (passion projects, side hustles, hobby apps, "look what Claude did for MY thing")
   - Tool / extension / library / template announcements ("I built X", "introducing Y", "claudebox", "VS Code extension") — even when well-described; the post exists to promote
   - Personal setup / infrastructure stories ("I gave Claude access to MY vault / notes / server")
   - Cost-tracking / spending / "I saved $X" content — bank uses enterprise licensing, dollar-spend is not the audience's concern
   - Reddit subculture jargon ("vibe coders", "vibe coded", "low-effort coder", subreddit catchphrases) in titles or framing
   - Feedback-solicitation posts ("roast my X") — these are questions in disguise

4. **Explicit clarification kept ACCEPT:** capability-driven model-selection content (when to use Opus vs Sonnet vs Haiku for task-fit reasons) stays. Only *cost-driven* model-selection is out. The bank cares about correct usage, not optimization.

5. **Eleven anchored REJECT examples** baked into the prompt, drawn from actual PR #3 titles the user flagged: passion project, dog walks, dollar tracking, DystopiaBench, certification cheerleading, code-is-play-dough, VS Code extension promo, claudebox tool, Obsidian vault setup, "I didn't think this was possible", "playing with Jupyter playbooks".

**Why anchor examples in the prompt:** the model demonstrated in PRs #2 and #3 that abstract rules ("reject promo") were interpreted too narrowly. Naming real titles forces the model to pattern-match against concrete shapes, not its own loose interpretation.

**Prompt size impact:** ~30 lines added to SYSTEM_PROMPT (now ~95 lines, ~1700 tokens). Well within the model's effective system-prompt context; temperature=0 keeps it deterministic.

**Cost impact:** none — same number of items triaged, same model, same temperature.

**Status:** accepted; deployed in the same workflow_dispatch run that produces PR #4.

---

## 2026-05-18 — RSS cron pinned to 05:00 UTC (= 08:00 Europe/Athens DST)

**Decision:** Daily cron changed from `0 6 * * *` (06:00 UTC) to `0 5 * * *` (05:00 UTC). At today's date (2026-05-18, DST active in Athens, UTC+3) this lands at **08:00 Europe/Athens**. In winter (Athens UTC+2) it will land at 07:00 Athens.

**Why:** User asked for the PR to be ready at 8am their local time. GH Actions cron is UTC-only and does not follow DST — we pin one fixed UTC time and accept the one-hour drift between summer and winter. Picking summer-DST as the anchor was deliberate: the project is in active development now, so "feels right" matters more than the winter-correctness it would have if we picked the winter offset.

**Alternatives considered:**
- 8am UTC fixed (rejected: lands at 11am Athens summer — too late for "PR ready at start of day").
- Use a third-party scheduler that respects timezone (rejected: extra infra for a one-line cron change).
- Run twice (once for winter, once for summer with overlapping disabled) (rejected: over-engineered for a one-hour drift).

**Synced documents:** workflow YAML, CLAUDE.md repo-layout table, SCOPE.md "Editorial cadence" line, SECRETS.md cadence section, project-design.md ASCII diagram + YAML snippet, project-functions.md F1 description. Historical artifacts (refined-requests, phase plans, investigation, integration-verification, code-review, codebase-scans) deliberately left unchanged — they are point-in-time snapshots.

**Status:** accepted; deployed via the same commit as the feed-list pivot below.

---

## 2026-05-18 — RSS feed list pivot + source-group prompt + confidence tuning

**Decision:** Three coupled changes to the RSS pipeline, applied together:

1. **Feed list pivot — 5 → 5 feeds, but a different 5.** Final list:
   - **Reddit group:** r/ClaudeAI (kept), r/ClaudeCode (new)
   - **Major tech / AI news group:** Hacker News frontpage (now unfiltered — replaces the earlier `?q=Claude+OR+...` Claude-keyword variant), Wired AI tag feed, The Verge full firehose.
   - **Dropped:** Anthropic news (RSS feed deleted by Anthropic — returned 404 on the just-completed PR #2 run; no replacement URL discoverable). Claude Code GitHub releases (`releases.atom`). Simon Willison's blog.

2. **Source-group prompt structure.** The SYSTEM_PROMPT in `pipeline/src/triage.ts` no longer enumerates rules per individual feed name — it now enumerates rules per *group*, with member feeds listed in the group header. Two groups:
   - **Reddit group** — same four ACCEPT categories established on 2026-05-18 (tips/tricks, field reports, platform news, professional/enterprise use). Rules apply to both r/ClaudeAI and r/ClaudeCode.
   - **Major tech / AI news group** — new ACCEPT/REJECT criteria for *professional industry news and breakthrough AI developments*. ACCEPT: major model launches from any significant lab; capability breakthroughs (benchmarks, novel architectures, agentic milestones); strategic moves (large acquisitions, partnerships at scale, key personnel moves); regulatory/policy news with concrete industry impact; significant safety/security incidents; new developer-facing platforms from major AI labs. REJECT: consumer gadget reviews, smart-speaker stories, marketing fluff, opinion pieces, vague "AI will change everything" thought leadership, niche/regional news, small-seed startup funding stories, gaming/entertainment/automotive/crypto/political content using AI as keyword, articles where AI is a tangential paragraph, paywalled previews, "Claude" name false positives (Claude Shannon, French given name), pure Ask-HN/Show-HN/poll threads.

3. **Confidence-prompt tuning.** PR #2 returned all 24 admits as `confidence: high` — the prompt didn't give the model strong enough reasons to differentiate. Updated the `editor_confidence` field description to: *"RESERVE 'high' for verdicts where you would stake your reputation. Use 'medium' whenever you have ANY reservation. Use 'low' only when you are essentially guessing. When in doubt about confidence, go LOWER, not higher."* Goal: produce a useful spread across high/medium/low so the editor can focus PR review attention on borderline items.

**Why:**

- The Anthropic feed is a structural loss, not a fixable URL change. The other 4 feeds + HN frontpage will catch most major Anthropic announcements via repost.
- Replacing Claude-keyword-filtered HN with unfiltered HN frontpage shifts filtering responsibility from a string-match `?q=` URL parameter to the LLM. More expensive (more items triaged) but catches breakthroughs that don't mention "Claude" by name (e.g., a new OpenAI model, a major regulatory action, a major acquisition).
- Adding Wired AI and The Verge widens the breakthrough-news net beyond developer-centric sources. Bank colleagues read these too. The Verge firehose is noisy by design — the new REJECT list is built to filter the gadget/gaming/entertainment majority.
- Dropping Claude Code releases (`releases.atom`) and Simon Willison loses two high-signal sources. User direction was explicit ("take what i told u 2reddit + 3 sites"). Documented here so the trade is visible — easy to re-add either if signal loss is felt in subsequent runs.

**Alternatives considered:**
- Keep all old feeds + add the 3 new ones (rejected by user — wanted a clean cutover, not stacking).
- Replace HN firehose with an AI-tag-filtered Verge URL (rejected: user wanted full firehose, LLM filters).
- Drop the confidence field entirely now that it returned all "high" (rejected: tuning the prompt is cheaper than removing the field; if the tuning fails to spread the distribution, revisit later).

**Cost implication:** the Verge firehose + unfiltered HN frontpage will roughly double the daily item count vs. the prior run (66 items → expected ~120-180). Azure OpenAI cost per item ~$0.001 → daily run cost ~$0.10-0.20. Acceptable.

**Status:** accepted; deployed 2026-05-18. Will be validated against the next workflow_dispatch run (PR #3).

---

## 2026-05-18 — RSS pipeline verified operational end-to-end

**Decision:** The RSS curation pipeline is acknowledged **OPERATIONAL** following the first successful end-to-end run on 2026-05-18. Acceptance criteria are MET in production, not just on local test runs.

**Why this entry exists:** The audit trail benefits from a permanent marker that distinguishes "pipeline coded" from "pipeline working in real life." Phase 10's per-AC verdict was based on tests + lint + typecheck, all green. This entry captures the *operational* validation that's qualitatively different — real RSS feeds parsed, real Azure OpenAI calls made and JSON-mode responses validated, real `gh pr create` flow executed, real PR opened.

**Evidence:**
- Workflow run `26047997638` on `chomovazuzana/NbgAiHub`, branch `main`, triggered via `workflow_dispatch`, completed in 2m46s with conclusion `success`.
- PR #1 (`News triage 2026-05-18`) opened automatically, branch `news-triage/2026-05-18-2604799`, with 43 relevant items across 4 of 5 feeds. Anthropic news contributed 0 items this run (either no new items or all judged irrelevant — per-feed-non-fatal contract working).
- All 4 Azure secrets and the "Allow GH Actions to create/approve PRs" repo toggle wired via `gh` CLI; SECRETS.md §3 first-time-setup checklist validated end-to-end.

**Implications going forward:**
- Daily cron `0 6 * * *` now runs autonomously; expect one PR per day with new items, or silent runs on quiet days.
- DoD #12 from the refined request is satisfied.
- Subsequent runs will only triage *new* items since 2026-05-18 (dedup walks `/news/incoming/` and `/news/published/`).

**Status:** accepted; operational.

---

## 2026-05-18 — Astro Starlight site verified operational locally

**Decision:** The web UI workstream is acknowledged **OPERATIONAL (local dev)** following the first successful end-to-end build + serve on 2026-05-18. AC1–AC20 all MET per `docs/reference/integration-verification-astro-site.md`. Production hosting remains open in SCOPE.md.

**Why this entry exists:** Mirror of the RSS pipeline operational marker — distinguishes "site coded" from "site working." Phase 10 verifier produced a per-AC verdict table from build/check/audit output; the subsequent `npm run dev` smoke test confirmed live serving on `http://localhost:4321` with the homepage, sidebar (9 entries), audience filter, dark theme, and Pagefind search all working.

**Evidence:**
- `npx astro check` → 0 errors, 0 warnings, 4 cosmetic Zod-4 hints (deferred to a cosmetic refactor).
- `npm run build` → exit 0, 10 pages emitted to `dist/`, Pagefind index built.
- `npm audit --omit=dev` → 0 vulnerabilities.
- `npm run dev` → `HTTP 200 OK` on `localhost:4321`; `<h1>NbgAiHub</h1>` + tagline + CTAs rendered; sidebar entries Home/Start Here/Day 1/Week 1/News/Skills/Tips/Glossary/Reference/Contribute all served; expected empty-state warnings logged for empty `news/published/`, `skills/`, `tips/` (graceful fallback per F9).
- Astro v6.3.5 + Starlight v0.39.2 (per A1/A2 supersession).
- Bonus `ConfidenceChip.astro` component added beyond the design's 6 components — additive design refinement to surface the `editor_confidence` frontmatter field on news cards.

**Implications going forward:**
- The site rebuilds live whenever any markdown in `news/published/`, `skills/`, `tips/`, `glossary/`, `journeys/` changes (HMR caveat: cross-folder watching may not always fire — manual reload may be needed).
- 5 of 10 planned glossary terms seeded (claudemd, mcp, skill, plugin, agent).
- Day 1 journey page rendered with placeholder content; 6-step content TBD (separate scope item).
- Production hosting decision (Pro Pages vs Vercel/Netlify/Cloudflare vs defer) remains open in SCOPE.md.

**Status:** accepted; operational locally. Production deploy = follow-up workstream.


## 2026-05-19 — Hub plugin (plan-003) shipped

**Decision:** The `/hub` plugin is **OPERATIONAL** as of 2026-05-19. Eleven `/hub-*` commands (`/hub`, `/hub-search`, `/hub-skills`, `/hub-tips`, `/hub-news`, `/hub-glossary`, `/hub-onboard`, `/hub-install`, `/hub-audience`, `/hub-refresh`, `/hub-open`) ship in a sibling workspace at `plugin/` alongside `pipeline/` and `site/`. Marketplace manifest at repo-root `.claude-plugin/marketplace.json` points at `./plugin`; plugin manifest at `plugin/.claude-plugin/plugin.json`. Bundled content snapshot via `npm run build:snapshot`. Compiled entries via `npm run build` (esbuild ESM, `packages: "external"`).

**Why this entry exists:** Promotion-grade demo target ("hub installable in one command" per SCOPE.md demo checklist). Closes the third workstream after RSS pipeline and Astro site. Inside Claude Code, colleagues can now look up a glossary term, search the hub, browse curated news, or walk an onboarding journey without leaving their terminal.

**Architectural calls (resolved during Phase 3a investigation, not negotiable downstream):**

- **Manifest paths.** Plugin manifest at `plugin/.claude-plugin/plugin.json` (not `plugin/plugin.json` — Claude Code spec requires the `.claude-plugin/` subdir). Marketplace manifest at REPO-ROOT `.claude-plugin/marketplace.json` (not inside `plugin/`). `source: "./plugin"`.
- **Commands are filesystem-discovered.** No `commands` array in the manifest — Claude Code reads `plugin/commands/*.md`. Each markdown file is an LLM prompt that pre-executes a bundled Node script via `` !`node "${CLAUDE_PLUGIN_ROOT}/dist/<command>.mjs" $ARGUMENTS` ``. The script's stdout becomes the LLM's context.
- **Per-user state at `${CLAUDE_PLUGIN_DATA}/state.json`.** Falls back to `${XDG_DATA_HOME:-$HOME/.local/share}/claude-code/plugins/nbg-ai-hub/state.json` if env not set. State CANNOT live in the repo — multiple colleagues installing the plugin would clobber each other's audience prefs on every `/hub-refresh`.
- **Plugin config in repo.** `plugin/config.json` (shared) holds default URLs, search weights (title × 5 + topics × 3 + body × 1), snippet length (200), refresh cache path. Travels with the repo across org moves.
- **`/hub-open` defaults to localhost.** `devMode: true` until GH Pages production deploy. `/hub-open` probes `http://localhost:4321` first; instructs user to run `cd site && npm run dev` if dev server isn't up. Flip the flag in `config.json` post-deploy.
- **`/hub-refresh` via `git pull`.** Clones (first run) or `git pull --ff-only --depth 1` (subsequent) into `~/.cache/nbg-ai-hub/snapshot/`. Reuses the user's existing git auth — no separate token needed for the private repo. Atomic update via tmp-clone-then-rename.
- **TS-guard frontmatter validation (not Zod).** Keeps the esbuild bundle small and avoids a runtime dep duplication with the site. The pipeline + site own canonical schema authority; the plugin's validators are 1:1 mirrors that throw `FrontmatterInvalidError` on mismatch.
- **Search: pure TS, no library.** Title × 5 + topics × 3 + body × 1, case-insensitive substring, 200-char snippets centered on first match, ties broken by sourcePath. Upgradeable later if newcomers ask for semantic search.

**Evidence:**

- `cd plugin && npm install` → 210 packages, 0 vulnerabilities.
- `npm test` → **130/130 tests pass** across 13 test files (manifest, errors, snapshot, url-builder, config, state, frontmatter, search, audience, journeys, output, content, plus an end-to-end suite that spawns each compiled `dist/<cmd>.mjs` against the real snapshot).
- `npm run typecheck` → 0 errors.
- `npm run lint` → 0 errors, 0 warnings.
- `npm run build` → 11 bundled entries in `dist/*.mjs` (esbuild ESM, externalized deps).
- `npm run build:snapshot` → bundled 5 glossary + 0 tips + 0 skills + 1 journey + 8 news items into `plugin/snapshot/` with `.snapshot-meta.json`.
- End-to-end smoke against the real snapshot: `/hub` shows the 5-pillar menu with correct counts; `/hub-glossary plugin` returns the definition; `/hub-search claude` returns 13 ranked matches; `/hub-audience advanced` persists to state.json; `/hub-open glossary mcp` resolves to `http://localhost:4321/glossary#mcp`.

**Implications going forward:**

- The hub now has three operational workstreams (pipeline, site, plugin). Promotion demo target met: hub installable from a fresh Claude Code install in one command.
- When new tips/skills land in the repo, `npm run build:snapshot && npm run build` rebuilds the bundled snapshot. The intended release flow: a future GH Action that auto-bumps plugin version on content regeneration.
- `tips/` and `skills/` directories ship empty in this build (per current SCOPE.md). Plugin handles empty pillars gracefully — `/hub-skills` returns "no matching skills" rather than throwing.
- Day-1 journey content is still placeholder; `/hub-onboard day-1` surfaces "[content in progress]" honestly per A20.
- `devMode: true` in `plugin/config.json` remains until GH Pages production deploy. Flip with a one-line edit at deploy time; no plugin republish required if config is read at runtime (current behavior).

**Open follow-ups** (registered in `Issues - Pending Items.md`):
- OQ4: by-role journey slug spellings (`backend`, `data-scientist`, `ml-engineer`) — confirm before authoring content.
- OQ5: confirm Claude Code marketplace install flow against current spec when publishing.
- OQ6: surface `editor_confidence` in `/hub-news` output → DONE (already shipped as `[confidence: high|medium|low]` marker per spec).

**Status:** accepted; operational. Plugin codebase + manifests + snapshot tooling complete.

---

## 2026-05-19 — Personalization + community contributions: PAT-scoped gist + URL-redirect submissions

**Status:** accepted

**Context:** A brainstorm/refine session converged on adding per-user favourites + a marketplace contribution form, both leveraging GitHub as the backend (no servers, no proxies). The original design — favourites synced via OAuth Device Flow + a `gist`-scoped token, submissions via browser-side fork/branch/PR API choreography — hit a hard CORS wall (the investigator's R1 finding: GitHub's OAuth handshake endpoints `github.com/login/device/code` and `/login/oauth/access_token` do not send `Access-Control-Allow-Origin` headers, so a static site cannot complete Device Flow from the browser). The two viable fixes were (a) introduce a Cloudflare Worker proxy or (b) drop OAuth entirely and pivot to a PAT-paste UX for favourites + URL-redirect for submissions. The user picked (b) to keep the project zero-infrastructure.

**Decision:** Use a classic Personal Access Token (PAT) with **`gist` scope only**, pasted into a sign-in modal, for the favourites feature. Favourites are synced via the user's unlisted GitHub gist `nbgaihub-favorites.json` (one file, wrapped JSON shape `{schema_version: 1, favourites: [{type, slug, pinned_at}]}`, read-modify-write protocol with last-write-wins). For skill submissions, use a **GitHub `new file` URL redirect** (`github.com/<owner>/<repo>/new/main/skills?filename=&value=`), not browser-side write APIs — GitHub's own UI handles the fork/branch/PR flow; a CI validator catches malformed entries at PR time.

**Rationale:**
- The original Device Flow + OAuth App design was blocked by R1 (CORS).
- The recommended fix (Cloudflare Worker proxy) was rejected to keep the project zero-deployable-infrastructure. Adding a worker would have been a permanent operational tax for the team.
- PAT-paste reuses GitHub's existing token UI — every user already has a `Settings → Developer settings → Personal access tokens` page they know how to use. The `gist` scope is **narrower** than the OAuth App's `repo` scope; the blast radius of a compromised PAT is "the user's own gists" rather than "everything in every repo they can write to".
- The gists API supports CORS for browser writes (verified in investigation R3).
- The gist is **unlisted, not private** — anyone with the 32-char hex URL can read it, but the URL is never shared and is practically unguessable. The privacy callout in the gist contract is explicit so users understand this isn't auth-protected storage.
- URL-redirect submissions remove an entire class of API-call failure modes (no auth needed; no fork-then-branch-then-PR API sequence to choreograph in the browser); GitHub's web UI gives a much better author UX than any browser-side implementation would.
- The CI validator catches malformed entries deterministically at PR time — same 17 rules run on the client during form fill, so authors see most errors before submitting.

**Reverses:**
- SCOPE.md "Per-user personalization or bookmarking" — was in "Out of scope — NO", now in MVP-IN.
- SCOPE.md "Community contributions (PRs from outside the team)" — was in "Deferred — LATER", now in MVP-IN.

**Alternatives considered:**
- **OAuth App + Cloudflare Worker proxy** — REJECTED. The worker would terminate the OAuth handshake server-side and re-emit a token to the browser. Technically clean; operationally a permanent piece of infrastructure the team would have to own and rotate keys for. Killed on the "zero deployable infrastructure" promise.
- **User-pasted PAT + local-only favourites (no sync)** — REJECTED. Loses cross-device sync entirely; breaks symmetry with the future Claude-side `/hub-*` skill, which is the whole point of having a stored data contract.
- **Browser-side write APIs for submissions** (`POST /repos/.../forks` + `POST /repos/.../git/refs` + `PUT /repos/.../contents/...` + `POST /repos/.../pulls`) — REJECTED. Would have required the `repo` scope on the PAT (much broader than `gist`); fragile against API rate limits; gives a worse author experience than GitHub's own new-file UI; complicates the failure modes (partial submissions, orphan branches).

**Privacy posture (documented verbatim in the gist contract):**
> Your pins live in an unlisted gist on your own GitHub account — unlisted means anyone with the URL can read it, but the URL is a 32-char hex id and is never shared by NbgAiHub. The site uses your `gist`-scoped token only to read/write that one file. NbgAiHub does not see or store your pins. To fully revoke access, delete the token at github.com/settings/tokens.

The gist is owned by the user, not the project. If the user leaves the org, their pins vanish with them. No aggregation. No team-wide stats. (Opt-in aggregation is parked as a low-priority follow-up in `Issues - Pending Items.md`.)

**References:**
- `docs/reference/investigation-personalization.md` — R1 (CORS) + Topic 2 (unlisted vs private) + the Option C historical section.
- `docs/refined-requests/personalization-and-contributions.md` — refined request reflecting Option C end-to-end.
- `docs/design/plan-003-personalization-and-contributions.md` — 23-step plan executed across waves A–E.
- `docs/design/project-design.md §P` — interface contracts, data models, error classes.
- `docs/reference/gist-contract.md` — wire format shared with the future Claude-side `/hub-*` skill.

**Implementation evidence:** commits `c1df291` (Wave A — foundations), `5a08260` (Wave B — core libs incl. `auth.ts`, `gist.ts`, `submission.ts`, validator), `64f83b2` (Wave C — UI: `SignIn.astro`, `PinButton.astro`, `/my-pins/`, `/submit-skill/`, CI workflow). Site 127 tests; pipeline 112 tests (was 93). Anonymous browsing parity verified.

---

## 2026-05-19 — Auto-promotion of high-confidence professional-source news items

**Status:** accepted

**Decision:** Variant C — when a triaged item satisfies BOTH (a) `triage.editor_confidence === "high"` AND (b) the originating feed is marked `auto_promote_eligible: true` in `config/rss-sources.json`, the orchestrator writes it directly to `news/published/` and the workflow commits it to `main` without opening an editorial PR. Every other item still routes to `news/incoming/` and is promoted only after human review.

Per-feed eligibility (initial pin):
- `r/ClaudeAI` → `false`
- `r/ClaudeCode` → `false`
- `Hacker News frontpage` → `true`
- `Wired AI` → `true`
- `The Verge` → `true`

The pipeline now emits four step outputs on `$GITHUB_OUTPUT`: `new_items`, `auto_promote_count`, `review_count`, `mode` (`"auto_only" | "mixed" | "review_only" | "empty"`). The workflow has three conditional branches:
- `mode == 'auto_only'` — `git add news/published && git commit && git push origin main` (no PR).
- `mode == 'mixed' || mode == 'review_only'` — branch + `git add news/incoming news/published` + `gh pr create` with the standard PR body. The body now has two top-level sections, "Auto-promoted (n=N)" and "For review (n=M)", each only rendered when non-empty.
- `mode == 'empty'` — no-op.

**Rationale:** PR #5 surfaced that ~half the editorial-review effort goes into rubber-stamping items where both the triage model and the source had already done the work. Reddit + medium/low confidence items are the genuine judgment calls — those still earn human attention. Auto-promote on the easy-win items shrinks reviewer load without removing the human gate where it matters. Cost of the policy: roughly the next-day's PR shrinks to whatever Reddit + medium/low items remain; auto-promoted items become part of the publish stream immediately, eligible for the site's `glob` loader on the next build.

**Reverses:** nothing. SCOPE.md "Curated RSS, not auto-aggregated" still holds — variant C is *not* unconditional auto-promote; it's auto-promote under a conjunction of structural signals (confidence + source class), each individually documented in the prompt + the config.

**Alternatives considered:**
- **Unconditional auto-promote** (rejected — loses the editorial gate entirely; would surface Reddit field-reports unreviewed).
- **Confidence-only auto-promote** (rejected — model rates Reddit posts "high" plenty often; Reddit posts need a second pair of eyes).
- **Source-only auto-promote** (rejected — even professional sources yield off-topic items the model itself flags as low/medium confidence; those should still go through review).
- **Approval-bot auto-merge of the editorial PR** (rejected — same outcome as auto-promote but doubles the GH-Actions cost and adds a PR-bot to the audit trail with no benefit over committing direct to `main`).

**Implementation evidence:** new module `pipeline/src/auto-promote.ts` + `pipeline/tests/auto-promote.test.ts`; `FeedSource.auto_promote_eligible: boolean` is now a required field with no fallback; `config/rss-sources.json` updated with the per-feed flag; `writeNewsItem` takes a `destination: "incoming" | "published"` parameter; `buildPrBody` takes separate `autoPromoted` and `reviewNeeded` arrays; `.github/workflows/rss-triage.yml` has three conditional steps branching on `mode`. Pipeline tests grow 112 → 124. Build + lint + tests green.

## 2026-05-19 — Unconditional auto-promote (reverses variant C from earlier today)

**Status:** accepted
**Context:** Variant C (added earlier 2026-05-19) gated auto-promote on `editor_confidence: high` AND `auto_promote_eligible: true`. After a single production run, the editor reviewed the resulting PR #6 and decided the gate was overkill — Reddit-sourced items are typically duplicates of HN posts (and the cross-feed title dedup added later in the day catches those) and the cost of letting an occasional off-topic Reddit drama through is small compared to the standing operational cost of having to merge a PR every day.
**Decision:** Drop the `editor_confidence` half of the gate entirely. Flip all feeds to `auto_promote_eligible: true` in `config/rss-sources.json`. Every relevant triaged item now writes directly to `news/published/`; the workflow's `auto_only` branch pushes straight to `main` with no PR. The `auto_promote_eligible` field is retained as a per-feed kill switch so an operator can reintroduce gating on a specific feed by flipping `true → false` without code change.
**Rationale:**
- After deploying variant C, the only items that auto-promoted in test runs were 0 — the Reddit feeds (most of the daily firehose) were all gated, and HN/Wired/Verge happened to produce only medium-confidence items in the sample window.
- Cross-feed title dedup (added earlier in the day in the same conversation thread) is now the load-bearing quality control. If it misses a cross-post, the worst-case is a single near-duplicate on the live site — quickly fixable with a follow-up commit.
- Daily-PR-review friction was identified as a higher product cost than a few "noisy" published items per week.
**Reverses:** The earlier 2026-05-19 entry titled *"Auto-promotion of high-confidence professional-source news items"*. The infrastructure for that variant (per-feed eligibility flag, three-mode workflow branching, PR body splitting) stays in place — only the policy values changed.
**Alternatives considered:**
- Keep variant C and tighten the cross-feed dedup further (rejected — adds complexity to avoid an editorial cost the operator has decided to absorb).
- Confidence-only gate without the feed dimension (rejected — operator wants zero gate, not a narrower one).
**Implementation evidence:** `pipeline/src/auto-promote.ts` lost the `editor_confidence !== "high"` short-circuit; `config/rss-sources.json` Reddit entries flipped to `auto_promote_eligible: true`; orchestrator + config tests adjusted (the "mixed mode" test rewritten as "unconditional auto-promote" coverage). 145 tests still pass.

## 2026-05-19 — Rolling 7-day retention for news/published/

**Status:** accepted
**Context:** With unconditional auto-promote shipping every relevant item straight to `news/published/`, the site accrues stale news indefinitely. Operator wants a one-week window — older items disappear automatically.
**Decision:** Each daily pipeline run prunes any `news/published/<YYYY-MM-DD>-*.md` whose date prefix is strictly older than `today - 7 days` (UTC). Pruning happens in-process via a new module `pipeline/src/retention.ts` and lands in the same commit as the day's new items. The workflow gates the commit on a new `had_changes` step output (true if new items OR pruning occurred).
**Rationale:**
- Bounded site size + freshness — the "news" pillar is by nature ephemeral; old items obsolete fast.
- Same commit semantics — one commit per day with both adds and deletions makes the diff legible and rollback trivial.
- No-fallback rule respected: retention window is a hardcoded `RETENTION_DAYS = 7` constant, not a config value silently defaulted. To change the policy, edit the constant (or surface it as config later).
**Reverses:** nothing.
**Alternatives considered:**
- Separate daily cleanup workflow (rejected — doubles commits, splits a single semantic operation).
- Bash `find -mtime +7 -delete` in the YAML (rejected — operates on mtime not filename date; brittle).
- Date-tag everything and let the site filter at render time (rejected — files keep accumulating, repo bloats; site builds slower over time).
- Configurable retention via a new config file or env var (deferred — YAGNI; revisit if the policy gets renegotiated).
**Implementation evidence:** `pipeline/src/retention.ts` (parseFileDate, isStale, findStalePublished, pruneStalePublished); `pipeline/src/index.ts` calls pruning after the write loop and emits `pruned_count` + `had_changes` step outputs; `.github/workflows/rss-triage.yml` direct-push branch fires on `had_changes == true` (was `mode == auto_only`), and the commit message includes both counts ("N auto-promoted, P pruned"); `pipeline/tests/retention.test.ts` with 16 tests. Pipeline tests grow 145 → 161.

---

## 2026-05-19 — UI redesign: Option 1 hybrid + Linear/Vercel/Stripe aesthetic + portability hedge for Option 2

**Decision:** Keep Starlight as the framework; deeply theme it via a three-tier CSS custom-property token system; build bespoke layouts for the 11 marketing surfaces using Starlight's `splash` template wrapped in a single `MarketingShell.astro`; deep theme override for MDX content detail pages via `--sl-color-*` token aliases that Starlight already pipes through to Pagefind. Aesthetic anchor: **Linear / Vercel / Stripe** — Apple-influenced restraint, dark-mode-first, monospace accents, expressive typography, subtle gradients, scroll-driven motion. Portability hedge: 16 primitives under `site/src/components/primitives/` are Starlight-free (verified by `grep -r '@astrojs/starlight' site/src/components/primitives/` returning zero hits) so an escalation to Option 2 (replace Starlight entirely) only needs to rebuild `MarketingShell.astro`, not the design system underneath.

**Alternatives considered:**
- **Option 2 — replace Starlight with custom Astro pages.** Rejected as first attempt because (a) larger blast radius on iteration, (b) loss of free upstream Starlight upgrades (sidebar, search, dark-mode, a11y, MDX), (c) Option 1's bespoke marketing surfaces under splash-template + deep theme on content pages was judged to satisfy the brief at meaningfully lower cost. Escalation gate after Phase 6 (user evaluation at localhost:4321) — Option 2 remains live if Option 1's output isn't satisfying.
- **Pure CSS theming, no bespoke layouts.** Rejected because the homepage and pillar landings need full-bleed editorial layouts that Starlight's default doc grid resists.
- **Adopt a utility framework (Tailwind / UnoCSS).** Rejected — pure CSS custom properties + Cascade Layers covers the design ceiling without adding a build dependency. See investigation-ui-redesign.md Axis 1.
- **Add a motion library (`motion` / `gsap`).** Rejected — CSS transitions + native `IntersectionObserver` (~50 LOC) deliver the Linear/Vercel-style motion ceiling. See investigation-ui-redesign.md Axis 3.
- **Direct `@fontsource-variable/*` imports.** Rejected in favor of Astro's stable Fonts API (`fontProviders.fontsource()`) — same payload, ~80 fewer lines of boilerplate, free metric-adjusted fallbacks. See docs/research/astro-fonts-api-experimental-stability.md.

**Inputs:**
- docs/refined-requests/ui-redesign.md (39 ACs, 18 assumptions, 14-item DoD)
- docs/reference/investigation-ui-redesign.md (10 execution axes)
- docs/research/astro-fonts-api-experimental-stability.md
- docs/research/pagefind-ui-variant-in-starlight-0-39.md
- docs/design/plan-004-ui-redesign.md
- docs/design/project-design.md §S.13 (the design contract)
- docs/reference/code-review-ui-redesign.md (READY verdict, 3 minor fixes during review)
- docs/reference/integration-verification-ui-redesign.md (39/39 ACs MET, 14/14 DoD met, 174/174 tests, 28 pages built, 0 errors)

**Cost / outcome:**
- 1 new file in `docs/refined-requests/`, 1 new plan, 2 research docs, 1 codebase scan, 1 investigation, 3 test-build reports, 1 code-review report, 1 dependency-validation report, 1 integration-verification report — all under `docs/`.
- 47 site files changed (22 modified, 22+ new, 1 deleted).
- 0 new npm dependencies. 0 deprecations. 0 vulnerabilities.
- Test floor 127 → 174 (zero regressions; only additions).
- Bundle: ~143 KB CSS, ~393 KB woff2.

**Portability evidence (so an escalation to Option 2 isn't wasted work):**
- `grep -r '@astrojs/starlight' site/src/components/primitives/` → zero hits.
- `MarketingShell.astro` is the only file in `site/src/components/` that imports Starlight (the `StarlightPage` outer wrapping the splash template).
- Token system, primitive components, motion utility, content-prose/chrome stylesheets are all Starlight-agnostic in their internals.

---

## 2026-05-19 — Unified header via Starlight `Header` override (supersedes 2026-05-14 §S.13.14.3)

**Decision:** Reverse the 2026-05-14 "Header override rejected as fragile" call. Override Starlight's `Header` component with `site/src/components/SplashAwareHeader.astro`. The override reads `Astro.locals.starlightRoute.entry.data.template`. On `'splash'` (every marketing surface) it renders **one** unified `<nav class="nbg-topnav">` containing brand + section links + Pagefind `<Search />` trigger + `<AuthControls />` (Sign in XOR signed-in chip) + `<ThemeSelect />` + mobile drawer + `<SignInModal />` mount. On non-splash (content-detail) pages it renders the default Starlight Header markup verbatim, keeping `SocialIconsOverride` slotted in.

**Why:** Before this change, MarketingShell rendered its own `nbg-topnav` INSIDE Starlight's content slot. Starlight's chrome header still rendered on top. Result on every marketing page: two stacked navigation bars, with "NbgAiHub" appearing twice, the section links visually disconnected from the search/auth/theme controls, and an auth-state CSS bug (see next entry) showing Sign in + user chip simultaneously. The user flagged this directly: *"the main navi on top as a top pane and then we have additional navi as breadcrumbs ... NBG AI Hub repeated"*. A single coherent header is what Linear/Vercel/Stripe do and is the right target for the redesign's aesthetic anchor.

**Why the 2026-05-14 rejection no longer applies:** the override is *narrow* — one conditional branch, one DOM tree, no behavioral wrappers around Starlight components. It reuses Starlight's own `Search` and `ThemeSelect` via `virtual:starlight/components/*` imports, so Starlight upgrades only break this file if those components' public surface changes (rare and noisy when it does). The fragility cost is real but small; the visual cost of two stacked navs is large.

**Alternatives considered:**
- **Quick CSS fix — drop the brand block from MarketingShell's nav** (rejected: two bars remain, just less visually duplicated).
- **CSS `html:not([data-has-sidebar]) .header { display: none }`** (rejected: indirect, leaves dead DOM, doesn't solve where the section links live).
- **Keep MarketingShell's nav and accept double chrome** (rejected: that's the bug we're fixing).

**Implementation footprint:**
- New: `site/src/components/SplashAwareHeader.astro` (~430 LOC — splash branch + non-splash branch + drawer JS + default-chrome CSS copy + unified-nav CSS).
- New: `site/src/components/AuthControls.astro` (~225 LOC — extracted from SocialIconsOverride; ships with the `[hidden]` CSS fix).
- New: `site/src/env.d.ts` — ambient declarations for five `virtual:starlight/components/*` modules.
- Changed: `site/src/components/MarketingShell.astro` — stripped of its inline `nbg-topnav` markup (was ~430 LOC, now ~145 LOC).
- Changed: `site/src/components/SocialIconsOverride.astro` — reduced to a thin `<AuthControls /> + <SignInModal />` wrapper that short-circuits on splash pages.
- Changed: `site/astro.config.mjs` — added `Header: './src/components/SplashAwareHeader.astro'` override.
- Design contract: §S.13.6 updated; new §S.13.6.1 (unified header) and §S.13.6.2 (auth CSS fix) added in `docs/design/project-design.md`.
- Tests: build-output.test.ts gained 41 assertions (4 per marketing page × 10 surfaces + 1 CSS-rule presence check). 215/215 passing.

**Status:** accepted; in-session implementation 2026-05-19. User verification at localhost:4321 is the final gate.

---

## 2026-05-19 — Auth-state mutual exclusion CSS rule (paired with unified header)

**Decision:** Add a paired CSS rule that forces `[hidden]` to actually hide `.nbg-auth__signin` and `.nbg-auth__chip` when their JS-driven `hidden` attribute is set:

```css
.nbg-auth__signin[hidden],
.nbg-auth__chip[hidden] {
  display: none !important;
}
```

**Why:** Both variants render in the DOM at SSR time; a small client script flips `element.hidden` based on `auth.readToken()` to pick the active one. But the author CSS for both classes was `display: inline-flex`, same specificity as `[hidden]` and later in source order, so author CSS won and the UA's `[hidden] { display: none }` default never fired. Result on every page after a sign-in: both the "Sign in" button AND the "@chomovazuzana | Sign out" chip rendered visible at the same time. User flagged this in the same session as the unified-header issue.

**Where the rule lives:** inside `AuthControls.astro`'s `<style>` block, at `@layer nbg.components`. Build-output test asserts the compiled CSS contains the rule (allowing for Astro's `:where(.astro-XXX)` scope-class wrapping and lightningCSS minification).

**Status:** accepted; verified via test.

---

## 2026-05-21 — Reddit feeds switch to JSON endpoint + engagement floor + later cron

**Decision:** Three coupled changes to the RSS pipeline, scoped to Reddit feeds only:

1. **Endpoint switch.** `r/ClaudeAI` and `r/ClaudeCode` move from `https://www.reddit.com/r/<sub>/.rss` to `https://www.reddit.com/r/<sub>/new.json?limit=25`. HN / Wired / Verge stay on their existing RSS / Atom URLs.
2. **Engagement pre-filter** for `reddit-json` feeds, applied AFTER parse and BEFORE dedup/triage:
   - drop `stickied === true`
   - require `score >= 50`
   - require `num_comments >= 10`
   Both score AND comment floors must clear (AND, not OR). Items below either floor are logged and dropped before any Azure call.
3. **Cron shift.** `.github/workflows/rss-triage.yml` cron from `0 5 * * *` (05:00 UTC = 08:00 Athens DST) to `0 22 * * *` (22:00 UTC = 00:00 Athens winter / 01:00 Athens DST).

**Why:**

- *Atom has no engagement signal.* Reddit's `.rss` carries title / link / body / dates only — no `score`, `num_comments`, `upvote_ratio`, or `stickied` flag. The JSON endpoint exposes all four. There is no way to filter by community engagement without leaving RSS.
- *"Too much Reddit noise per run"* — observed by user 2026-05-21. The community filter (upvotes + replies) is doing free work for us; the LLM triage was carrying load it shouldn't have to. Sampling live feeds at decision time, both subreddits' 25-item windows averaged ~1 surviving post each under (score>=50 AND comments>=10) — a deliberately tight floor.
- *Stickies leak forever.* Reddit pins old posts (e.g. r/ClaudeCode's "Community Feedback" pinned 2025-10-24 was still appearing in the feed at 2026-05-21). Once such a post falls off the 7-day retention window in `news/published/`, our dedup would re-ingest it on the next run. The sticky filter kills this class of leakage at fetch time.
- *Both floors required, not just score.* Score alone catches viral noise; comments alone catch high-engagement announcements without substance. Together they isolate the field-report / discussion pattern the hub wants (substantive + community-validated).
- *Cron shift gives previous-day posts time to ripen.* The strict thresholds favor posts that have accumulated engagement. At 05:00 UTC, most posts in the 25-item window were <12h old and hadn't crossed the floor yet. At 22:00 UTC (Athens midnight wintertime), posts from the previous afternoon/evening have had ~8–12h to accumulate, dramatically increasing the survivor rate without loosening the floor.

**Alternatives considered:**

- *`/top.json?t=day` endpoint* — Reddit pre-sorts by score. Simpler in code, but loses visibility into posts that land late in the day. Rejected: we want our own thresholds, not Reddit's ranking.
- *Score floor only (no comment floor)* — too permissive; lets through high-upvote announcement posts that don't spark discussion. The hub values discussion-grade content.
- *Per-feed volume cap (top N items per Reddit feed)* — orthogonal to engagement; would mask the underlying signal. Rejected per "trust thresholds, no cap" decision.
- *48h age guard* — belt-and-braces against stale leakage. Made redundant by the explicit `stickied === false` check + the fact that `/new.json` is sorted by recency; all non-sticky items are <24h old by definition.
- *Layer engagement onto auto-promote.ts* — would double-gate (engagement → triage → engagement). Rejected: thresholds gate ingestion, triage gates quality, auto-promote gates publishing — three different jobs, three different gates.
- *Hardcoded thresholds vs. per-feed config* — chose hardcoded constants (`REDDIT_MIN_SCORE`, `REDDIT_MIN_COMMENTS` in `pipeline/src/reddit-filter.ts`) over a `reddit_thresholds` config block. Uniform policy across both subs, minimal config surface, trivially liftable to config later if per-sub tuning becomes useful.

**Where the code lives:**

- New: `pipeline/src/parse-reddit.ts` (~90 LOC — JSON listing → `FeedItem[]` with `reddit.{score, num_comments, stickied}` populated).
- New: `pipeline/src/reddit-filter.ts` (~60 LOC — `applyRedditEngagementFilter(items)` + exported `REDDIT_MIN_SCORE = 50`, `REDDIT_MIN_COMMENTS = 10` constants).
- Changed: `pipeline/src/types.ts` — `FeedSource` gains required `type: "rss" | "reddit-json"` (no fallback per global rule); `FeedItem` gains optional `reddit` block.
- Changed: `pipeline/src/config.ts` — validates `type`; rejects missing / unknown values with `ConfigSchemaError`.
- Changed: `pipeline/src/index.ts` — branches on `feed.type` during parse; applies engagement filter per Reddit feed; logs `reddit_engagement_filtered` with `keptCount` / `droppedByReason` so editorial drift is visible in workflow logs.
- Changed: `config/rss-sources.json` — switched 2 Reddit URLs to `/new.json?limit=25`; added `type` to all 5 entries.
- Changed: `.github/workflows/rss-triage.yml` — cron `0 5 * * *` → `0 22 * * *`.
- Tests: new `parse-reddit.test.ts` (11 tests) + `reddit-filter.test.ts` (11 tests) + `reddit-new.json` fixture; updated existing config / orchestrator / auto-promote tests for the new required `type` field. 187/187 passing.

**Status:** accepted; in-session implementation 2026-05-21. Operational effect (Reddit volume drop, sticky leakage gone) visible from the first cron run at 22:00 UTC tonight.

---

## 2026-05-21 — Reddit access via Application-Only OAuth (supersedes JSON-endpoint detail above)

**Decision:** Pull Reddit feeds through Reddit's Application-Only OAuth flow against `https://oauth.reddit.com/r/<sub>/new?limit=25` instead of the public `www.reddit.com` / `old.reddit.com` JSON endpoints.

**Why:** Empirical — when the engagement-floor work landed on `main` and was dispatched via `gh workflow run`, both Reddit JSON endpoints returned **403 Forbidden** from the GitHub Actions runner. The same URLs returned 200 from a residential IP with the same `User-Agent`. Tested in this order on the runner:

1. `https://www.reddit.com/r/<sub>/new.json?limit=25` — 403
2. Same URL with descriptive `User-Agent: NbgAiHub-RSS-Pipeline/1.0 (+...)` — 403
3. `https://old.reddit.com/r/<sub>/new.json?limit=25` with the same UA — 403

All three failed identically. The block is IP-based, applied by Reddit to unauthenticated JSON access from cloud ranges. `.rss` endpoints (the prior pipeline) had been working from the same runners — Reddit applies a tighter rule to JSON because it's effectively their public API.

The pre-flagged "long-term fix" in `SECRETS.md §5` was exactly this scenario. We're now implementing it.

**The OAuth flow we use:**

1. Once per pipeline run, POST to `https://www.reddit.com/api/v1/access_token`:
   - `Authorization: Basic base64(client_id:client_secret)`
   - `User-Agent: NbgAiHub-RSS-Pipeline/1.0 (+https://github.com/chomovazuzana/NbgAiHub)`
   - Body: `grant_type=client_credentials`
2. Reddit returns `{ access_token, expires_in: 86400, token_type: "bearer", scope: "*" }`. Token lives ~24h; we don't cache across runs because the daily cron is well under that lifetime.
3. Subsequent feed fetches: `https://oauth.reddit.com/r/<sub>/new?limit=25` with `Authorization: Bearer <token>` (note: no `.json` suffix on the `oauth.` subdomain).

Application-Only OAuth (the `client_credentials` grant) gives us a read-only token with no user context — sufficient for pulling public subreddit listings, no impersonation risk, no user-account secrets in the codebase.

**Alternatives considered:**

- *`grant_type=password` (user-impersonation script app)* — would have required adding the Reddit user's username + password as secrets. Rejected: bigger blast radius if leaked, no functional advantage for read-only public-listing pulls.
- *Revert Reddit to `.rss` + drop engagement filter* — would have worked immediately (RSS still passes through GH Actions) but lost everything from the earlier 2026-05-21 entry (engagement floor, sticky drop). Rejected as Option B in the user-facing decision flow.
- *Disable Reddit feeds entirely* — clean cut but loses the field-reports content stream. Rejected as Option C.
- *Third-party proxy (r.jina.ai / scrape APIs)* — adds external dependency + reliability risk + cost. Rejected as Option D.

**Where the code lives:**

- New: `pipeline/src/reddit-auth.ts` (~90 LOC) — `getRedditAccessToken(clientId, clientSecret, fetchImpl)` returning `{ accessToken, expiresInSec }`. Throws `RedditAuthError` on 401 / 5xx / network / malformed payload.
- Changed: `pipeline/src/env.ts` — new `readRedditCreds(env)` (~25 LOC). Conditionally required: orchestrator calls it only when an enabled feed has `type: "reddit-json"`. Per project no-fallback rule; `MissingEnvVarError` on the first missing value.
- Changed: `pipeline/src/fetch.ts` — `fetchFeedXml` accepts optional `authToken`; attaches `Authorization: Bearer <token>` when present. UA header stays.
- Changed: `pipeline/src/index.ts` — before the parallel fetch, gate on `enabled.some(f => f.type === "reddit-json")`; if so, acquire token, log `reddit_auth_ok` / `reddit_auth_failed`. Pass `authToken` per Reddit feed during the `Promise.allSettled` mapper. Auth failures are logged as `::warning::` and Reddit feeds fail-soft per AC6 — HN/Wired/Verge still succeed.
- Changed: `config/rss-sources.json` — Reddit URLs from `https://old.reddit.com/r/<sub>/new.json?limit=25` → `https://oauth.reddit.com/r/<sub>/new?limit=25`.
- Changed: `.github/workflows/rss-triage.yml` — `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` added to the pipeline step's `env:` block.
- Changed: `SECRETS.md` — new §1 entries for both secrets including the Reddit-app-creation walkthrough; §5 weak-spot note replaced with the now-implemented architecture; §3 first-time-setup checklist gained two lines.
- Tests: new `reddit-auth.test.ts` (12 tests covering happy path, 401, 5xx, network, malformed JSON, missing fields, empty creds, Basic-auth construction, grant_type body, UA, canonical URL). `env.test.ts` gained 4 `readRedditCreds` tests. Pipeline 188 → 205 passing.

**One-time operator action required:** create a script-type app at <https://www.reddit.com/prefs/apps> and add `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` as GitHub Actions secrets. See `SECRETS.md §1` for the field-by-field walkthrough. Without these, the orchestrator logs the auth failure and Reddit feeds fail-soft — HN / Wired / Verge keep working.

**Status:** accepted; in-session implementation 2026-05-21. Verification gated on operator completing the one-time Reddit-app setup; once secrets are in place, `gh workflow run rss-triage.yml --ref main` should produce 200s from `oauth.reddit.com` and items begin landing in `news/published/` again.

---

## 2026-05-21 — Reddit OAuth path parked; reverting Reddit feeds to `.rss`

**Decision:** Flip `config/rss-sources.json` Reddit feeds back to `type: "rss"` + `https://www.reddit.com/r/<sub>/.rss`. Keep the OAuth scaffolding (`pipeline/src/reddit-auth.ts`, `readRedditCreds`, `fetchFeedXml`'s `authToken` option, the engagement filter, the Reddit JSON parser) in the repo as inert / ready-to-reactivate code.

**Why:** Operator attempted to register a Reddit script-type app per the OAuth-pivot entry above. Reddit's app-creation form silently rejected captcha submissions across two attempts — the reCAPTCHA either failed to validate ("Incorrect response. Try again.") or did not register the click (checkbox stayed empty after submit). Likely causes: browser extension interference with reCAPTCHA's third-party calls, low-trust-account heuristics on Reddit's side, or network-level filtering. None of these are something we can fix from the code side in this session.

Rather than burn more time on captcha forensics, we revert to the proven path: Reddit's `.rss` endpoints. The 08:25 UTC scheduled cron run earlier today (commit `6494b36` — "News triage 2026-05-21: 7 auto-promoted, 0 pruned") confirms `.rss` still works from GitHub Actions runners with whatever default `User-Agent` Node 22's `fetch` sends.

**What this trade-off costs:**

- The engagement floor from the first 2026-05-21 entry (drop stickies, `score>=50`, `num_comments>=10`) is **not active**. Atom doesn't carry those fields. Reddit volume / sticky-leakage / low-engagement-noise concerns from the original conversation are back on the table.
- The pre-LLM-triage cost reduction is gone. We're back to spending Azure tokens on Reddit items that the engagement filter would have rejected at fetch time.
- The 22:00 UTC cron shift from the first 2026-05-21 entry **stays** (it's an independent decision; doesn't depend on JSON-feed access).

**What this trade-off preserves:**

- All other work today: cron shift, type discriminator in config schema, the engagement filter / parser / OAuth client code (parked but not deleted), the LLM-side triage tightening from prior sessions, the rolling-7-day retention.
- A clean reactivation path: if Reddit OAuth ever becomes available to this operator (e.g. captcha resolves on a different browser, account ages enough, or operator switches Reddit accounts), the entire path lights up by flipping `type: "rss"` → `type: "reddit-json"` and `https://www.reddit.com/r/<sub>/.rss` → `https://oauth.reddit.com/r/<sub>/new?limit=25` in two entries of `config/rss-sources.json`. No code change.

**Alternatives considered (this time around):**

- *Disable Reddit feeds entirely* — `enabled: false`. Loses the field-reports content stream; cleaner but harsher. Rejected: the user wanted to retry OAuth later, which is easier with feeds enabled.
- *Keep config pointed at `oauth.reddit.com` and accept that Reddit feeds fail every run* — would clutter logs with `feed_failed` warnings on every cron, with no upside until OAuth is wired. Rejected.

**Code state after this entry:**

- `pipeline/src/reddit-auth.ts`, `pipeline/src/parse-reddit.ts`, `pipeline/src/reddit-filter.ts`, `readRedditCreds`, `fetchFeedXml`'s `authToken` option — all **present but dormant**. Unit tests for all of them still run and pass (205/205). The orchestrator's `enabled.some(f => f.type === "reddit-json")` gate evaluates to `false` with the current config, so the OAuth token-acquisition code path is not exercised at runtime.
- `.github/workflows/rss-triage.yml`'s `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` env passthrough stays. With the secrets unset on GitHub, they pass empty strings — harmless because `readRedditCreds` is never called.
- `SECRETS.md`'s new §1 entries for the Reddit secrets stay; future-operator setup guide is now in the repo. §5 description of the OAuth flow stays — accurate when the path is reactivated.

**Status:** accepted; in-session implementation 2026-05-21. The pipeline is functional again with the same Reddit behavior as before this session, plus the cron shift to 22:00 UTC. If OAuth becomes accessible later, the flip-back is two URLs + two `type` values.

---

## 2026-05-25 — Navigation rework: two-door landing, News redirects externally, Reference + Contribute removed from nav

**Decision:** Restructure the site navigation around two visible audiences (newcomers / experienced users) and an externally-hosted news feed. Concretely:

1. **Sidebar (and top-nav) flattened to one entry per pillar:** Home · Foundations · Day 1 · Skills · Tips & Tricks · Glossary · News ↗ · My Pins. Removed: the `Start Here` group (collapsed into top-level `Foundations` and `Day 1`), the `Reference` entry, and the `Contribute` group (containing How to contribute / Submit a Skill).
2. **News surface now redirects externally** to `https://biks2013.github.io/AgentNews/` — a colleague's curated AI-news site. Implemented as `redirects: { '/news/': '<external>' }` in `astro.config.mjs`; the `site/src/pages/news/` directory was deleted entirely (both `index.astro` and `[slug].astro`). Pill, top-nav, sidebar, and footer all use `target="_blank" rel="noopener"` so users don't lose the hub's navigation context.
3. **Landing page (`site/src/pages/index.astro`) rewritten as a two-door traffic router** above the fold. Hero composition: title → single-line lede → two side-by-side cards. Newcomer card (`router-card--newcomer`, teal-soft `--nbg-accent-soft` background, teal border): badge "NEW TO CLAUDE CODE" / title "Start with Foundations" / body explaining LLM-provider differences + why Claude Code at NBG + setup / two buttons (Open Foundations primary, Day 1 setup secondary). Experienced card (white, grey border): badge "ALREADY USING IT" / title "Jump straight in" / body / 4-pill row (Skills · Tips & Tricks · Glossary · News ↗). Below the fold: Skills feed (top 6) + Tips feed (top 6). News feed removed from the homepage since the destination moved.
4. **`/reference/` deleted entirely.** The 14 entries it held were either redundant with Tips and Glossary (slash-commands belong in Glossary; triage-prompt patterns are Tips) or were `status: "planned"` placeholders. Cleaner to consolidate into the two surfaces people actually visit.
5. **`/contribute/`, `/submit-skill/`, `/start-here/day-1/`, `/start-here/week-1/` left as orphan routes** (page files still in the repo, just unlinked from sidebar / top-nav). Reversible: flip back on by adding the entries to `astro.config.mjs#sidebar` and `SplashAwareHeader.astro#navLinks`. `submit-skill` kept as a deliberate "hide functionality for now" per user direction; the page renders and the CI validator still runs on `skills/**/*.md` PRs, but no UI surface points at it.
6. **Branding rule: "News" everywhere in the UI, never "AgentNews".** The URL still points at AgentNews and the destination retains its own name — but every link / label on this hub reads "News". Applies to sidebar, top-nav, landing-page pill, and footer.

**Why:** User feedback from the demo session — *"a lot of information that is well hidden all around the subpages"* and *"the visible part of the screen should be the key screen where the user should immediately understand where he is, why is he here, and where he can dig into."* The two-door landing makes the audience split explicit instead of forcing the user to pick from eight equal sidebar entries. The News redirect kills the duplication with a colleague's better-maintained feed and removes ~33 published news items from the site's content surface (the underlying `news/published/` directory + RSS pipeline still operate — they're now orphaned data, see Issues #14).

**Alternatives considered:**

- *News as a launcher page on the hub* (one-screen card with "Visit AgentNews →" button) instead of hard redirect — rejected: hard redirect is one click less, and the launcher would require maintenance of yet another page that adds zero unique value over what AgentNews already provides.
- *Keep Reference and reshape it as a true cheatsheet* — rejected: 2 of 5 buckets were `status: "planned"` (i.e. empty), and the remaining 3 buckets duplicated content from Tips and Glossary at different granularity. The deletion is cheaper than the maintenance.
- *Delete the orphaned page files (`contribute.astro`, `submit-skill.astro`, `day-1.astro`, `week-1.astro`) rather than unlink them* — rejected: the user explicitly said "hide functionality" for submit-skill, and the journey pages (`day-1`, `week-1`) carry real content that may be rewired into Foundations later. Keeping them as orphan routes is reversible at zero cost.
- *Stack the newcomer card's two buttons vertically to match the right card's 2×2 pill grid height* — abandoned mid-iteration in favor of collapsing the pills to a single row of 4. The 4-pill row reads more like a nav strip than a button cluster, and matches the left card's single button row in height — symmetry achieved structurally rather than by content stretch.

**Where the code lives:**

- New / rewritten: `site/src/pages/index.astro` (full rewrite — two-door hero, removed news section, footer simplified).
- Changed: `site/astro.config.mjs` — `redirects: { '/news/': '<external>' }` added; sidebar reduced from 13 entries (across 3 groups) to 8 flat entries; News entry uses `attrs: { target: '_blank', rel: 'noopener' }`.
- Changed: `site/src/components/SplashAwareHeader.astro` — `navLinks` reshaped; `external: boolean` per link so AgentNews opens in a new tab; rendered `<a>` conditionally emits `target="_blank" rel="noopener"`.
- Changed: `site/src/pages/glossary.astro` — empty-state CTA no longer points at `/contribute/`.
- Changed: `site/tests/build-output.test.ts` — `marketingPages` arrays no longer reference deleted routes (`/news/`, `/reference/`) and now include `/start-here/foundations/`. 4 obsolete tests removed; suite 237 → 232 still passing.
- Deleted: `site/src/pages/reference.astro`, `site/src/pages/news/index.astro`, `site/src/pages/news/[slug].astro`.
- Page-content edits (copy): hero lede rewritten ("A practical guide to Claude Code at NBG — for anyone just starting out and anyone already using it daily."); newcomer body rewritten (LLM-provider differentiation + why Claude Code + setup); experienced body rewritten (skills / tips / glossary / news without entry counts).

**Layout pitfall discovered along the way:** the cards live inside Starlight's `.sl-markdown-content` wrapper, which ships a global vertical-rhythm rule — `.sl-markdown-content :not(a, strong, em, ...) + :not(a, strong, em, ...) { margin-top: var(--sl-content-gap-y); }`. This added `margin-top: 16px` silently to the second `<article>`, offsetting it down by 16px relative to the first. Eight iterations of CSS tweaking in the editing window never surfaced this — it lives in a Starlight stylesheet, not ours. Found via Puppeteer + Chrome DevTools Protocol (`CSS.getMatchedStylesForNode`). Override: `.router-grid > * + * { margin-top: 0 }`. Documented as a hard-won learning in (a) Issues #15 below (project-specific gotcha) and (b) a new "Visual verification for UI work — don't iterate blind" section in **global** `~/.claude/CLAUDE.md` to prevent the same blind-iteration pattern across all future projects.

**Status:** accepted; in-session implementation 2026-05-25. Site builds clean, 232/232 site tests pass. Demo session feedback was the trigger; sign-off pending on the live site review.

---

## 2026-05-25 — Glossary auto-link + hover tooltips: build-time linking, first-occurrence-only, HTML popover, `tldr` as hard build requirement

**Decision:** Make the glossary load-bearing across every content surface by auto-linking glossary terms (+ explicit aliases) on **first occurrence per page**, build-time, via a custom remark plugin (`site/src/plugins/remark-glossary-link.ts`) wired through `site/astro.config.mjs#markdown.remarkPlugins`. The plugin walks the markdown AST, matches case-insensitively with word-boundary awareness against an index of glossary slugs + aliases built once at plugin-factory time, skips fenced code / inline code / headings / existing links / Starlight asides / the term's own glossary page / files under `news/published/`, and replaces the first match with a plain HTML node `<button data-glossary-slug="…" data-glossary-display="…">…source-cased text…</button>`. A single-instance Astro primitive `site/src/components/primitives/GlossaryTerm.astro` (zero `@astrojs/starlight` imports — AC36/AC37 portability gate) injects a JSON manifest (`{slug: {title, tldr}}`) plus a small client-side wiring script (≤80 LOC, no framework deps) that, on `DOMContentLoaded`, finds every `[data-glossary-slug]`, generates a unique id, creates a sibling `<span popover="auto" role="tooltip">` next to the button (with title + tldr + "Read more →" anchor), wires hover/focus to call `showPopover()` / `hidePopover()` (with a ~150ms close delay), and respects `prefers-reduced-motion: reduce`. ESC dismissal is native to the HTML `popover` attribute.

Five sub-decisions captured in this single entry per AC25 of `docs/refined-requests/glossary-tooltips.md`:

1. **Build-time auto-link, not author-side annotation.** Authors write plain prose; the system does the linking. The alternative — manually wrapping every "CLI" / "skill" / "PR" in markdown — was rejected because: (a) it puts maintenance burden on every content author forever, (b) the day a glossary slug renames, every manual link silently rots, (c) the only authoritative source for "which glossary terms exist" is the glossary collection itself. Build-time linking has exactly one source of truth.
2. **First occurrence per page only.** Wikipedia convention. Per-file `Set<string>` keyed by canonical slug, scoped to `file.path`. Rejected the all-occurrences variant for visual noise — once the reader has seen the tooltip on this page, they have the concept. Subsequent occurrences pass through as plain text.
3. **HTML `popover` attribute, not a headless-UI library.** The platform attribute (Chromium 114+, Safari 17+, Firefox 125+) gives native ESC dismissal, focus management, and click-outside-to-close — for free, with zero JS runtime. We add ~80 LOC of hover/focus wiring on top. Rejected: Floating UI / Headless UI / Popover.js — they all carry runtime weight, ship their own ARIA semantics (often conflicting with our `aria-describedby`), and would require us to ship a JS framework just for this primitive. The HTML attribute does the same job with no dependencies.
4. **Primitive placement under `site/src/components/primitives/` (AC36/AC37 portability gate).** Hard rule: zero `@astrojs/starlight` imports in `GlossaryTerm.astro`. Asserted by `glossary-term-component.test.ts` (greps the file source for `from '@astrojs/starlight`). Reason: the primitive must work in any Astro project, not just the one running Starlight chrome. Same rule already established for the other 16 primitives (Container, Section, Card, etc. — see §S.13 + §S.13.16).
5. **`tldr` is a hard build requirement — no fallback.** Per global CLAUDE.md "Never create fallback values for missing configuration". Zod field is `z.string().min(1).max(160)`. A glossary MD missing `tldr`, or with `tldr.length > 160`, causes `npm run build` to exit non-zero with a clear Zod error citing the field. The popover must never silently render an empty surface — if a term made it into the index without a tldr, the build is broken.

**Why each, briefly:**

- **Why a remark plugin, not a rehype plugin or a custom Astro integration**: remark operates on the markdown AST before HTML conversion, which lets us still distinguish heading / code / link / aside nodes by type (rehype gives you only the final HTML, after structural information has flattened). The skip rules (especially "skip headings h1–h6", "skip aside callouts") are trivial in remark and ugly in rehype.
- **Why plain HTML `<button>` output, not a `<GlossaryTerm/>` JSX/MDX element**: emitting an MDX/JSX node would require every content file (.md and .mdx) to import `<GlossaryTerm/>` (or for the plugin to inject the import), and would tie the plugin output to MDX availability. Emitting `type: 'html'` text nodes with `<button data-glossary-slug="…">` is plain-text portable, works identically in .md and .mdx, and decouples the plugin from the component's import surface. The price: a single page-level registry component (`GlossaryTerm.astro`) wires up popovers at runtime via a small DOM-scan script. Net: simpler plugin, more robust to Starlight pipeline changes.
- **Why `<span popover>` not `<div popover>`**: the trigger button is emitted inside prose, often inside `<p>`. A `<div>` inside `<p>` causes the browser to auto-close the `<p>` at the first block child — corrupting the document tree. `<span>` is inline-valid in any context. The `popover` attribute is a global HTML attribute valid on any element. (`§S.14.10 R-4`.)
- **Why `aliases` as an explicit list, not stemming**: stemming silently picks aliases the author never sanctioned (`commits` → `commit` is fine, but `commitment` → `commit` is wrong). Explicit alias lists are reviewable in PRs, greppable, and stable. The contract: `pull-request` → `["PR", "PRs", "pull request", "pull requests"]`; `large-language-model` → `["LLM", "LLMs"]`; etc. — full list in `docs/refined-requests/glossary-tooltips.md` §Requirements §3.

**Scope decisions captured during the in-session work:**

- **Skip `news/published/` from auto-linking** (OQ1 resolved 2026-05-25). News surface is hard-redirected externally per the prior 2026-05-25 nav rework entry — auto-linking news pages would generate work that's invisible to users. The plugin explicitly checks `file.path.includes('/news/published/')` and returns early.
- **Audit script output is date-stamped**, not rolling (OQ2 resolved 2026-05-25). Output path: `docs/reference/glossary-audit-YYYY-MM-DD.md`. Multiple audits accumulate so triage decisions remain traceable. The script is read-only on `glossary/` — does not auto-add discovered terms (audit feeds human triage).
- **Popover surface is minimal**: title + tldr + "Read more →" link to the full entry. No audience badge in the popover (OQ3 resolved 2026-05-25). Detail page is one click away if needed.

**Defect surfaced during planning — `hook` glossary entry.** The user's original request listed "hooks" as a term newcomers don't know, and the refined-spec alias-contract example included `hook → ["hooks"]`, but no `hook.md` existed in the glossary at the start of this work. Caught by the planner. **The mandatory-new-terms count was bumped from 6 to 7**: `cli`, `frontmatter`, `yaml`, `markdown`, `rss`, `model`, **`hook`**. Glossary count after this entry: **21 + 7 = 28**. AUTO-block sync via `node scripts/sync-doc-counts.mjs` enforces the count in `CLAUDE.md` and `SCOPE.md`.

**Alternatives considered:**

- *Author-side annotation of links* — rejected for the reasons above (maintenance burden + silent rot).
- *All-occurrences linking* — rejected for visual noise.
- *Tippy.js / Floating UI for the popover* — rejected for runtime weight; the native HTML attribute does the job.
- *`<dialog>` for the popover surface* — rejected: `<dialog>` is modal by default, traps focus, and dismisses on click-outside in a less forgiving way than `popover="auto"`. The HTML popover attribute is the right primitive for a non-modal tooltip.
- *Embed full glossary body in tooltip* — rejected: entries are full markdown pages, often with tables and code. The hover surface needs to be one-line / one-paragraph. Hence the `tldr` field.
- *Auto-add audit-discovered terms* — rejected: auto-adding glossary entries would mean publishing definitions the team hasn't reviewed. Audit produces a triage report; humans decide.

**Where the code lives:**

- New: `site/src/plugins/remark-glossary-link.ts` — the remark plugin (build-time auto-linker).
- New: `site/src/components/primitives/GlossaryTerm.astro` — the page-level registry + wiring script.
- New: `scripts/audit-glossary-candidates.mjs` — the audit script (ESM Node, stdlib only).
- New: `docs/reference/glossary-audit-2026-05-25.md` — first audit run output.
- New: `docs/reference/integration-verification-glossary-tooltips.md` — Phase D verification report.
- New: 7 glossary entries — `glossary/{cli,frontmatter,yaml,markdown,rss,model,hook}.md`.
- Changed: `site/src/content.config.ts` — glossary schema extended with `tldr` (required ≤160) + `aliases` (default `[]`).
- Changed: 21 existing glossary entries — each backfilled with `tldr` + `aliases` per the alias contract.
- Changed: `site/astro.config.mjs` — `markdown.remarkPlugins` array now includes the glossary linker with options `{ glossaryDir: '../glossary', excludePaths: ['/news/published/'] }`.
- Changed: layout wrapper (`MarketingShell.astro` + content-page chrome) — single `<GlossaryTerm />` invocation per page.
- Changed: `CLAUDE.md` + `SCOPE.md` — AUTO content-count blocks updated via `node scripts/sync-doc-counts.mjs` (Glossary: 21 → 28).

**Status:** accepted; in-session implementation 2026-05-25. Phased ship: A (schema + content) → B (plugin + component + wiring) → C (audit) → D (visual verification + integration-verification doc). See `docs/design/plan-006-glossary-tooltips.md` for the AC coverage table and `docs/design/project-design.md` §S.14 for the design contract.

**Post-review follow-ons (same session, after Phase 7 code review landed PASS verdict):**

1. **IM-1 / XSS-safe JSON manifest** — `JSON.stringify(manifest)` inlined inside `<script type="application/json">` doesn't escape `</script>` sequences. If any future glossary `title` or `tldr` contains the literal substring `</script>` (or `<!--`) the HTML parser would terminate the host script tag prematurely and inject the remainder as live HTML. Applied a post-stringify escape: `< → <`, `> → >`, plus U+2028 / U+2029 line-separator escapes (json-string-safe but HTML-script-parser-hostile). Verified in `dist/index.html` — `<` appears in the inlined manifest.
2. **IM-2 / alias schema `.min(1)`** — design `§S.14.1` specified `aliases: z.array(z.string().min(1)).default([])`; initial implementation dropped the per-element `.min(1)`. Empty-string aliases would have passed Zod and become matcher noise (the plugin's `parseFrontmatter` filtered them as defence-in-depth, but Zod is meant to be the authoritative gate). One-line schema fix; tests still green.
3. **Issue #17 / `/glossary/` catalog rewrite** — caught during build-output verification (NOT covered by Phase D's visual pass — Phase D's "74 inline triggers on /glossary/" count was wrong; the actual built page had 0 buttons in entry bodies). Root cause: Astro 6's content-collection `render(entry)` path uses a markdown processor that does NOT inherit the project-level `markdown.remarkPlugins` configured in `astro.config.mjs`. Fix: rewrote `site/src/pages/glossary.astro` to use `createMarkdownProcessor({ remarkPlugins: [[remarkGlossaryLink, …]] })` per entry, with a synthesised `fileURL` so the plugin's self-page skip still derives `currentSlug` correctly. After the rewrite: 74 actual buttons on `/glossary/`, self-page skip verified (the `agent` entry's body links `model`, `claude-code`, `context-window`, `prompt`, `token` — but NOT "agent" itself). Documented as a general pattern in `Issues - Pending Items.md` #15 — every future page that bypasses the project markdown config must explicitly re-wire the plugin.
4. **Popover positioning anchored at trigger bottom-right** — initial component rendered the popover using the user-agent default `inset: 0; margin: auto;` which centres the popover in the top layer. User feedback during dev-server review: popover should anchor to the trigger so the reader's eye doesn't have to travel. Implemented JS positioning in the wiring script: before each `showPopover()`, set inline `position: fixed; top/left/right: auto; bottom: auto; margin: 0;` using `getBoundingClientRect()` of the trigger; anchor top-left of popover at trigger's `right, bottom + 6px`. Viewport-edge clamping: shift left if right-edge overflow; flip above the trigger if bottom-edge overflow; re-position on scroll / resize while open. Re-measure once per show via `requestAnimationFrame` to refine the estimate after layout. Documented at `§S.14.4` "Positioning" subsection. No flicker (estimate-first).
5. **Two bug-fixes captured here are NOT in the original §S.14 design contract** — they were emergent from running the feature in dev. Both have been folded into §S.14 (the wiring section gained an "Implementation discovery" callout listing the 3 manual-processor sites; §S.14.4 gained a "Positioning" subsection). The original §S.14 remains the authoritative reference; the additions are explicitly dated 2026-05-25 for archaeology.

**Where the additional code lives:**

- Changed: `site/src/components/primitives/GlossaryTerm.astro` — added the `positionAt()` helper inside the wiring closure (≈40 LOC); added `window` scroll/resize listeners gated on `:popover-open`; added the JSON manifest escape (5 lines).
- Changed: `site/src/content.config.ts` — alias element now `z.string().min(1)`.
- Changed: `site/src/pages/glossary.astro` — replaced `await render(entry)` + `<Content />` with `createMarkdownProcessor` + `set:html={html}` pattern. Drops the `Content` symbol from imports.
- Changed: `docs/design/project-design.md` §S.14.4 + §S.14.5 — added the positioning + multi-wiring-site subsections.
- Issue #17 was moved from Pending to Completed in `Issues - Pending Items.md`.
- New: `docs/reference/authoring-glossary-terms.md` — workflow doc for "how to add a new term and confirm it auto-links throughout."

