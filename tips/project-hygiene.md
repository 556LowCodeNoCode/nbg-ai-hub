---
type: tip
title: Keep CLAUDE.md clean and your project tidy — why Claude hallucinates without project hygiene
audience: beginner
topics: [context, safety]
internal: false
authored: "2026-05-27"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: When Claude starts making things up, the bug is almost always in your project, not the model. Stale CLAUDE.md sections, leftover scratch files, orphaned READMEs — Claude reads everything and the noise leaks into its answers.
---

When Claude starts confidently citing functions that don't exist, paths that were deleted last month, or rules from a stack you migrated away from — the bug is rarely in the model. It's in your project.

Claude reads *everything* it can see in your folder: CLAUDE.md, README, every markdown file you forgot was there, every `.bak` you left lying around, every commented-out block of old code. It doesn't know what's load-bearing and what's stale. So if you keep three drafts of the same architecture doc, two of which are wrong, Claude is going to confidently cite the wrong one half the time. That's not hallucination — that's exactly what you'd expect from a careful reader given contradictory inputs.

The fix is project hygiene, and it pays for itself in the first afternoon:

- **CLAUDE.md stays short — a page or so.** There's a real ceiling on how many instructions get followed reliably, and it's lower than most people's files. A long file doesn't mean more rules obeyed; it means the important ones compete with the filler. If you're onto a third page, you're explaining things Claude could work out from the code. Cut it. CLAUDE.md is for non-obvious rules and conventions, not project history. (For how to *phrase* the rules so they're followable at all, see the write-rules-for-the-agent tip.)
- **No stale scratch files at the repo root.** `scratch.md`, `notes-from-meeting.md`, `tmp.py`, `wip-old.ts` — Claude reads them. If they're not load-bearing, delete them. If they are, put them somewhere structured (e.g. `docs/`) and reference them from the CLAUDE.md.
- **Old READMEs get rewritten, not appended.** If the project changed direction six months ago, the README should say what the project does *now*. Don't keep two paragraphs that describe a feature you killed.
- **Dead code gets deleted, not commented out.** Modern git remembers everything. Commented-out blocks just confuse readers (Claude included) about whether the code is "off" or "removed".
- **One source of truth per fact.** If the deployment command lives in CLAUDE.md, the README, and a tip file, all three will drift apart. Pick one canonical place and link to it from the others.

A useful diagnostic: when Claude says something wrong, ask "where in this folder would someone read that?" and go look. If you find the misleading content, you've found the bug. Delete or rewrite it. Next session is cleaner.

This isn't about being tidy for its own sake. It's about respecting the fact that Claude treats your project as the ground truth. Garbage in, garbage out applies in both directions.

## Make the audit somebody else's job

The tedious part is re-reading your own files looking for things that have quietly gone stale. Hand it over:

> Read `CLAUDE.md` and the README, then check them against the actual codebase. Which statements refer to files, folders, commands, or tools that don't exist any more?

Two minutes for Claude, and it finds the line about the folder you renamed in March that's been silently misleading every session since.

Claude Code also ships a setup-level version of this — **`/doctor`** checks the health of your installation and can fix what it finds, including trimming a bloated CLAUDE.md. Worth running every couple of months.
