# NbgAiHub

A curated **Claude Code knowledge hub for bank colleagues**, framed around *"what I wish I knew a year ago."*

Five content pillars: **skills catalog, tips & tricks, curated news, onboarding journeys, glossary**. All content lives as plain markdown in one private GitHub repo — single source of truth.

---

## Three operational pieces, all built

- **Website** (Astro Starlight) — beginner/advanced filter, full-text search, sign-in via personal access token paste so users can pin items and submit skills. Now wrapped in a polished design system (Linear / Vercel / Stripe aesthetic) built on portable primitives and a three-tier token system, with content pages themed through deep CSS overrides.

- **RSS news pipeline** — daily GitHub Action: fetches feeds → Azure OpenAI triage → high-confidence professional-source items auto-publish straight to `main`, lower-confidence ones go through editor review → rolling 7-day window keeps the stream fresh.

- **Claude Code plugin (`/hub-*`)** — installable with one command. Brings the hub *inside* Claude Code: eleven commands covering search, pillar browse, glossary lookup, onboarding journeys, skill install, audience filter, content refresh, and browser deep-linking. No need to leave the terminal.

---

## Mini-workflows in place

- **Anyone adds a skill** — fill in the `/submit-skill/` form on the site → it builds the markdown and redirects to GitHub's "create file" page (clipboard fallback for oversize payloads) → on PR creation, a **CI validator** checks 17 frontmatter rules and annotates the PR with errors → reviewer merges.

- **Anyone favourites a skill / tip / news / glossary entry** — paste a `gist`-scoped GitHub token → click the pin button → favourites are stored in **the user's own unlisted gist** → the `/my-pins/` page lists them. Zero server infrastructure. Same gist readable by the Claude plugin later.

- **News updates automatically** — daily cron triages RSS feeds, auto-publishes high-confidence items straight to the published folder, and prunes anything older than seven days in the same commit. The site picks it up on next build.

- **Newcomer follows Day 1** — lands on the site → walks the six-step Day 1 journey (install → first session → control keys → CLAUDE.md → skills marketplace → next steps) → installs the plugin → continues inside Claude Code via `/hub-onboard day-1`.

- **Plugin user pulls fresh content** — `/hub-refresh` does a shallow `git pull` of the latest snapshot into a per-user cache → next `/hub-*` command reflects new content.

---

## Content base

Seeded across all five pillars — a Day-1 onboarding journey, a working tips library, a skills catalog pointing at the team's existing marketplace, a glossary covering Claude Code / Git / workflow vocabulary, and a flowing daily news stream. Counts stay honest via a docs-drift CI check.

---

## Quality & governance

CI validator enforcing the 17-rule skill contract, automated docs-drift check, append-only decision log, mutable scope file — so the content stays clean and the *"why"* of past choices stays traceable as the hub grows.

---

## What's still open

Production hosting for the website (currently local; Vercel / Netlify / Cloudflare / GitHub Pro on the shortlist), Week-1 and role-specific journeys, the anchor newcomer whose join date sets the MVP demo deadline, and whether to also list the plugin in the central team skills marketplace.

---

**Net effect:** three surfaces (web, automated news, in-terminal Claude plugin) over one curated, PR-gated repo. Newcomers can install the plugin in one line and start exploring — no browser required.
