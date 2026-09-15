---
description: Audit and clean the four project state files (SCOPE.md, DECISIONS.md, Issues - Pending Items.md, CLAUDE.md). Checks size, accuracy, staleness; proposes edits; applies after confirmation.
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

You are auditing the four project state files for this repo. The goal is to keep them **clean** (compact), **updated** (current), and **relevant** (accurate vs the codebase). The CLAUDE.md `## Doc hygiene — keep state files short` section is the authoritative rule set — read it before doing anything else.

## Files in scope (and nothing else)

- `SCOPE.md` — current truth snapshot; rewrite `Last updated`, never append "Prior" blocks
- `DECISIONS.md` — append-only, but tight (≤20 lines per entry)
- `Issues - Pending Items.md` — 3-4 lines per item; Completed is a one-line archive
- `CLAUDE.md` — wiring + standing rules only

Do not touch any other file unless an audit finding explicitly requires it (e.g., regenerating an AUTO block).

## Phase 1 — Mechanical checks (no edits yet)

Run these in parallel where possible. Report findings as a tight bullet list, do not narrate the process.

1. **Size.** Run `wc -c SCOPE.md DECISIONS.md "Issues - Pending Items.md" CLAUDE.md`. Flag any file >40k chars (hard) or above its CLAUDE.md target (soft):
   - SCOPE.md target ≤20k
   - DECISIONS.md target ≤35k (each entry ≤20 lines)
   - Issues ≤12k
   - CLAUDE.md ≤15k

2. **AUTO-block drift.** Run `node scripts/sync-doc-counts.mjs --check` (or equivalent — inspect the script if the `--check` flag isn't there; if not present, run a regen + diff). Any drift between in-file AUTO blocks and the filesystem reality is a finding.

3. **Stale claims — file refs.** For each `\`path/to/file\`` or `\`pipeline/src/X.ts\`` style reference in the four state files, verify the file exists. List the dead refs.

4. **Stale claims — Issues.** In `Issues - Pending Items.md`, find any item in the **Pending** section whose body contains "moot", "resolved", "completed", "no longer", "removed", or "done" — those belong in the Completed archive.

5. **Stale claims — SCOPE.md `Last updated`.** Parse the date on the `**Last updated:**` line. If it's more than 7 days behind today, flag (the snapshot is stale or no work was logged).

6. **DECISIONS.md per-entry size.** Count lines between consecutive `## ` headings. Any entry >25 lines is a hygiene-rule violation. List which ones.

7. **CLAUDE.md tree counts vs AUTO block.** The repo-layout tree at the top of CLAUDE.md may carry inline counts (e.g., "9 entries"). If any contradicts the AUTO block below, flag.

## Phase 2 — Report

Output a single markdown block to the operator with this structure (use only the sections that have findings):

```
# State-doc audit — <today>

## Sizes
<bullet per file: name, size, status (OK / soft over / hard over)>

## Drift (AUTO block)
<bullet per drift, or "none">

## Dead references
<bullet per ref + file:line>

## Stale Issues (in Pending, look resolved)
<bullet per item with one-line reason>

## DECISIONS entries exceeding 25 lines
<bullet per entry: date — title — N lines>

## Other findings
<anything else>
```

Then ask the operator: **"Apply mechanical fixes (move resolved Issues to archive, regenerate AUTO blocks, fix dead refs where unambiguous)? Compress oversized DECISIONS entries? Both? Neither?"**

Do not act yet.

## Phase 3 — Apply (only on operator go-ahead)

For each category the operator confirmed:

- **Mechanical fixes** — safe to apply directly:
  - Regenerate AUTO blocks via `node scripts/sync-doc-counts.mjs`
  - Move clearly-resolved Issues from Pending to the Completed archive (one-line format)
  - Fix dead refs only when the new path is unambiguous (e.g., file was renamed and the new name is obvious from `git log --follow`)
  - Rewrite SCOPE.md `Last updated` line if stale and the operator wants today's snapshot

- **Compression** — judgement required:
  - For each oversized DECISIONS entry, show a tight rewrite (target ≤20 lines), ask before replacing
  - If SCOPE.md `Last updated` has accumulated "Prior" blocks again, collapse them and write the long-form session narrative into a new `docs/reference/session-<YYYY-MM-DD>.md` if any of it is worth preserving — link from the snapshot line

When done, report the size delta per file and a single-sentence summary. No commit unless the operator asks.

## Non-goals

- Do **not** touch git state, do not commit, do not push.
- Do **not** make subjective "this decision was wrong" rewrites of DECISIONS entries. Compress prose; preserve substance.
- Do **not** invent file references or insert links to docs that don't exist.
- Do **not** rewrite content under `glossary/`, `tips/`, `skills/`, `journeys/`, `news/`, `docs/` — only the four state files.

## When to invoke

Operator runs this command:
- Before sharing the repo or demo
- Weekly, as a hygiene pass
- When a Claude turn warns about file size (the existing Stop hook doesn't fire on size yet — surface that to operator if it'd help)
- After any session that obviously appended a lot to the state files
