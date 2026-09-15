# NbgAiHub

A curated **Claude Code knowledge hub for bank colleagues**, framed around *"what I wish I knew a year ago."*

**Live site:** <https://556lowcodenocode.github.io/NbgAiHub/>

> Forks publish at `https://<your-org>.github.io/NbgAiHub/` — the GitHub Pages workflow reads the org name from the deploy context, so a fork just needs Pages enabled (Settings → Pages → Source: *GitHub Actions*).

---

## What's actually in use

- **Website** (Astro Starlight, deployed to GitHub Pages) — the primary surface. Sidebar pillars: **Foundations, Day 1, Use Cases, Tips, Skills, Glossary, My Pins**. Linear/Vercel/Stripe-influenced design system on top of portable primitives and a three-tier token system.

- **News tab → external redirect.** The hub's *News ↗* nav link points at <https://the-agent-daily.org/>. The full RSS triage pipeline (daily Action, Azure OpenAI scoring, auto-publish, 7-day window) is still in the repo under `pipeline/` + `.github/workflows/rss-triage.yml` and remains operational, but the **on-site `/news/` listing is no longer the consumption surface** — readers are sent to AgentNews instead.

- **Per-user pins** — paste a `gist`-scope GitHub token, pin any skill / tip / glossary entry, and the favourites land in your own unlisted gist (`nbgaihub-favorites.json`). The `/my-pins/` page renders them. Zero server infrastructure.

- **Claude Code plugin (`/hub-*`)** — installable with `/plugin marketplace add 556LowCodeNoCode/NbgAiHub`. Eleven commands bring the hub *inside* Claude Code: search, pillar browse, glossary lookup, onboarding journeys, skill install, content refresh, browser deep-linking.

- **CI validator for skill PRs** — `pipeline/src/validators/skill.ts` enforces the 17-rule frontmatter contract on `skills/**/*.md` PRs and annotates failures inline.

---

## Content base

| Pillar | Files |
|---|---|
| Glossary | 45 |
| Tips | 28 |
| Skills | 6 |
| Use Cases | 12 |
| Journeys | 2 |
| News (archive, unsurfaced on site) | 59 |

Counts are kept honest by `node scripts/sync-doc-counts.mjs` + a docs-drift CI check.

---

## Repo shape (short version)

```
site/        Astro Starlight web UI (the live site)
pipeline/    RSS triage + skill validator (TypeScript, Node 22)
plugin/      Claude Code plugin (/hub-* commands)
glossary/ tips/ skills/ use cases/ journeys/ news/published/   Markdown content
.claude-plugin/marketplace.json   Plugin marketplace manifest
.github/workflows/                Daily news cron + skill-PR validator + Pages deploy
```

Full layout, working rules, and design-system contract live in [`CLAUDE.md`](CLAUDE.md) and [`SCOPE.md`](SCOPE.md). Decision history is append-only in [`DECISIONS.md`](DECISIONS.md).
