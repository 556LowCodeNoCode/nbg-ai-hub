---
type: glossary
title: Context window
audience: both
topics: [claude-code, fundamentals]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: null
ai_summary: The amount of conversation history Claude can remember at once — when it fills up, older content gets dropped and Claude starts forgetting earlier parts of the session.
tldr: "How much Claude can remember in one conversation. Once it fills up, the oldest messages get forgotten — like short-term memory has a limit."
aliases: ["context window", "context windows"]
---

Every Claude session has a finite context window — think of it as a glass of water. Every prompt you send, every file Claude reads, every command output, and every reply Claude writes pours something in. When the glass is full, the oldest content spills out and Claude starts forgetting earlier parts of the conversation.

That's why answers get vaguer or repeat themselves in long sessions — the glass overflowed and the file Claude read an hour ago is no longer in scope.

Two commands to manage it:

- `/compact` — summarises the conversation so far and continues with the condensed version (good when you're still on the same task)
- `/clear` — wipes everything and starts fresh (good when you're switching to an unrelated task)

The discipline: don't carry irrelevant history. Start fresh for unrelated tasks.
