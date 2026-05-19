---
type: glossary
title: Context window
audience: both
topics: [claude-code, fundamentals]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: "https://556lowcodenocode.github.io/Onboarding/"
ai_summary: The amount of conversation history Claude can remember at once — when it fills up, older content gets dropped and Claude starts forgetting earlier parts of the session.
---

Every Claude session has a finite context window — think of it as Claude's working memory for this conversation. As you keep asking things, the window fills with prompts, code, outputs, and Claude's responses. When it's full, the oldest parts get pushed out and Claude starts forgetting.

Two commands to manage it:

- `/compact` — summarises the conversation so far and continues with the condensed version (good when you're still on the same task)
- `/clear` — wipes everything and starts fresh (good when you're switching to an unrelated task)

The discipline: don't carry irrelevant history. Start fresh for unrelated tasks.
