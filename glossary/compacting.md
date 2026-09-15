---
type: glossary
title: Compacting
audience: both
topics: [claude-code, fundamentals]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: Summarising the conversation so far to free up room in the context window. Buys space at the cost of detail — the specifics are the first thing a summary loses.
tldr: "Summarising the conversation so far to free up room. It buys space and costs detail — specifics are the first thing to go."
aliases: ["compact", "auto-compact", "autocompact"]
---

**Compacting** replaces the conversation so far with a summary, freeing room in the context window so the session can keep going.

Run it yourself with `/compact`, or let it happen automatically when the window fills — `/autocompact` controls how full things get before that kicks in.

The trade is worth understanding before you rely on it. A summary keeps the *shape* of a conversation and loses its *particulars*: the exact error message, the file path you looked at once, the approach you tried that didn't work. Those are precisely the details that turn out to matter later.

So compacting is a good answer to "this session has got long and I'm still on the same task", and a poor answer to "I care about everything in here". For the second case, write a handoff and start a fresh session — you choose what survives, rather than letting a summariser choose for you.
