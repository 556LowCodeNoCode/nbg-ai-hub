---
type: glossary
title: Terminal
audience: beginner
topics: [shell, fundamentals]
internal: false
authored: "2026-05-27"
last_reviewed: "2026-05-27"
external_link: null
deeper_link: null
ai_summary: The window where you type commands instead of clicking. Claude Code runs inside one — your prompt, Claude's output, and any commands it runs all live here.
tldr: "The window on your computer that takes typed commands instead of clicks. Terminal is the window; the shell is the brain inside it."
aliases: ["terminals", "terminal window", "terminal app"]
---

A terminal is the window where you type commands instead of clicking icons. It is the oldest interface in computing and where developers and Claude Code do most of their work.

On macOS, the default is **Terminal.app** (Applications then Utilities then Terminal). Other popular ones: cmux, Ghostty, iTerm2, Warp. On Windows, your terminal lives inside WSL by default. On Linux, you have already used one.

What you see inside a terminal:

- A **prompt** — usually ending in a dollar sign — waiting for you to type.
- The **commands you type** — cd, ls, git pull, claude, and so on.
- The **output** that those commands print back.

Claude Code runs inside a terminal. When you type claude --dangerously-skip-permissions, you are starting a session that takes over the terminal until you press Esc enough times or quit. The terminal is not a separate app from Claude — Claude is running inside the terminal you opened.

The terminal is also where Bash (or another shell) interprets what you type — see the shell entry for the distinction.
