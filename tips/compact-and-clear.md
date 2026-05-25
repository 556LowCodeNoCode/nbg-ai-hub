---
type: tip
title: '/compact and /clear — context-window discipline'
audience: both
topics: [context, basics]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: null
ai_summary: Don't carry irrelevant history. Use `/compact` to summarise the conversation when staying on-task, `/clear` to wipe and start fresh when switching tasks.
---

Every session has a finite context window. Once it's full, Claude starts forgetting the earliest parts. Two commands keep your session healthy:

- **`/compact`** — Claude summarises the conversation so far and continues with the condensed version. Use this when you're *still on the same task* but the session has grown long. You keep the relevant context; you lose the noise.

- **`/clear`** — wipes the conversation entirely and starts fresh. Use this when you're *switching to an unrelated task*. Carrying old context into a new task makes Claude's answers worse, not better, because it tries to relate the new task to whatever it remembers.

Rough rule: if you're about to type "ignore everything we discussed before…", you should have used `/clear` instead.
