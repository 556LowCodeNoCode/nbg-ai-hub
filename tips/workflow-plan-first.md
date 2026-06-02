---
type: tip
title: Plan first, then execute — the workflow that pays for itself
audience: both
topics: [workflow]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: https://code.claude.com/docs/en/common-workflows
deeper_link: null
ai_summary: The single biggest mistake newcomers make is letting Claude jump straight into coding. Use plan mode to align on the approach first; the code you don't have to undo is the cheapest code you'll ever write.
---

Letting Claude jump straight to "fix it" feels fast. It isn't. A typical change involves a dozen small judgement calls — which file, which function, what shape the fix takes. Assume Claude gets 80% of those right. After 20 of them, the chance every single decision was correct is roughly **1%**. The other 99% of the time you're reviewing a diff that solves slightly the wrong problem.

The fix is mechanical: **separate planning from execution.**

The rhythm:

1. **Press `Shift+Tab` until you're in plan mode.** Claude can read files and propose, but can't change anything. (See the *Permission modes* tip if Shift+Tab is new to you.)
2. **State the task.** Use the briefing template if it's non-trivial. Claude explores the codebase, asks clarifying questions, and proposes a plan.
3. **Push back on the plan.** This is the cheapest review you'll ever do — no diffs, no rollback. "Skip step 3, that file is dead." "Use the existing `lib/auth.ts` instead of writing a new one."
4. **`Shift+Tab` to `auto-accept edits` once you trust the plan.** Claude executes; you scan the diffs as they fly past. Shell commands still pause for approval.

Two patterns that compound the value:

- **Two Claudes, one plan.** Have one Claude draft the plan in plan mode. In a second terminal, paste the plan into a fresh Claude with: "Review this as a staff engineer. What does the author not see?" Read both. Then execute.
- **Ask for the plan as a list.** "Give me the plan as a numbered list with one line per step." Easier to push back on a list than on three paragraphs.

When to skip planning: trivial mechanical work (one-line rename, format fix, copy-edit). Anything that touches more than one file or one function is worth a plan — even a 30-second one.

The cost of pausing to plan is near-zero. The cost of unwinding 200 lines of wrong code is hours. The math is not subtle.
