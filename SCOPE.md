# NbgAiHub — Scope

**Last updated:** 2026-05-18 (Astro Starlight site built + serving locally; pipeline rounds 2-3 of triage tightening + feed list pivot)

## Vision

A curated Claude Code knowledge hub for bank colleagues — a one-stop shop combining skills catalog, tips & tricks, curated news, onboarding journeys, and a shared vocabulary. Tone: *"what I wish I knew a year ago."* The hub compresses newcomers' time-to-confidence, leveraging the ~6 months of head start the AI unit has over the rest of the organization on Claude Code.

## Audience

- **Primary:** Bank colleagues new to Claude Code (joining over the next 6–12 months)
- **Secondary:** Existing intermediate users hunting for tips, news, or new skills

## Repo & hosting

- **Repo:** `github.com/chomovazuzana/NbgAiHub` (personal account, bootstrap mode)
- **Visibility:** **private** (per user override; supersedes prior public decision — see DECISIONS.md)
- **Hosting:** **OPEN QUESTION** — private Pages on personal account requires GitHub Pro ($4/mo). Alternatives: Vercel free, Netlify free, Cloudflare Pages free (all support private GitHub repos as source). Site is serving via local dev server (`npm run dev`) for now; production hosting deferred until first stakeholder demo demands it.
- **Content rule:** since repo is private, team-internal content is permissible — but the repo lives under a *personal* account, not bank-managed infrastructure. Bank-confidential material should still go through compliance review before being stored here.
- **Migration path:** transfer to team org and switch to GitHub Team if the project graduates from personal bootstrap.

## The hub at a glance

**Five user-facing pillars** (each consumed differently; all share one content shape):

| # | Pillar | What it offers | Consumption pattern | Status |
|---|---|---|---|---|
| 1 | **Skills catalog** | Discovery layer over installable plugins (internal + external) | Browse → install via plugin marketplace | site page exists; catalog empty |
| 2 | **Tips & Tricks** | Patterns, prompts, gotchas, workflow recipes | Read & apply manually | site page exists; content empty |
| 3 | **News** | Curated tech news, AI-triaged from RSS feeds at build-time | Skim weekly | **✅ pipeline operational; site reads `/news/published/` via glob loader** |
| 4 | **Curated journeys** | Day 1, Week 1, by-role onboarding paths | Follow step-by-step | Day 1 page placeholder rendered; content TBD |
| 5 | **Glossary + Reference** | Term definitions (hybrid page + anchor links) + cheatsheet | Lookup as needed | **✅ 5 seeded glossary terms (claudemd, mcp, skill, plugin, agent); reference page placeholder** |

**Cross-cutting substrate** (the same plumbing serves all five pillars):

- **GitHub repo as CMS** — markdown + frontmatter, PR workflow for everything ✅
- **Astro Starlight web UI** — **✅ built; Astro 6.3.5 + Starlight 0.39.2; 10 pages render; serving at `localhost:4321`; production hosting deferred**
- **Hub-as-skill plugin** — one command installs the hub into Claude Code; exposes `/hub-*` commands *(not yet scaffolded)*
- **Shared content shape** — 13-key frontmatter schema for news (added `editor_confidence`); 10-key base for skills/tips/glossary/journeys ✅
- **AI strategy** — build-time RSS triage via Azure OpenAI; runtime AI lives in the user's Claude session via the skill; **no AI on the website**
- **Complementary to the Onboarding guide** at `556lowcodenocode.github.io/Onboarding` — the hub deep-links into it, does not duplicate it

## MVP scope — IN

| Item | Status |
|---|---|
| **One curated Day 1 journey** — 6-step path: install → first session → survival keys (incl. `Esc Esc`) → CLAUDE.md (global + project) → skills & team marketplace → where to go next | **Page rendered (placeholder); 6-step content TBD** |
| **~10 Tips & Tricks entries** | site page exists; content TBD |
| **~5 Skills catalog entries** — internal + external, description + install link | site page exists; catalog TBD |
| **~10 Glossary terms** — CLAUDE.md, MCP, skill, plugin, agent, hook, GSD, build-time vs runtime, etc. | **5/10 seeded** (claudemd, mcp, skill, plugin, agent); 5 more TBD |
| **RSS curation pipeline** — daily GH Action: fetch feeds → Azure OpenAI triage → `/news/incoming` → PR → editorial review → promote to `/news/published` | **✅ BUILT & OPERATIONAL** — 93/93 tests pass (after triage tightening); live runs producing daily PRs. Spec: `docs/refined-requests/rss-pipeline.md`. Verification: `docs/reference/integration-verification-rss-pipeline.md`. |
| **Astro Starlight static site** with beginner/advanced filter | **✅ BUILT** — Astro 6.3.5 + Starlight 0.39.2, 10 pages (Home, Start Here→Day 1/Week 1, News, Skills, Tips, Glossary, Reference, Contribute, 404), 7 components (HomeHero, NewsPanel, NewsList, AudienceBadge, SkillCard, AudienceFilter + bonus ConfidenceChip), Pagefind search, dark theme default. Spec: `docs/refined-requests/astro-starlight-site.md`. Verification: `docs/reference/integration-verification-astro-site.md`. Hosting open. |
| **Hub-as-skill plugin** — `/hub`, `/hub-search`, `/hub-news`, `/hub-tips`, `/hub-skills`, `/hub-onboard <journey>` | not started |
| **Hybrid glossary** — canonical `/glossary` page + inline anchor links | **✅ page renders with 5 anchored terms; pattern proven** |
| **Public/private gating** — `internal: true|false` frontmatter | schema defined; in use by pipeline + site |

## Deferred — LATER

- Week 1 / by-role curated journeys (backend dev, data scientist, ML engineer, etc.)
- Full-text or semantic search across content (currently Pagefind covers full-text; semantic deferred)
- Greek-language content
- Authentication / SSO for gated content
- Community contributions (PRs from outside the team)
- Analytics on what newcomers click
- Expanded news sources beyond the initial five
- Hero image extraction for news items (RSS thumbnail + og:image fallback) — `hero_image` field reserved in site schema (optional) for forward compat
- War stories / post-mortem pillar (6th pillar candidate)
- Migration to team org if/when bank-specific gated content becomes needed
- Site production hosting (Pro Pages / Vercel / Netlify / Cloudflare)
- Cosmetic refactor of Zod 4 deprecations in `site/src/content.config.ts` (`z.string().url()` → `z.url()`)

## Out of scope — NO

- Live chat or forum
- Per-user personalization or bookmarking
- Hosting user-generated content
- Marketing-style branding
- Live chatbot widget on the website (the Claude skill IS the chatbot)
- Client-side embeddings or semantic search backend
- Bank-confidential content in this repo (structural constraint of personal account)

## Open questions

For full RSS pipeline context, see refined request: `docs/refined-requests/rss-pipeline.md`. For the site, see `docs/refined-requests/astro-starlight-site.md`.

- **Hosting:** GitHub Pages via Pro, Vercel/Netlify/Cloudflare free tier, or defer hosting until MVP content exists?
- **Proof-of-life user:** which specific newcomer joining in the next 4–8 weeks anchors the MVP deadline?
- **Skill distribution:** standalone marketplace at `chomovazuzana/NbgAiHub` or also list in `556LowCodeNoCode/Skills`?
- **RSS source list — live in production with 5 feeds, two source groups** (revisable in `config/rss-sources.json` without code change). Source-group routing in `pipeline/src/triage.ts` SYSTEM_PROMPT:
  - **Reddit group** (strict — 4 ACCEPT categories: tips/tricks, field reports, platform news, professional/enterprise):
    1. r/ClaudeAI — `https://www.reddit.com/r/ClaudeAI/.rss`
    2. r/ClaudeCode — `https://www.reddit.com/r/ClaudeCode/.rss`
  - **Major tech/AI news group** (professional news + breakthrough AI only):
    3. Hacker News frontpage — `https://hnrss.org/frontpage` *(unfiltered; replaced earlier Claude-keyword variant on 2026-05-18)*
    4. Wired AI — `https://www.wired.com/feed/tag/ai/latest/rss`
    5. The Verge — `https://www.theverge.com/rss/index.xml` *(full firehose; LLM filters the non-AI noise)*
  - **Dropped feeds** (2026-05-18, by user direction): Anthropic news (RSS feed deleted by Anthropic — returned 404), Claude Code GitHub releases (`releases.atom`), Simon Willison's blog. The latter two are easy to re-add if signal loss is felt.
- **Editorial cadence:** daily Action at **05:00 UTC = 08:00 Europe/Athens (DST) / 07:00 (winter)** + ad-hoc PR review (current). Weekly summary PR or twice-weekly cron remain open alternatives. Cron lives at `.github/workflows/rss-triage.yml` line 8 — one-line YAML change to flip.
- **News storage model:** per-item permanent (current — files accumulate forever) vs rolling N-day window vs hybrid (storage permanent + UI filters)? Currently per-item permanent; site reads via glob loader and renders chronologically.
- **News item hero image:** add `hero_image` frontmatter field, extracted from RSS thumbnail + og:image fallback? Deferred but small to implement. Site schema already accepts `hero_image` as optional (forward compat).

## Demo-ability checklist (manager review)

- [x] **Site renders locally** — `cd site && npm run dev` → `http://localhost:4321` returns 200; homepage shows hero + tagline; all 9 sidebar entries clickable
- [ ] Day 1 journey page populated with all 6 steps + deep-links into the Onboarding guide *(page renders; content placeholder)*
- [ ] At least 1 skill entry, 1 tip visible
- [x] **At least 5 glossary terms visible** *(5/10 seeded)*
- [x] At least 1 news item visible *(43 items in PR #1 on 2026-05-18; need PR merge to surface in `news/published/`)*
- [x] **Beginner/Advanced/Both filter wired** *(AudienceFilter component built, `localStorage.nbgaihub.audience` persistence; visible no-op until news populated)*
- [ ] `/hub` commands work from a fresh Claude Code install *(plugin not yet scaffolded)*
- [x] **One full end-to-end RSS pipeline run completed** *(run `26047997638`, 2m46s, PR #1, then PR #2/#3 with tightened triage)*
- [ ] Hub installable as a plugin (`/plugin marketplace add chomovazuzana/NbgAiHub`) in one command
- [x] **SCOPE.md + DECISIONS.md tell the story of how we got here** *(this file + 20+ DECISIONS entries through 2026-05-18)*
