---
type: tip
title: Iterate, don't restart
audience: beginner
topics: [prompting]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: null
ai_summary: When Claude's answer is wrong, don't `/clear` and start over. Tell it what's wrong and let it adjust — you keep all the context you've already built up.
---

You'd be surprised how often newcomers wipe the session and start fresh because Claude's answer was off. Don't — you're throwing away the file reads, the codebase knowledge, the half-built mental model.

Instead, just say: "No, that's not what I meant. The bug is in `<file>:<line>`, not the function you fixed. Try again."

Claude takes correction well. The session has memory; use it.

The one time `/clear` IS the right move: when you've switched to an *unrelated* task (different file, different problem). Then a fresh window is clearer than dragging old context along.
