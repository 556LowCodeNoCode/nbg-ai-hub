---
type: tip
title: '/compact and /clear — context-window discipline'
audience: both
topics: [context]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: Don't carry irrelevant history. Use `/compact` to summarise the conversation when staying on-task, `/clear` to wipe and start fresh when switching tasks. Know that compacting trades detail for room — for work you care about, a handoff to a fresh session preserves more.
---

Every session has a finite context window. Once it's full, Claude starts forgetting the earliest parts. Two commands keep your session healthy:

- **`/compact`** — Claude summarises the conversation so far and continues with the condensed version. Use this when you're *still on the same task* but the session has grown long. You keep the relevant context; you lose the noise.

- **`/clear`** — wipes the conversation entirely and starts fresh. Use this when you're *switching to an unrelated task*. Carrying old context into a new task makes Claude's answers worse, not better, because it tries to relate the new task to whatever it remembers.

Rough rule: if you're about to type "ignore everything we discussed before…", you should have used `/clear` instead.

## What `/compact` costs you

Compacting is a summary, and a summary is lossy. Specific details — the exact error string, the file path you looked at once, the thing you tried that didn't work — are the first casualties, because they don't look important to a summariser. What survives is the shape of the conversation, not its particulars.

So: `/compact` buys you room to keep going, and the price is detail. That's a fine trade for "we're mid-task and the session has grown long". It's a bad trade for anything you'd be annoyed to lose.

**For work you care about, hand off instead.** Ask Claude to write a handoff pointing at the files that matter and naming what's already been ruled out, then start a fresh session with it. You choose what survives rather than letting a summariser choose. See the handoff-not-summary tip.

Practical split:

- **Mid-task, session getting long, details are all still on disk** → `/compact` is fine.
- **End of day, or anything you'd hate to re-derive** → handoff, then `/clear`.
- **Switching topic entirely** → `/clear`.

## Compact before it compacts you

Claude Code will auto-compact when the window fills. You can decide when that happens rather than accepting the default:

```
/autocompact
```

*"Set how full the context gets before auto-summarizing."* Setting it lower means more frequent, smaller summarisations instead of one big one at the worst moment. Run **`/context`** to see how full you actually are — it draws the window as a grid.
