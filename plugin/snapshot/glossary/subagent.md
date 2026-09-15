---
type: glossary
title: Subagent
audience: advanced
topics: [claude-code, tooling]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: A separate Claude instance your main session delegates a bounded job to. Useful for wide, shallow work like searching many files, because the reading happens in its context window rather than yours.
tldr: "A separate Claude your main session hands a bounded job to. Its reading happens in its own memory, keeping yours clean."
aliases: ["subagents", "sub-agent", "sub-agents"]
---

A **subagent** is a second Claude that your main session hands a specific, bounded job to — typically "go read these thirty files and tell me what you find".

The point is context. The subagent does its reading in *its own* memory and returns a short answer, so your main session gets the finding without absorbing thirty files of noise.

Two things people get wrong:

- **They're not cheaper.** Each subagent is a full Claude with its own context window, so delegating usually costs more tokens overall, not fewer. What you save is room in *your* session, which is a real benefit — just not the one people assume.
- **They don't inherit your context.** A subagent gets its task and a partial view of your project rules — not your conversation, not the files you already had Claude read. If it must follow a convention, say so in its instructions.

Rule of thumb: subagents for wide and shallow work; keep deep, contextual work in the main session where the understanding lives.
