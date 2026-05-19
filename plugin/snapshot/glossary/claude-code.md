---
type: glossary
title: Claude Code
audience: both
topics: [claude-code, fundamentals]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: "https://docs.claude.com/en/docs/claude-code/overview"
deeper_link: "https://556lowcodenocode.github.io/Onboarding/"
ai_summary: A terminal-based AI coding agent from Anthropic that reads your project, proposes changes, runs commands, and iterates — treat it like an extremely capable junior colleague who needs review.
---

Claude Code is a CLI tool that runs an LLM (Claude) with hands — it can read files, execute shell commands, edit code, and loop on its own work until done. Four things make it different from a chatbot: **hands** (it executes, not just suggests), **context** (it sees the whole project), **loops** (it iterates autonomously), **specialization** (it learns your team's way of working via `CLAUDE.md` and skills).

Mental model: it's a brilliant junior — fast, capable, but you always check what it changed before accepting. Never trust without reviewing the diff.
