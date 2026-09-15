---
type: tip
title: One session, one task — don't pile work into a long conversation
audience: beginner
topics: [workflow, context]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: null
deeper_link: null
ai_summary: Long mixed-topic sessions confuse Claude and burn context. Finish the auth refactor, then `/clear` and start the cart bug fresh. Sessions are cheap; misremembering isn't.
---

A common newcomer pattern: open Claude in the morning, work on the auth refactor for two hours, then ask about the cart bug, then ask about the slow query, then come back to auth. By 3pm Claude is confidently referencing the cart code while editing auth, dropping in patterns from the database query into the auth flow, and quietly mis-citing function names you never wrote.

The fix is mechanical: **one focused topic per session.**

When you finish (or pause) a task, run `/clear` and start fresh for the next one. The cost is a few seconds of re-grounding the new task. The benefit is Claude isn't dragging four problems' worth of half-relevant context into every prompt.

The two reasons this matters:

1. **Context window is finite.** Every file read, every command output, every prompt eats into it. Mixed topics fill it with stuff Claude doesn't need for the current task, and the model starts forgetting the part you do need.
2. **Claude is associative.** It will happily relate the new task to whatever's recent in the conversation. If "auth" and "cart" are both in scrollback, Claude tries to find connections that aren't there.

A rough rule: **one Linear ticket, one Claude session.** When the ticket closes, the session closes. Use `claude --continue` (see the *Resume* tip) if you genuinely need to pick that ticket up tomorrow.

The exception: a session that's *deepening* on one topic (refactor + then writing tests for the same refactor + then updating the docs for the same refactor) is fine. The same topic is allowed to grow. *Different* topics are what burn you.
