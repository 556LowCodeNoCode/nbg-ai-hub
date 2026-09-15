# UAT implementation report — 2026-05-27

End-to-end execution of the ★ RECOMMENDED variants from `UAT-analysis-colleagues-2026-05-26.md`. Six waves, all themes addressed. Tests green at the end of every wave. **Nothing committed.** Operator review uncommitted changes before commit.

## Test counts

| Workspace   | Before     | After      | Delta |
|-------------|------------|------------|-------|
| site/       | 310/310    | 310/310    | clean |
| pipeline/   | 205/205    | 205/205    | clean |
| plugin/     | not touched | not touched | n/a   |

(site has 1 skipped pre-existing; not introduced by this run.)
`npx astro check`: 0 errors, 0 warnings, 25 hints (all hints are pre-existing Zod-4 `z.string().url()` deprecations + TypeScript inference hints in unrelated files).

## AUTO doc counts after the run

| Pillar    | Before | After |
|-----------|--------|-------|
| Glossary  | 36     | 44    |
| Tips      | 14     | 18    |
| Skills    | 6      | 6     |
| Journeys  | 2      | 2     |
| News      | 54     | 48    |

(News count changed because the daily cron also ran; not part of this implementation.)

---

## Themes fully shipped

A theme is "fully shipped" only if the affected workspace's tests pass.

| #  | Theme | Variant | Files touched |
|----|-------|---------|---------------|
| 2  | Homepage overwhelming | V1 — drop below-fold Skills/Tips grids | `site/src/pages/index.astro` |
| 3  | No "why am I here?" | V1 — "why we built this" paragraph in hero | `site/src/pages/index.astro` |
| 4  | Examples / case studies missing | V1 — inline CLAUDE.md sample tip + reference from Day 1 | `tips/claudemd-worked-example.md`, `journeys/day-1.md` |
| 15 | Glossary count drift (36 vs 34) | V2 — read collection length at build time | `site/src/pages/start-here/foundations.astro`, `site/src/pages/start-here/day-1.astro` |
| 20 | NBG logo flicker | V1 — confirmed inline theme script in head; added `loading="eager"` / `decoding="sync"` / `fetchpriority="high"` on both logo `<img>` tags | `site/src/components/SplashAwareHeader.astro` (ThemeProvider override was already in place) |
| 8  | Filters + grid view | V1 — chip topic filter above AudienceFilter (skills filters by `category`, tips by `topics`) | new `site/src/components/TopicFilter.astro`, `site/src/pages/tips.astro`, `site/src/pages/skills.astro`, `site/src/styles/listing-rows.css` |
| 9  | News off-site + no About | V1 — new `/about/` page footer-linked | new `site/src/pages/about.astro`, `site/src/pages/index.astro` footer |
| 10 | Pinning UX confusion | V1 — toast notification on pin action | new `site/src/components/Toast.astro`, `site/src/components/MarketingShell.astro`, `site/src/components/PinButton.astro` |
| 1  | Foundations long scroll | V2 — default-collapsed `<details>` accordion per step + Expand-all toggle | `site/src/pages/start-here/foundations.astro` |
| 6  | Tooltip chaos | V1 — cap nested popover depth at 1 (tldrs now plain escaped text inside popovers) | `site/src/components/primitives/GlossaryTerm.astro` |
| 18 | Tech vocab (Docker/Postgres/etc.) | V1 — 5 new glossary entries: docker, postgres, database, container, bash | new `glossary/{docker,postgres,database,container,bash}.md` |
| 5  | Day 1 sequencing + Mac/Win + shell vocab | V1 + V2 + V3 — full rewrite: GitHub moved to Step 2, expanded Windows/WSL section with bank-laptop troubleshooting, 4 new shell-vocab glossary entries (cd, terminal, shell, wsl) (bash was added in T18) | `journeys/day-1.md`, new `glossary/{cd,terminal,shell,wsl}.md`, plus `glossary/shell-commands.md` (alias conflict resolution) |
| 7  | "Why use this" on skills | V1 + V2 — `time_saved` chip + `worked_scenario` block, schema extended (both optional), 3 of 6 skills populated (team / database-schema-designer / deploy) | `site/src/content.config.ts`, `site/src/pages/skills.astro`, `site/src/styles/listing-rows.css`, `skills/{team,database-schema-designer,deploy}.md` |
| 11 | `--dangerously-skip-permissions` framing | V4 + new deep-dive tip — reconciliation callout inline in Day 1 Step 3 + new dedicated tip | `journeys/day-1.md`, new `tips/dangerously-skip-permissions.md` |
| 12 | GitHub-account + bank-email | V1 — expanded Step 2 (was Step 5) wording: bank email pattern, 2FA via bank authenticator, real-name username | `journeys/day-1.md` |
| 14 | Project-hygiene tip | V1 — new tip | new `tips/project-hygiene.md` |
| 16 | Greek-language affordance | V1 + V2 — hero one-liner with link to dedicated tip + new tip with worked Greek prompt example | `site/src/pages/index.astro`, new `tips/prompting-in-greek.md` |

## Themes partially shipped — visual assets

Three themes share the same blocker: I cannot capture real screenshots / asciinema recordings of an interactive Claude Code session or a logged-in github.com page from this environment. Per the operator's explicit hard rule, I produced what I could (CSS/HTML scaffolded slots with annotated callouts that read as authentic visual examples) and logged the missing-asset replacements in `Issues - Pending Items.md`:

| #  | Theme | Variant | Shipped now | Asset still needed | Issues entry |
|----|-------|---------|--------------|-------------------|--------------|
| 13 | Sign-in PAT intimidating | V1 — inline screenshot of GitHub token page in SignInModal | CSS/HTML mock of the token-creation page inside the SignInModal Step 1, with numbered callouts for "Name=NbgAiHub", "Scope=gist", "Click Generate" | Real captured PNG of `github.com/settings/tokens/new?scopes=gist&description=NbgAiHub` from a logged-in session | #23 |
| 17 | Sandbox surface absent | V2 — asciinema terminal sessions on homepage + key tips | New `TerminalDemo.astro` primitive + a 3-frame stylised demo on the homepage (`launch → ask → propose-edit`) | Real asciinema recording (`.cast` JSON + asciinema-player embed) of a 30-60s session | #22 |
| 19 | Visual content absent | V2 — annotated screenshots on Day 1 + key tips | `TerminalDemo` blocks on Day 1 Step 3 (first session) and Step 4 (survival keys: Esc / Esc Esc / `/compact`) with numbered callouts | Real PNG captures of an interactive Claude session, annotated, replacing the `<TerminalDemo>` slots | #21 |

The `<TerminalDemo>` primitive is built so a real recording or PNG can drop straight in — the `<figure>` wrapping + `<figcaption>` stays; only the inner body element swaps. This is the "scaffold the HTML/CSS slot and log the missing asset" path the operator approved.

## New `Issues - Pending Items.md` entries

Three new entries added at the top of `Pending`:

- **#21** Real annotated terminal screenshots on Day 1 Steps 3 + 4 (UAT T19 V2 asset gap).
- **#22** Real asciinema recording on homepage (UAT T17 V2 asset gap).
- **#23** Real GitHub-token-page screenshot for SignInModal Step 1 (UAT T13 V1 asset gap).

Each entry names the current placeholder location, what's still needed, and the replace path.

## Operator review checklist before commit

1. **Visual placeholders** — Open `localhost:4321/` and the SignInModal at `/my-pins/` then click *Sign in*. The CSS-mock GitHub token page in Step 1 of the modal, the homepage TerminalDemo, and the two TerminalDemos on Day 1 Steps 3 + 4 are all stand-ins. If the visual quality is below bar, consider holding the commit and capturing the real assets first (see Issues #21–#23).
2. **T3 V1 wording** — The operator owns the "why we built this hub" paragraph copy per the analysis note. The shipped paragraph on `index.astro` (`hero__why` block) is my draft; rewrite to match your voice before commit if needed.
3. **T6 V1 reversibility** — If anyone misses the "hover-inside-hover" glossary chain, the cap is fully reversible by reverting one line: change `escapeHtmlServer(entry.data.tldr)` back to `linkGlossaryTerms(entry.data.tldr)` at the top of `GlossaryTerm.astro`. The recursive `wire()` infrastructure is preserved.
4. **T7 V1 + V2 schema** — `time_saved` and `worked_scenario` are optional. Three of six skills are populated as a demonstration. The other three (`frontend-design`, `gsd`, `uat-panel`) should get values authored by whoever knows them best.
5. **T8 V1 chip set** — Tips chips are derived from `topics` (excluding the always-on `fundamentals`); skills chips use the `category` enum (since `topics` on skills is sparse). If the chip dimension feels wrong, both pages can swap which field they pass in one line.
6. **T11 deep-dive tip framing** — The new `tips/dangerously-skip-permissions.md` is opinionated ("the NBG AI team's position is…"). If that voice overstates team position, soften before commit.
7. **T15 V2** — Glossary count is now numeric ("44 terms") not spelled-out ("Forty-four terms"). If the spelled-out form mattered, swap with a number-to-words helper.
8. **T20 V1** — The original inline theme script (the most-faithful interpretation of V1) was already in place via the 2026-05-25 ThemeProvider override. I added `loading="eager"` / `decoding="sync"` / `fetchpriority="high"` to both logo `<img>` tags to remove residual image-load timing flicker. Confirm the flicker is gone after a hard refresh on the deployed Pages site.

## Files modified — full list

```
SCOPE.md                                              (auto by sync-doc-counts)
CLAUDE.md                                             (auto by sync-doc-counts)
Issues - Pending Items.md                             (added #21, #22, #23)

site/src/content.config.ts                            (T7 schema)
site/src/pages/index.astro                            (T2, T3, T16, T17)
site/src/pages/about.astro                            (NEW — T9)
site/src/pages/skills.astro                           (T7, T8)
site/src/pages/tips.astro                             (T8)
site/src/pages/start-here/foundations.astro           (T1, T15)
site/src/pages/start-here/day-1.astro                 (T15, T19)
site/src/styles/listing-rows.css                      (T7, T8)
site/src/components/MarketingShell.astro              (T10)
site/src/components/PinButton.astro                   (T10)
site/src/components/SplashAwareHeader.astro           (T20)
site/src/components/SignInModal.astro                 (T13)
site/src/components/TopicFilter.astro                 (NEW — T8)
site/src/components/Toast.astro                       (NEW — T10)
site/src/components/TerminalDemo.astro                (NEW — T17, T19)
site/src/components/primitives/GlossaryTerm.astro     (T6)

journeys/day-1.md                                     (T5 V1 + V3, T11 V4, T12 V1)

skills/team.md                                        (T7)
skills/database-schema-designer.md                    (T7)
skills/deploy.md                                      (T7)

tips/claudemd-worked-example.md                       (NEW — T4)
tips/project-hygiene.md                               (NEW — T14)
tips/prompting-in-greek.md                            (NEW — T16)
tips/dangerously-skip-permissions.md                  (NEW — T11)

glossary/docker.md                                    (NEW — T18)
glossary/postgres.md                                  (NEW — T18)
glossary/database.md                                  (NEW — T18)
glossary/container.md                                 (NEW — T18)
glossary/bash.md                                      (NEW — T18, also T5 V2)
glossary/cd.md                                        (NEW — T5 V2)
glossary/terminal.md                                  (NEW — T5 V2)
glossary/shell.md                                     (NEW — T5 V2)
glossary/wsl.md                                       (NEW — T5 V2)
glossary/shell-commands.md                            (alias conflict resolution)
```

20 markdown content files + 17 source files = 37 files touched. Zero deletions, zero git operations.

## Build-time validation

- `npx astro check` after final wave: **0 errors, 0 warnings, 25 hints** (all hints pre-existing).
- `cd site && npm test`: **310 passing, 1 skipped, 0 failing**.
- `cd pipeline && npm test`: **205 passing, 0 failing**.
- `node scripts/sync-doc-counts.mjs`: clean, in sync.

No regressions detected.

---

**Run completed 2026-05-27 ~18:25 local. Awaiting operator review before commit.**
