# Tool — `skill-validator`

Documented per the global CLAUDE.md `docs/tools/<name>.md` convention. Tool implementations are TypeScript per the same global rule.

---

## Tool name

`skill-validator`

## Purpose

CI validator that enforces the 17-rule skill frontmatter contract on every pull request that touches `skills/**/*.md`. Runs as a GitHub Action job and surfaces failures as `::error` annotations inline on the PR diff, so contributors (anonymous community submitters via `/submit-skill/`, or maintainers editing existing entries) see exactly which field on which file violated which rule before the PR can be merged.

The same 17 rules are duplicated on the client side inside `site/src/lib/submission.ts` so the `/submit-skill/` form catches most errors before the user even submits — the CI run is the authoritative re-check at merge time.

## Entry point

- **Compiled:** `pipeline/dist/validators/cli.js` (invoked by the GitHub Action workflow).
- **Source:** `pipeline/src/validators/cli.ts`.
- **Invocation:** `node pipeline/dist/validators/cli.js <path1.md> <path2.md> ...`.
- Reads each file's contents via `fs/promises.readFile`, invokes `validateSkillFile(filePath, content, maintainersConfig)`, and prints one `::error` line per issue.

## Source

- `pipeline/src/validators/skill.ts` — the 17-rule validator (`validateSkillFile`, `SkillFrontmatter` type, enum constants).
- `pipeline/src/validators/cli.ts` — Node entry point + GH Actions annotation emitter.
- `pipeline/src/validators/config.ts` — loads `config/maintainers.json` (`loadMaintainers(path)`); throws a named exception if the file is missing or malformed (per global CLAUDE.md "no fallback config" rule).

## Validation rules (17)

Numbering matches the comment markers inside `pipeline/src/validators/skill.ts`:

| # | Rule | Field(s) | Error rule code |
|---|---|---|---|
| 1 | Frontmatter parses; non-empty `data` object. | `frontmatter` | `parse` |
| 2 | All 16 required fields present (`type`, `title`, `audience`, `topics`, `internal`, `authored`, `last_reviewed`, `external_link`, `deeper_link`, `ai_summary`, `install_command`, `skill_id`, `origin`, `category`, `status`, `maintainer`). | each field | `required` |
| 3 | `type` literal equals `"skill"`. | `type` | `literal` |
| 4 | `audience` ∈ `{beginner, advanced, both}`. | `audience` | `enum` |
| 5 | `topics` is a **non-empty** `string[]`. | `topics` | `shape` |
| 6 | `internal` is a `boolean`. | `internal` | `type` |
| 7 | `authored` and `last_reviewed` match `YYYY-MM-DD`. | `authored`, `last_reviewed` | `date-format` |
| 8 | `external_link` is `null` OR a parseable URL; HEAD-reachable. **429 → warn-and-pass** (AC20); other 4xx → fail. | `external_link` | `url`, `url-reachable` |
| 9 | `deeper_link` is `null` OR a parseable URL (no HEAD check). | `deeper_link` | `url` |
| 10 | `ai_summary` is a non-empty string. | `ai_summary` | `non-empty` |
| 11 | `install_command` starts with one of: `/plugin marketplace add ` or `/plugin install `. | `install_command` | `type`, `prefix` |
| 12 | `skill_id` matches `/^[a-z0-9-]+$/`. | `skill_id` | `pattern` |
| 13 | `category` ∈ `{workflow, code, docs, integration, productivity, testing, other}`. | `category` | `enum` |
| 14 | `origin` ∈ `{internal, community, external}`. | `origin` | `enum` |
| 15 | `status` ∈ `{active, experimental, deprecated}`. | `status` | `enum` |
| 16 | `maintainer` matches `^@[a-zA-Z0-9-]+$` OR appears in `config/maintainers.json::team_aliases[]`. | `maintainer` | `type`, `identity` |
| 17 | File basename equals `<skill_id>.md`. | `skill_id` | `path-match` |

Optional rule (always run, not in the count): `requires` (when present) must be a `string[]` — issue rule code `shape`.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | All files valid (or zero files passed — no-op success). |
| 1 | At least one file invalid (the workflow run fails; `::error` annotations show on the PR diff). |
| 2 | Internal error — `cli.ts` caught an unexpected exception (e.g. `config/maintainers.json` missing, gray-matter threw). Stderr carries the underlying error. |

## Error annotation format

```
::error file=<absolute-or-repo-relative-path>,line=1::<field>: <message>
```

GitHub renders this inline next to line 1 of the offending file in the PR diff view. `line=1` is intentional — frontmatter starts at line 1 and we don't compute precise sub-line locations.

Example (`install_command` missing the required prefix):

```
::error file=skills/my-new-skill.md,line=1::install_command: install_command must start with one of: '/plugin marketplace add ' or '/plugin install '
```

## Dependencies

- **`gray-matter`** — frontmatter parser (already a `pipeline/` dependency for the RSS triage path; reused here).
- **Node 22 builtin `fetch`** — used for the `external_link` HEAD-check (rule 8). 10-second timeout via `AbortController`.
- **`config/maintainers.json`** at the repo root — read at startup. Shape: `{"team_aliases": ["@nbg-ai-team", ...]}`. Missing or malformed → exit code 2 with a named exception per global CLAUDE.md "no fallback config" rule.

## Test coverage

`pipeline/tests/validators/skill.test.ts` — 11 tests covering all 17 rules including:

- Happy-path valid skill passes.
- Each required field missing → an issue.
- Each enum violation surfaces the field + the allowed set.
- `install_command` without the required prefix → issue.
- `skill_id` violating the regex → issue.
- `external_link` returning 429 → warn-and-pass (AC20).
- `external_link` returning 404 → fail.
- File basename mismatch against `skill_id` → issue.
- `maintainer` accepting both handle form and team-alias form.

Fixtures live in `pipeline/tests/validators/fixtures/`.

## Invoking workflow

`.github/workflows/validate-skill-submission.yml` — runs on `pull_request` (events: `opened`, `synchronize`, `reopened`) with `paths: ['skills/**/*.md']`. The job:

1. Checks out the PR head.
2. Computes the changed-files list via `git diff --name-only origin/main...HEAD -- 'skills/**/*.md'` (or the GH Actions API; whichever is faster on the runner).
3. Runs `cd pipeline && npm ci && npm run build` (compiles TypeScript to `dist/`).
4. Runs `node pipeline/dist/validators/cli.js <changed-files...>` from the repo root (so the validator finds `config/maintainers.json` at `process.cwd()`).
5. Exit code propagates to the job conclusion. Step output annotations surface as inline errors on the PR diff.

Uses the default `GITHUB_TOKEN`; never writes to the repo. Read-only by design.

## References

- F-P-VAL-1 (functional contract): `docs/design/project-functions.md` → "Personalization & contributions" block.
- F-P18 + F-P19 (refined-request entries): `docs/refined-requests/personalization-and-contributions.md`.
- Design anchor: `docs/design/project-design.md §P.4.14`, `§P.4.15`, `§P.4.16`, `§P.7.3`.
- Plan step: `docs/design/plan-003-personalization-and-contributions.md` Step 9 (validator) + Step 15 (workflow YAML).
