---
request: beginner-foundations
category: content + new surface
target_workspace: site/ (+ glossary/, journeys/, news/)
date: 2026-05-24
parent_workflow: team
status: refined
---

# Beginner foundations — refined request

## Objective

Make NbgAiHub useful to someone who **has never heard of Claude Code**, who doesn't know what an LLM is, who doesn't understand why context windows matter. Right now the hub assumes the reader already knows what they're doing — Day 1 jumps to "install Claude Code". The proposal: insert a **Foundations** layer *before* Day 1 that answers the "what is this and why should I care" questions, in plain language, with curated external resources (YouTube videos, articles) so a complete beginner can self-onboard.

## Scope — IN

1. **New surface: `/start-here/foundations/`** — a dedicated page sitting between the homepage and `/start-here/day-1/` in the onboarding journey order. AgentNews-aesthetic shell (consistent with the rest of the hub).
2. **6 foundational explainer sections**, each one written in project tone (opinionated, plainspoken, "what I wish I knew a year ago"):
   - **F1 — What is Claude Code?** What the tool actually is. Why it exists. What problem it solves.
   - **F2 — Claude Code vs Claude.ai vs Anthropic API vs ChatGPT/Gemini/Grok** — the disambiguation map. Compare side-by-side.
   - **F3 — What is an LLM?** The foundation under all of this. Pre-trained, predicts next token, doesn't think.
   - **F4 — Context windows — why memory has a limit** — the most consequential mental model. Why hallucinations spike on long sessions.
   - **F5 — Agent vs chatbot — what changes when an LLM can use tools** — why Claude Code (agent) is different from Claude.ai (chatbot).
   - **F6 — Why Claude Code specifically?** Compared to Cursor, Cline, Aider, Codex CLI. Honest trade-offs.
3. **Curated external-resources section per topic** — for each F1–F6, surface 1-3 hand-picked YouTube videos / articles / Anthropic docs that explain the concept better than we ever could. With author, duration, and a one-line "why watch".
4. **New glossary entries** for the foundational terms we reference but don't already have:
   - `large-language-model` (LLM)
   - `token` (the unit, not auth)
   - `hallucination`
   - `agent` (vs chatbot)
   - `prompt`
   - `system-prompt`
   - `tool-use` (how an LLM uses external tools)
   - `claude-vs-chatgpt-vs-gemini` (the disambiguation as a glossary entry)
5. **Cross-linking** — every existing reference to "Claude Code", "context window", "agent", etc. across the hub anchors-to the new glossary entry or foundations section.
6. **Update the onboarding sidebar order** in `astro.config.mjs` — Foundations comes before Day 1 in the Start Here group.
7. **Update the homepage** — Start Here CTA section adds the Foundations path before Day 1, with framing "start here if you've never used Claude Code before."

## Scope — OUT

- Greek-language content (deferred — same as prior SCOPE)
- Video hosting (we link to existing YouTube videos; we don't upload anything)
- Interactive embeddings / quizzes / branching paths
- A separate "Foundations" pillar at the top-level nav — fits cleanly under `/start-here/`, no need for nav restructure
- Login-gating any of this content — same anonymous-accessible model as the rest of the hub
- Rewriting Day 1's existing 6 steps — Foundations is a *prepend*, not a replacement
- Tone deviation — must still be "what I wish I knew a year ago." No marketing voice, no AI-slop hedging

## Acceptance Criteria

- **AC1** `/start-here/foundations/` route exists and renders. Verification: `curl localhost:4322/start-here/foundations/` returns HTTP 200.
- **AC2** The page contains 6 distinct `<section class="section">` blocks with `id="f1"` through `id="f6"`. Verification: DOM grep on built HTML.
- **AC3** Each of F1-F6 has a body paragraph in project tone (≥ 100 words plain-language explainer, NOT marketing copy). Verification: visual review checklist.
- **AC4** Each of F1-F6 has a "Watch / read" subsection with ≥ 1 curated external resource. Each resource shows: title, author/channel, duration (for video), URL, and a one-line "why watch/read". Verification: DOM grep for resource cards.
- **AC5** Section F2 contains a comparison table or side-by-side block contrasting Claude Code / Claude.ai / Anthropic API / ChatGPT / Gemini / Grok across at least 4 dimensions (what it is, how you use it, who pays, when to reach for it). Verification: DOM grep for `<table>` or `.compare` block.
- **AC6** At least 6 new glossary entries land in `/glossary/`: `large-language-model`, `token`, `hallucination`, `agent`, `prompt`, `tool-use`. Verification: `ls glossary/*.md` count + visit each anchor.
- **AC7** Glossary frontmatter follows the existing 10-key contract — `type: glossary`, `audience: beginner`, `topics: [...]`, etc. Verification: `node pipeline/dist/cli.js validate glossary/*.md` (or equivalent) clean.
- **AC8** Sidebar in `astro.config.mjs` Start Here group: `Foundations → Day 1 → Week 1` order. Verification: `grep -A8 "Start Here" astro.config.mjs`.
- **AC9** Homepage Start Here CTA section gains a Foundations card before Day 1. Verification: DOM grep on `/`.
- **AC10** All curated external resources have been hand-verified to exist (HTTP 200) and the title/author are accurate. Verification: link-check list in the verification report.
- **AC11** AgentNews aesthetic preserved — page uses `.hero`, `.section`, `.wrap`, `.grid-3`, `.card`, `.tag`, `.eyebrow`, `.feature` classes only. Zero new layout classes. Verification: grep for unknown class names.
- **AC12** Tests still green — `npm test` reports ≥ 237 passing (prior baseline). Verification: vitest run log.
- **AC13** Build still green — `npm run build` exits 0. Verification: stdout.
- **AC14** Reduced motion + dark mode work on the new page. Verification: visual gate at both themes.
- **AC15** SCOPE.md "Content at a glance" updated to reflect the new Foundations entry count + glossary growth (15 → 21+). `node scripts/sync-doc-counts.mjs` keeps it honest.

## Assumptions

- **A1** New surface is a `.astro` page under `site/src/pages/start-here/foundations.astro`, sibling to `day-1.astro`/`week-1.astro`. **LOCKED.**
- **A2** Content lives partly inline in the `.astro` page (the explainer copy) and partly in `journeys/foundations.md` (so the same content can later be consumed by the `/hub-onboard foundations` plugin command). **LOCKED.**
- **A3** Glossary entries are new files under `glossary/<term>.md` following the existing schema. **LOCKED.**
- **A4** Curated external resources are linked OUT to YouTube / Anthropic docs / quality blogs. We do NOT embed video players (no `<iframe>` — avoids the GDPR/cookies path, keeps the page fast). We link out with rich card UI showing thumbnail-style art-block (using AgentNews `.card__art--placeholder` gradient) + title + author + duration + "why watch".
- **A5** Comparison table for Claude Code vs alternatives is a real HTML `<table>` with token-driven styling, not a grid hack.
- **A6** Resources are curated by research — we WebSearch + WebFetch to find candidates, pick the best 1-3 per topic by editorial judgement (popularity, recency, quality of explanation, fit with the project's "what I wish I knew" tone), and record source + verification status in the verification report.
- **A7** No external tracking / analytics / video player JS. Page stays at the existing performance posture.
- **A8** Newcomer / Greek-banking-colleague audience is the target. "Audience" frontmatter tags = `beginner`. Tone = plain language, no jargon without immediate plain-language definition.
- **A9** Greek-language version is deferred (consistent with existing SCOPE).
- **A10** This work is additive — no existing surfaces are restructured beyond the additions described.

## Definition of Done

1. **Surface exists** at `/start-here/foundations/`, renders at localhost:4322
2. **6 explainer sections** with copy in project tone, ≥100 words each
3. **≥ 12 curated resources** (≥ 2 per section average) — each verified live
4. **6 new glossary terms** — schema-clean, audience=beginner, topics tagged
5. **Sidebar updated** — Foundations comes first in Start Here
6. **Homepage updated** — Foundations card in the Start Here CTA section
7. **Cross-links wired** — at least 10 in-hub references point to the new glossary anchors
8. **Build green** — `npm run build` exit 0
9. **Tests green** — `npm test` ≥ 237 passing
10. **Visual gate** — page reviewed at `localhost:4322/start-here/foundations/` in light + dark modes, on desktop + mobile widths

## Open questions surfaced (resolved with defaults per "in doubt, recommendation" directive)

- **Resource count target per topic** — defaulting to 1-3 (curated, not exhaustive). A single excellent resource is better than five mediocre ones.
- **Resource medium balance** — defaulting to ≥ 50% video (YouTube), rest articles + Anthropic docs. Video carries the conceptual material better for absolute beginners.
- **Foundations as 6th pillar?** — no. Foundations stays inside `/start-here/`. The five existing pillars are unchanged. (Per refined-spec scope-out.)
- **Plugin parity** — `/hub-onboard foundations` should work after this lands. Achieved by storing the body content in `journeys/foundations.md` (same loader path as `journeys/day-1.md`). Plugin work itself is deferred to a follow-up — for now, the foundation content is just *consumable* by the existing plugin pattern.
