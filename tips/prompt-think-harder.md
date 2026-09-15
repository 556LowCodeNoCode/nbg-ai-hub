---
type: tip
title: '"think harder" and `/effort` — turn up the reasoning when it matters'
audience: both
topics: [prompting]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-09-15"
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
- **xhigh** — a step past high, when the problem is genuinely hard but you don't need the ceiling.
- **max** — hard debugging, architecture, multi-step reasoning. Slower and more expensive but materially more careful.

You can also set it at launch: `claude --effort max`.

There's a keyboard shortcut for the one-off case too — **Alt+T** toggles thinking for the next turn only, without changing the session's effort level.

## When to reach for which

- About to do a batch of one-line renames? `/effort low`.
- Normal feature work? Default (high or medium depending on plan).
- Stuck on a real bug, or making a decision that's hard to reverse? `/effort max` or "think harder" in the prompt.
- Architecture proposal you want a second opinion on? `/effort max` and ask Claude to argue against itself.

The rough rule: **match the effort to the cost of getting it wrong.** Cheap-to-revert work doesn't need extra thinking. Hard-to-revert work pays for the extra cycles many times over.

## The dial turns down, too

The reverse move is just as useful and almost nobody uses it. When you want a fast answer and don't need the reasoning:

> Give me a quick answer — I just need the gist.

Worth knowing: asking Claude to "walk me through your reasoning" or "double-check every number" is a different thing from asking it to *think harder*. Current models already reason before answering; those phrases mostly add output for you to read rather than care taken. If you want more care, use `/effort` or "think harder". If you want to *see* the reasoning because you'll check it yourself, ask for it — just know which of the two you're buying.
