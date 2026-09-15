# Refined Request: UAT Analysis — Five Bank Colleagues — 2026-05-26

## Category
Research / UX Analysis (documentation-only deliverable; no code changes)

## Objective
Analyze the raw UAT transcripts from five bank colleagues (Elisavet, Mina, Natasa, Maria, Dimitris) captured in `UAT-feedback-colleagues-2026-05-26.md`, consolidate overlapping themes into a deduplicated list with named attribution, validate each consolidated theme against the live site at <https://chomovazuzana.github.io/NbgAiHub/> from a fresh-eyes UX perspective, and propose for each validated theme five distinct improvement variants spanning minimal-effort to ambitious-rebuild. Produce a single analysis markdown document. **No site code, content, configuration, or any other project artifact may be modified.** The only file produced by this work is the analysis document itself.

## Scope

**In scope**
- Reading and parsing the five colleague transcripts in `UAT-feedback-colleagues-2026-05-26.md`.
- Reading project context: `SCOPE.md`, `CLAUDE.md`, `Issues - Pending Items.md`, `docs/design/project-design.md` (§S.13, §S.14 as needed), recent DECISIONS entries (2026-05-25 / 2026-05-26).
- Scanning the live site (DOM inspection, headless screenshots, visit each surface) and the source under `site/` to validate each consolidated theme.
- Producing one consolidated, deduplicated list of feedback themes with named contributor attribution.
- For each consolidated theme, producing a UX validation verdict against the live site.
- For each *validated* theme, producing exactly five distinct improvement variants graded from minimal-effort to ambitious-rebuild.
- Cross-referencing themes that match items already tracked in `Issues - Pending Items.md` so existing pending items are not re-litigated as new.
- Saving the deliverable at the repo root as `UAT-analysis-colleagues-2026-05-26.md`.

**Out of scope**
- Any modification to `site/**`, `pipeline/**`, `plugin/**`, content directories (`glossary/`, `tips/`, `skills/`, `journeys/`, `news/**`), config files, `astro.config.mjs`, `SCOPE.md`, `DECISIONS.md`, `Issues - Pending Items.md`, or any other project artifact.
- Implementing any of the proposed variants.
- Picking a "winning" variant per theme (the deliverable presents the menu; selection is the operator's call downstream).
- Translating colleague feedback into formal Jira tickets.
- Estimating human-day timelines for variants (per global rule — frame as shipping order / scope, not calendar time).
- Adding new themes that are not grounded in the five transcripts (the analysis must trace every theme back to at least one colleague).

## Requirements

1. **Source faithfulness.** Every consolidated theme must trace back to at least one verbatim or near-verbatim concern from the five transcripts. No theme may be invented from project-internal knowledge alone.
2. **Deduplication.** When two or more colleagues raise the same concern in different words, merge into one consolidated theme. **No per-theme attribution** — the operator does not care who proposed what; themes stand on their merits. The transcript file itself is the audit trail if attribution is ever needed downstream.
3. **Singleton themes are valid.** Concerns raised by only one colleague are not discarded — they appear as singletons, but still without naming the colleague.
4. **UX validation per theme.** Each consolidated theme must carry an explicit validation verdict using one of these labels (exact strings, lowercase): `confirmed`, `partially confirmed`, `recently mitigated`, `misread`. Each verdict must cite the concrete evidence on which it rests (URL fragment / DOM element / file path / Issue # / DECISIONS date).
5. **Five distinct variants per validated theme.** Themes with verdict `confirmed` or `partially confirmed` (and `recently mitigated` if the colleague's point still has residual surface area) must each carry exactly five improvement variants. Verdict `misread` themes carry a short explanation but no variants.
6. **Variant distinctness.** The five variants per theme must be substantively different approaches, not five graded volume knobs on the same approach. Each must describe a *concrete* approach (e.g. "add a collapsible accordion above the Foundations hero summarising the 6 steps with anchor links") not a generic ("improve navigation").
7. **Variant tradeoff line.** Each variant must contain a line beginning with `Tradeoff:` covering effort scale, scope, risk, who it helps, who it might frustrate.
8. **Effort grading spread.** Within each theme's five variants, the set must span a useful effort range from minimal (a CSS tweak / single-file edit / copy change) through to ambitious (multi-page rebuild / new content pillar / new tooling). State each variant's effort grade explicitly using one of: `minimal`, `light`, `moderate`, `substantial`, `ambitious`.
9. **Non-technical audience targeting.** Every variant must include a line beginning with `Helps non-technical colleagues by:` explaining specifically how it improves the experience for the primary audience (bank colleagues new to Claude Code).
10. **Pending-items cross-reference.** When a consolidated theme overlaps with an item in `Issues - Pending Items.md`, the theme must reference that item by its number (`Issue #N`). This avoids the analysis re-discovering already-tracked work as if it were new.
11. **Document path.** The deliverable is saved exactly at `/Users/suzy/ClaudeCode/Projects/NbgAiHub/UAT-analysis-colleagues-2026-05-26.md` (repo root).
12. **No project artifact mutation.** The analysis document is the only file created. `git status` after running must show exactly one new untracked file (or modification of an existing single file at that path) plus no other changes to any project file under `site/`, `pipeline/`, `plugin/`, content directories, config, or project-state files.

## Constraints

- **Documentation deliverable only.** Downstream Phases 4–10 (planner / designer / coders / tests / integration) are explicitly skipped. ACs and DoD are calibrated to a markdown document, not to running code.
- **Visual-verification rule applies if validating live-site claims.** Per global CLAUDE.md, after one failed CSS-only inference about how a page looks, the analyst must escalate to headless Chrome screenshot of the live URL and `Read` the image rather than continuing to guess from CSS source.
- **Tone consistent with the project.** "What I wish I knew a year ago" — opinionated, plainspoken, no marketing voice, no AI-slop hedging. The analysis writes as a UX expert to the project operator, not as a customer-service summary.
- **No human-day estimates.** Frame variant effort as scope/shipping order, not calendar time.
- **Primary audience is non-technical bank colleagues.** Every variant must be evaluated against that audience first, even if a secondary audience (experienced users) benefits too.
- **Greek-language feedback handling.** Maria's transcript is part-Greek; her points are translatable to English in the consolidated themes but verbatim Greek phrases may be quoted for fidelity where useful.
- **Existing design-system respect.** Variants that touch UI should respect the three-tier token system (§S.13) and the 16 portable primitives. Variants that propose adding new primitives or breaking the system must call that out explicitly under their `Tradeoff:` line.

## Acceptance Criteria

AC1. The file `/Users/suzy/ClaudeCode/Projects/NbgAiHub/UAT-analysis-colleagues-2026-05-26.md` exists after the run.

AC2. The document opens with an H1 title and a short (≤200-word) executive preamble naming all five colleagues and stating the document's purpose.

AC3. The document contains exactly one `## Consolidated theme` heading (or equivalent H2 heading using the literal prefix `## Theme `) per deduplicated theme. The count of these headings equals the count of consolidated themes the analyst identified.

AC4. **No colleague names appear anywhere in the document body** as theme attribution. The five first names (`Elisavet`, `Mina`, `Natasa`, `Maria`, `Dimitris`) may appear at most in: (a) the executive preamble listing who was interviewed, and (b) verbatim transcript quotes that happen to contain a name internally. They MUST NOT appear in any theme header, theme opening paragraph, or summary-table row.

AC5. Every consolidated theme nonetheless traces back to at least one verbatim or near-verbatim concern from the transcripts (Requirement 1 still holds — the audit trail is in the transcript file, not in the analysis doc). No theme is invented from project-internal knowledge alone.

AC6. Each consolidated theme contains a line or sub-section labelled `Verdict:` whose value is one of exactly: `confirmed`, `partially confirmed`, `recently mitigated`, `misread`.

AC7. Each `Verdict:` is followed by an `Evidence:` block citing at least one concrete artifact (URL path on the live site, file path under `site/`, DOM-selector observation, Issue # from `Issues - Pending Items.md`, or DECISIONS dated entry).

AC8. For every consolidated theme with verdict `confirmed` or `partially confirmed`, there are exactly five variant sub-sections under it, numbered `Variant 1` through `Variant 5` (or equivalent H3/H4 headings using a `Variant N` prefix).

AC9. Themes with verdict `recently mitigated` either include five variants (if residual surface remains) or include an explicit one-paragraph note explaining why no variants are proposed (because the mitigation already covers the colleague's concern).

AC10. Themes with verdict `misread` carry no variants and instead carry a 1–3 sentence explanation of why the original concern does not apply to the current live site.

AC11. Every variant block contains a line beginning literally with `Tradeoff:`.

AC12. Every variant block contains a line beginning literally with `Effort:` whose value is exactly one of: `minimal`, `light`, `moderate`, `substantial`, `ambitious`.

AC13. Every variant block contains a line beginning literally with `Helps non-technical colleagues by:`.

AC14. Within each theme's five-variant set, the `Effort:` labels span at least three distinct levels (no theme proposes five `moderate` variants — the spread requirement is enforced).

AC15. Every consolidated theme that maps onto an item in `Issues - Pending Items.md` cites that item using the literal token `Issue #N` (where N is the pending-item number). At minimum, themes covering the live-site Starlight-cascade visual drift (Issue #20), the focus-ring violet token leftover (Issue #19), and the SignInModal duplicate render (Issue #12) cite those numbers when they surface.

AC16. The document contains a final section titled `## Theme index` or `## Summary table` listing every consolidated theme with: theme number, short title, verdict, effort spread (e.g. `minimal → ambitious`). **No contributing-colleagues column.** This serves as the document's at-a-glance map.

AC17. The document is well-formed markdown — every code fence opens and closes, every heading uses ATX style (`#` / `##` / etc.), no broken intra-document anchor references.

AC18. No file other than `/Users/suzy/ClaudeCode/Projects/NbgAiHub/UAT-analysis-colleagues-2026-05-26.md` is created or modified by this work. `git status` after the run shows changes only to that one path (plus possibly the refined-request file itself, which is part of Phase 1).

AC19. The document quotes or paraphrases at least one specific concern from the transcripts when introducing each theme, so a reader can recognise the source phrasing without re-opening the transcript file. Quotes are introduced *anonymously* (e.g. "One reviewer noted…" or just an unattributed blockquote) — never "Maria said…" or "Elisavet noted…".

AC20. Every variant in the document is a *concrete* proposal (it can be uniquely identified by its first sentence — e.g. "Add a sticky right-rail Table-of-Contents to Foundations" — and a downstream planner could turn it into a plan). Variants must not be generic ("make navigation better").

## Assumptions

These are the implicit choices made during refinement. They will be shown to the operator before downstream phases run so they can be challenged.

- **Document structure** — themes are presented flat (not ranked or prioritised). A final `## Theme index` summary table provides at-a-glance scanning. The operator picks priorities downstream; the analysis presents the menu.
- **"Five variants per point"** — interpreted as five *fully distinct approaches* (different mechanisms, different surfaces, different content strategies) rather than five graded knobs on the same approach. AC8, AC14, and Requirement 6 all enforce this.
- **No attribution in theme bodies** *(operator-corrected at refinement gate, 2026-05-26)* — themes stand on their own merits. Colleague names are NOT used to label themes, contributors, or summary rows. They may appear only in the executive preamble (listing who was interviewed) and inside verbatim transcript quotes that happen to contain a name. The transcript file itself remains the audit trail if attribution is ever needed downstream.
- **Greek-language fidelity** — Maria's feedback contains Greek passages. The consolidated theme is in English; verbatim Greek phrases may be quoted as supporting evidence where the original wording is load-bearing. No full translation is provided.
- **"Recently mitigated" handling** — if a colleague raised a concern that was fixed in a session dated between the colleague's feedback capture and the analysis run, the verdict is `recently mitigated`. Variants are still produced if the mitigation only partially addresses the colleague's framing (e.g. focus-ring fix landed but primitive token leftover is a future footgun).
- **Pending-items overlap** — when a theme already exists as a pending item, the theme is still proposed (the colleague raised it, so it warrants surfacing) but the variant set explicitly references the existing remediation path documented in `Issues - Pending Items.md`. The analyst does not "invent" the remediation if it's already documented.
- **Variant authorship voice** — variants are written in second-person imperative ("Add a collapsible accordion…", "Replace the wall of text with…") rather than third-person hedged ("Could consider adding…"). This forces concreteness.
- **No effort numbers** — variants carry an enum label (`minimal` / `light` / `moderate` / `substantial` / `ambitious`) not numeric estimates. Per global CLAUDE.md, no human-day estimates.
- **Out-of-scope colleague suggestions** — Natasa's "Greek option / bilingual" suggestion overlaps with SCOPE.md's deferred LATER bucket ("Greek-language content"). The theme is still consolidated and validated; variants may include "explicitly mark it as deferred" or "stage a minimal bilingual subset". The analyst does not silently drop it.
- **Variants for `misread` verdicts** — none. The misread explanation suffices.
- **Themes the colleagues did NOT raise but which the analyst notices** — out of scope. The deliverable is grounded in the five transcripts. Other defects the analyst encounters while exploring the live site are not added as new themes (they belong in `Issues - Pending Items.md` via a different workflow).
- **Source file for transcripts** — the analyst reads `UAT-feedback-colleagues-2026-05-26.md` at the repo root verbatim. If any transcript appears truncated or unclear, this is flagged in `## Open Questions` of the deliverable rather than guessed.
- **Headless validation tooling** — when validating live-site claims, the analyst uses `curl` for HTTP probing and headless Chrome (per global CLAUDE.md Visual Verification rule) for visual claims. No new tooling is installed.

## Open Questions

These could not be resolved at refinement time and the downstream phase is expected to either resolve them or document them in the deliverable:

- **Should the deliverable also propose a "no-op" / "explicitly decline" variant for any theme?** Some colleague concerns (e.g. Natasa's Greek bilingualism) might rationally be declined per project scope. The variants are silent on whether `decline` counts as one of the five. Default assumption: variants are *constructive* proposals; if a theme genuinely warrants declining, that gets called out in the verdict's `Evidence:` block, not as a sixth variant.
- **Pin attribution to a single source theme vs cross-link.** A colleague might raise a concern that's really two themes (e.g. Maria's day-1 sequence issue contains both "GitHub-account step should come before clone-repo step" *and* "explain which email to use"). Default: split into separate themes when the proposed remediations would differ; merge when remediation is the same.
- **Does the analysis need to be diff-able against any prior UAT analysis?** There is no prior analysis document in `docs/reference/` matching the same colleague cohort, so this is moot — but flagged in case the operator expected one.

## Definition of Done

This work is complete when the following are all true (specific to a documentation deliverable; no code execution / no test run):

1. **File presence.** `/Users/suzy/ClaudeCode/Projects/NbgAiHub/UAT-analysis-colleagues-2026-05-26.md` exists.
2. **Well-formed markdown.** Every code fence is closed. Every heading is ATX style. No intra-document anchor (`[...](#...)`) resolves to a non-existent heading.
3. **Schema adherence.** Every consolidated theme follows the schema: heading + contributors + `Verdict:` + `Evidence:` + (if applicable) five `Variant N` blocks each with `Tradeoff:` + `Effort:` + `Helps non-technical colleagues by:`.
4. **No name attribution in theme bodies.** Per the operator decision at the refinement gate, themes do not name colleagues. Names appear at most in the executive preamble and inside verbatim quote bodies. No theme heading, contributor line, or summary-table row contains a colleague's first name.
5. **No broken internal references.** Any `Issue #N` reference points to a real entry in `Issues - Pending Items.md`. Any `DECISIONS …` reference points to a real dated entry in `DECISIONS.md`.
6. **No site changes performed.** `git diff --name-only HEAD` after the run lists at most: the analysis document (new untracked file), the refined-request file under `docs/refined-requests/`. It does NOT list any file under `site/`, `pipeline/`, `plugin/`, `glossary/`, `tips/`, `skills/`, `journeys/`, `news/`, `config/`, `scripts/`, or any of the project-state files (`SCOPE.md`, `DECISIONS.md`, `Issues - Pending Items.md`, `CLAUDE.md`).
7. **Variant concreteness check.** Every variant's first sentence is specific enough to be uniquely identified — the operator could read just the variant titles and understand the proposal space.
8. **Effort spread check.** No theme's five variants all share the same `Effort:` label. Each theme spans at least three of the five effort levels.
9. **Summary table renders.** The final `## Theme index` (or `## Summary table`) lists every theme with verdict + contributors so a reader can scan the whole document in 60 seconds.
10. **Tone check.** The document reads as opinionated UX expert analysis — no AI-slop hedging ("It could potentially be considered that perhaps…"), no marketing voice, no calendar-time estimates ("a sprint", "two weeks").

## Original Request

```
Analyze the UAT feedback in /Users/suzy/ClaudeCode/Projects/NbgAiHub/UAT-feedback-colleagues-2026-05-26.md (5 bank colleagues: Elisavet, Mina, Natasa, Maria, Dimitris). Treat every feedback point as valid input for improvement.

Step 1: Identify overlapping themes across colleagues and consolidate the feedback into a deduplicated list of feedback points. When two or more colleagues raise the same concern in different words, merge them into one consolidated point and attribute the contributors.

Step 2: As a UX expert with a fresh-eyes perspective, validate each consolidated point against the current state of the site (Astro Starlight project under /Users/suzy/ClaudeCode/Projects/NbgAiHub/site/, deployed to https://chomovazuzana.github.io/NbgAiHub/). For each point, confirm whether the issue genuinely exists on the live site, is partially present, has been recently mitigated, or is a misread.

Step 3: For every validated consolidated point, propose 5 distinct improvement variants. Each variant must:
- describe a concrete approach (not a generic "improve X")
- explain the tradeoff (effort, scope, risk, who it helps, who it might frustrate)
- target better engagement and experience for non-technical bank colleagues (primary audience)
The 5 variants should span a useful range — minimal-effort to ambitious-rebuild — so the reader can pick a level of investment.

OUTPUT: A single markdown analysis document at the repo root named UAT-analysis-colleagues-2026-05-26.md.

EXPLICIT CONSTRAINT: Do NOT implement any changes to the site code, content files, or any other project artifact. This is analysis-only. The only file produced is the analysis markdown itself.

Project context (already in chat context, but worth re-reading from SCOPE.md and CLAUDE.md at the repo root):
- 36 glossary terms, 14 tips, 6 skills, 2 journeys, 54 published news items
- Recent UI redesign anchored on AgentNews aesthetic (Linear/Vercel/Stripe, light theme, slate+teal palette, IBM Plex Sans/Mono + Newsreader serif)
- Three-tier design system (§S.13): primitives.css / semantic.css / aliases.css, 16 portable primitives, MarketingShell wrapper
- Glossary auto-link + hover tooltips (§S.14): build-time remark plugin wraps first occurrence per page of each glossary term in a <button data-glossary-slug>, GlossaryTerm primitive injects manifest + popover wiring
- Site is live at https://chomovazuzana.github.io/NbgAiHub/ on GitHub Pages free tier, repo public
```
