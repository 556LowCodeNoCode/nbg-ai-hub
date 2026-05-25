---
type: tip
title: One thing per prompt
audience: beginner
topics: [prompting, fundamentals]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: null
ai_summary: A prompt with five asks gets five mediocre answers. Break work into one focused step at a time, accept it, then move to the next.
---

Bad: "Fix the bug in checkout, also refactor the auth flow, also add tests for the cart, also update the README."

Good: "Fix the bug in checkout." (then, after reviewing: "Now refactor the auth flow.")

Long compound prompts produce muddled diffs that are impossible to review. Worse, when one part is wrong, you have to undo everything. One step at a time is slower per-line but faster overall — and the diffs stay reviewable.

Exception: when the steps are *truly* coupled (e.g. "rename this function AND update all callers") you can bundle them. Use judgement.
