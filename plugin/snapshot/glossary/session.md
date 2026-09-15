---
type: glossary
title: Session
audience: beginner
topics: [claude-code, foundations]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: One continuous conversation with Claude Code, from the moment you run `claude` until you close it or clear it. Everything Claude has read, decided and remembered lives inside the session — which is why starting a fresh one is a real decision, not just a restart.
tldr: "One continuous conversation with Claude Code. Everything it has read and remembered lives inside it — close it and that working memory is gone."
aliases: ["sessions"]
---

A **session** is one continuous conversation with Claude Code — from the moment you run `claude` until you close it, clear it, or start a new one.

It matters more than it sounds, because the session *is* Claude's working memory. Inside one session Claude remembers the files it read, the conventions it noticed, the thing you told it not to do twenty minutes ago, and the approach you already rejected. None of that survives into a different session unless you deliberately carry it across.

That's why so much advice here is really advice about sessions:

- **One session, one task.** Mixing two jobs in one conversation gives Claude contradictory context.
- **Resume rather than restart** when you're continuing yesterday's work — the session already understands the project.
- **Start fresh when the topic changes.** Stale context makes answers worse, not better.
- **Hand off before you end one** if the work isn't finished, so the next session starts warm.

A session is not the same as your terminal window. You can close a session and keep the terminal; you can also come back to a previous session later with `claude --resume`.
