---
type: glossary
title: Shell
audience: beginner
topics: [shell, fundamentals]
internal: false
authored: "2026-05-27"
last_reviewed: "2026-05-27"
external_link: null
deeper_link: null
ai_summary: The program inside the terminal that reads what you type and runs it. Bash is the most common one on macOS and Linux; PowerShell is the Windows default; zsh is the modern macOS default. Claude Code uses your shell to run commands.
tldr: "The program inside the terminal that reads what you type and runs it. Terminal is the window; shell is the brain."
aliases: ["shells"]
---

A shell is the program that listens inside a terminal window. The terminal is the window; the shell is what's running *inside* the window, reading what you type and translating it into something the computer can do.

The shells you will meet:

- **Bash** — the default on most Linux systems and older macOS systems. Still the most common shell in tutorials and Claude Code documentation.
- **zsh** — the default on modern macOS. Behaves like Bash for everyday commands; you usually do not need to know the difference.
- **PowerShell** — the default on Windows. Different syntax from Bash; the team avoids it for Claude Code work and uses WSL (which gives you Bash) instead.

When you read "open a shell" or "in a shell, run X" in any tutorial, it means "open a terminal and type X at the prompt". The two terms are used loosely and interchangeably in conversation, even though they technically refer to different things.

Claude Code speaks shell on your behalf. When it runs commands like cd or ls or gh, those commands are interpreted by your shell — Bash, zsh, or whatever is running inside your terminal.
