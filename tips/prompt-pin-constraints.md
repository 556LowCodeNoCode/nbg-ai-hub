---
type: tip
title: Pin the constraints, not the method
audience: both
topics: [prompting, fundamentals]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: null
ai_summary: When you really do need to constrain Claude, pin the *requirements* (must use Azure OpenAI, must not exceed 100 lines, must work offline) — not the implementation choices.
---

Constraints are things that *must* be true about the result. They're not the same as implementation choices.

Bad constraint: "Use a `for` loop with an index counter."

Good constraint: "Must run in under 200ms on a 10,000-row input."

Good constraint: "Must not call the public Anthropic API — use Azure OpenAI only."

Good constraint: "Output must be valid JSON that parses with the existing `validateUser()` schema."

The difference: a *requirement* survives a refactor. An *implementation choice* doesn't. Pin the ones that survive.
