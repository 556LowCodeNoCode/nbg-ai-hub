---
type: glossary
title: Slash command
audience: beginner
topics: [claude-code, fundamentals]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: "https://docs.claude.com/en/docs/claude-code/slash-commands"
deeper_link: null
ai_summary: A command you trigger inside Claude Code by typing `/` followed by a name — like `/model`, `/compact`, or `/clear`. Built-in shortcuts plus every installed skill show up this way. Type `/` on its own to see the menu of what's available in the current session.
tldr: "A shortcut inside a CLI tool — type / followed by a name (/clear, /compact, /help). Triggers a built-in action, different from a normal prompt."
aliases: ["slash command", "slash commands"]
---

A slash command is a shortcut inside Claude Code. You type `/`, a name appears in a menu, you pick one — or just keep typing the full name and hit return. They cover everything from switching the model to running a whole installed skill.

The ones you'll meet on day one:

- `/help` — list everything you can do
- `/model` — switch between Opus, Sonnet, Haiku
- `/clear` — wipe the conversation and start fresh
- `/compact` — summarise the conversation so far to free up context
- `/hooks` — inspect or edit the per-project hooks
- `/plugin` — install or manage plugins

Every skill you install also shows up as a slash command. The team's hub installs commands like `/hub-news`, `/hub-skills`, `/hub-onboard`. When a colleague says "run `/jira`" or "use `/deploy`", they mean type those into Claude Code.

Type `/` on its own with nothing after it to see the live menu of every command available in the current session.
