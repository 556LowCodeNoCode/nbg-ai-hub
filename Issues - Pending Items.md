# Issues - Pending Items

Pending items first (most critical at top). Completed items after. Remove fixed entries.

## Pending

9. **Personalization — PAT-paste UX fallback to OAuth App + Cloudflare Worker proxy** (low / follow-up).
   If PAT-paste UX proves clunky for non-technical users, consider migrating to OAuth App + Cloudflare Worker proxy (designed but not built — see `docs/reference/investigation-personalization.md` §1 historical sections; the worker proxy design is documented as an alternative the user rejected on the zero-infrastructure promise). Not a blocker. Revisit only if user feedback specifically calls out PAT friction.

8. **Personalization — Opt-in team-wide aggregate pin stats** (low / future feature).
   If team-wide aggregate stats become desirable (e.g. "most pinned skills"), design an opt-in aggregation that respects the gist's **unlisted-not-private** model. Today the gist is owned by the user; no aggregation surface exists. An opt-in could be a user-pasted gist URL, a project-side allowlist, or a Claude-side `/hub-stats` command that reads each opted-in user's gist. Not a blocker.

7. **Pipeline + Site — Extract shared schema package** (low / refactor).
   Consider extracting a shared schema package between `site/` and `pipeline/` to retire schema duplication (the `slug.ts` copy + the skill frontmatter contract that now lives both in `site/src/content.config.ts` and in `pipeline/src/validators/skill.ts`). Carries over from astro-starlight-site A4. Not a blocker; only worth doing once monorepo tooling lands.

6. **Site — `slug.ts` duplicated from `pipeline/src/slug.ts`** (low / deduplication).
   Per commit `c1df291`, `site/src/lib/slug.ts` is a literal copy of `pipeline/src/slug.ts`, with a drift-test ensuring they stay byte-identical. Deduplicate when monorepo tooling lands (folds into item 7 above). Not a blocker.

5. **Plugin — Manual marketplace-install verification** (medium / pre-release).
   Run `/plugin marketplace add chomovazuzana/NbgAiHub` against a fresh Claude Code session and confirm: (a) marketplace.json resolves with `source: "./plugin"` pointing at the plugin workspace, (b) plugin.json at `plugin/.claude-plugin/plugin.json` is accepted, (c) all 11 commands appear via filesystem discovery from `plugin/commands/`, (d) `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` env vars are set inside the spawned command. Tests at `plugin/tests/manifest.test.ts` cover the parse-time schema; the install-time end-to-end is the remaining gap. Block on this before publishing the marketplace publicly.

4. **Plugin — Confirm by-role journey slug spellings (OQ4)** (low / content-prep).
   Decide canonical slugs for the deferred by-role journeys (`backend` vs `backend-dev`; `data-scientist` vs `data-science`; `ml-engineer` vs `mle`) so that `/hub-onboard <slug>` resolves predictably once content is authored. Slug shapes are also the URL slugs used by `/hub-open <slug>`. Affects content layout in `journeys/`, not plugin code.

3. **Plugin — Flip `devMode: false` in `plugin/config.json` after GH Pages deploy** (low / one-line edit).
   Today the plugin defaults `/hub-open` to `http://localhost:4321` because the site is dev-only. When GH Pages goes live at `https://chomovazuzana.github.io/NbgAiHub`, edit `plugin/config.json::devMode` from `true` to `false`, rebuild, and republish the plugin. No code change required.

2. **Site — Refactor `z.string().url()` → `z.url()` in `content.config.ts`** (low / cosmetic).
   `astro check` flags 4 Zod 4 deprecation hints on the URL validator form at `site/src/content.config.ts:46, 47, 69, 76`. Zod 4 keeps the old form working; no behavioral change. Refactor when convenient (e.g., the next time anyone touches the schema).

1. **Site — Periodic `npm audit fix` for dev-tree** (low / housekeeping).
   `npm audit` reports 5 moderate advisories chained through `@astrojs/check` → `@astrojs/language-server` → `volar-service-yaml` → `yaml-language-server` → `yaml`. All dev-only. `npm audit --omit=dev` is clean. Track upstream `@astrojs/check` releases; re-audit periodically.

## Completed

4. **Site — User-side smoke test of `npm run dev`** ✓ COMPLETED 2026-05-18.
   `cd site && npm run dev` → `HTTP 200 OK` on `http://localhost:4321` in 1.3s. Homepage renders with hero, tagline, two CTAs. Sidebar served with 9 entries (Home, Start Here → Day 1 / Week 1, News, Skills, Tips & Tricks, Glossary, Reference, Contribute). Astro v6.3.5 + Starlight v0.39.2 confirmed. Expected empty-state warnings logged for empty `news/published/`, `skills/`, `tips/` — graceful fallback working (F9). Dev server still running in background; can be stopped with `lsof -i :4321` → `kill <PID>`.

3. **RSS triage tightening — source-aware prompt + editor_confidence** ✓ COMPLETED 2026-05-18.
   Replaced the one-line "relevant to bank colleagues" prompt with explicit per-source rules (Anthropic / Claude Code releases lean permissive; Simon Willison filters to transferable LLM content; HN judges the linked article and rejects "Claude" name collisions; r/ClaudeAI restricted to tips, tricks, and field-report war stories — rejects questions / promo / rants). Added four cross-cutting rules: English only, substance threshold, no retired-model content, when-in-doubt-reject. Added `editor_confidence: "high"|"medium"|"low"` to the triage JSON contract; field is propagated into frontmatter (now 13 keys) and the PR body (`[confidence: <level>]` per bullet) so the editor can skim and focus attention on borderline items. Test suite: 93/93 pass (was 88; +5 new tests). Typecheck clean. See DECISIONS.md → "RSS triage: source-aware prompt + editor_confidence field" for the full rationale, alternatives considered, and cost analysis.

2. **DoD #12 — Live end-to-end run** ✓ COMPLETED 2026-05-18.
   Real workflow_dispatch run `26047997638` on `chomovazuzana/NbgAiHub`, branch `main`, completed in 2m46s with conclusion `success`. PR #1 (`News triage 2026-05-18`) opened automatically with 43 relevant items across 4 of 5 feeds. All operator-side setup (4 Azure secrets, "Allow GH Actions to create/approve PRs" toggle) completed via `gh` CLI. SECRETS.md §3 checklist validated end-to-end. **The pipeline is operational.**

1. **DoD #8 — SCOPE.md cross-reference to refined request** ✓ COMPLETED 2026-05-18.
   `SCOPE.md` → "Open questions" section now contains: *"For full RSS pipeline context, see refined request: `docs/refined-requests/rss-pipeline.md`."* Closes the doc-polish item flagged by Phase 10 integration verifier.
