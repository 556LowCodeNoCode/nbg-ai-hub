---
type: glossary
title: CLAUDE.md
audience: beginner
topics: [conventions, setup]
internal: false
authored: "2026-05-18"
last_reviewed: "2026-05-18"
external_link: null
deeper_link: null
ai_summary: A markdown file at the root of a repo (or in ~/.claude/) where you tell Claude Code the rules, conventions, and context it should follow when working in that scope.
tldr: "A plain-text file you drop in your project to tell Claude the rules: tech stack, conventions, things to avoid. It reads it every session."
aliases: ["CLAUDE.md"]
---

Working with Claude is like working with an assistant who has a great long-term memory but total amnesia about what happened this morning — every new session starts cold. `CLAUDE.md` is how you brief that assistant before each session, automatically.

It's the file Claude Code reads when you open a session in its directory. Put project-specific rules in the repo's `CLAUDE.md`, and personal preferences that apply across every project in `~/.claude/CLAUDE.md`. The rule of thumb: if you'd repeat the instruction in three different sessions, it belongs in a `CLAUDE.md`.
