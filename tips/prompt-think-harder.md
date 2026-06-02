---
type: tip
title: '"think harder" and `/effort` — turn up the reasoning when it matters'
audience: both
topics: [prompting]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: null
deeper_link: null
ai_summary: Drop "think harder" or "ultrathink" into a prompt and Claude reasons longer before answering. Use `/effort max` for hard debugging, architecture decisions, or anything where speed matters less than getting it right.
---

Most prompts don't need extra thinking. Renames, format fixes, "explain this line" — Claude answers in a beat and gets it right.

Hard problems are different. A weird bug that doesn't reproduce locally, an architecture decision between two reasonable options, a refactor where the wrong choice cascades — these are where Claude's default speed works against you. You want it to slow down and reason.

Two ways to ask for that.

## Informal: trigger words in the prompt

The convention that's taken hold: drop phrases like **"think harder"**, **"think step by step"**, or **"ultrathink"** into your prompt and Claude shifts into extended reasoning before answering.

> Ultrathink: I'm seeing inconsistent invoice totals in production but the staging tests pass. Walk through everything that could cause a divergence between the two environments.

You don't have to be precious about it. It's a hint, not a setting. Use it when the problem is open-ended and you'd rather wait twenty extra seconds for a better answer.

## Official: `/effort`

Inside any session, run `/effort` to see the levels:

- **low** — fewer tokens, faster, cheaper. Mechanical edits, format passes.
- **medium** — the everyday default on most plans.
- **high** — the everyday default on Team / Enterprise. Most code work lives here.
- **max** — turn it up for hard debugging, architecture, multi-step reasoning. Slower and more expensive but materially more careful.
- **auto** — let Claude pick per request.

The settings persist across sessions (except `max`, which resets when the session ends). Set it once and forget about it until you're switching gears.

## When to reach for which

- About to do a batch of one-line renames? `/effort low`.
- Normal feature work? Default (high or medium depending on plan).
- Stuck on a real bug, or making a decision that's hard to reverse? `/effort max` or "think harder" in the prompt.
- Architecture proposal you want a second opinion on? `/effort max` and ask Claude to argue against itself.

The rough rule: **match the effort to the cost of getting it wrong.** Cheap-to-revert work doesn't need extra thinking. Hard-to-revert work pays for the extra cycles many times over.
