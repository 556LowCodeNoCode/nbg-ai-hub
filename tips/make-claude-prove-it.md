---
type: tip
title: Don't check Claude's work by hand — make it prove it
audience: beginner
topics: [safety, workflow]
internal: false
authored: "2026-06-11"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: The strongest verification habit in the hub — after Claude produces an output, ask it to verify its own work with real commands (grep the quotes, recompute the sums, re-run the logic) and show you the output. Commands either pass or fail; assurances always pass.
---

After Claude produces anything — a report, a CSV, a summary, a SQL query — your instinct is to check it by eye. Better instinct: **make Claude check it with commands, and show you the output.**

> Verify your own report: every quote must appear as an exact substring of the source file — check each one with `grep` and show me the result. The counts must sum to the row count. Recompute the percentages. Fix anything that fails and re-run.

Why this works when "are you sure?" doesn't: a command either passes or fails. `grep` finds the exact quote or it doesn't. Arithmetic sums or it doesn't. There's no "looks fine to me" in the loop — which is exactly the failure mode of asking a model to *reassure* you instead of *prove* it.

The shapes to reuse:

- **Quotes** → `grep -F` each one against the source file.
- **Numbers** → recompute independently from the raw data, compare.
- **Logic** (SQL, formulas) → build a tiny test dataset with known edge cases and *run it*. Don't review logic; execute it.
- **Claims** → for each one, quote the exact source sentence that supports it. No quote, no claim.

One more step and it's permanent: put the verification step in the folder's `CLAUDE.md`, so Claude runs it before declaring any output done — you can't forget what you've automated.

This is the habit that turns "I think the AI got it right" into "here's the command output that shows it did" — which is the sentence your boss actually wants to hear.

## Four rungs, in order of how hard they are to skip

The prompt above is rung one. There are three more, and each is harder to forget than the last:

1. **Ask for the check in the same prompt.** Costs nothing, works immediately, relies on you remembering.
2. **`/goal`** — *"Set a goal Claude checks before stopping."* The condition gets re-checked before the turn ends, rather than depending on your prompt wording.
3. **A stop hook** — a script that runs when Claude tries to finish and blocks it until the check passes. Now it's mechanical: Claude physically can't declare done while the tests fail.
4. **A reviewer with fresh eyes** — a separate session, given the output and no history, asked to find what's wrong. See the review-in-a-fresh-session tip.

You don't need all four. You need one higher than "I'll remember to ask" for anything that matters, because you won't.

## You don't have to write the hook by hand — ask Claude

Rung three sounds like the intimidating one. It isn't, because you don't have to learn the config format:

> Add a stop hook to this project that runs `npm test` and blocks you from finishing the turn if it fails.

Claude writes the hook config, shows you the diff, and you stay in the "describe the outcome" lane. See the workflow-hooks-vs-claudemd tip for when a hook is the right tool.
