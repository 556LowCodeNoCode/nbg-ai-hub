---
type: glossary
title: Shell commands
audience: beginner
topics: [foundations, tools]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: null
deeper_link: null
ai_summary: A shell command is a single instruction you type at the terminal. `ls`, `cd`, `git status`, `npm install`, `claude` — all shell commands. The "shell" is the program (bash, zsh, fish, PowerShell) that reads your command, runs it, and shows you the output. Claude Code can run shell commands on your behalf — it's one of the four "hands" that makes it more than a chatbot.
tldr: "Commands you type in the terminal to get things done — list files, change folders, run a script. Claude can run them for you with your OK."
aliases: ["shell command"]
---

A **shell command** is one instruction you type at the terminal and press return on. `ls`, `cd`, `git status`, `npm install`, `claude` — all shell commands. The *shell* part is the program (bash, zsh, fish, PowerShell) that reads what you typed, runs it, and prints the result back into the terminal window.

You usually type commands directly, but you can also stitch them together — pipe one's output into another (`git log | grep fix`), save a sequence as a script, or run them on a remote server over SSH. The composability is the whole point of working at the command line.

The reason this matters for Claude Code: running shell commands on your behalf is one of the four "hands" that makes it more than a chatbot. Watch a Claude session and you'll see it propose commands — `grep -r 'foo' .`, `npm run build`, `git diff HEAD` — and either run them or ask permission first, depending on your permission settings. Two practical rules:

- **Read every command before allowing it.** Especially the destructive ones (`rm`, `git push --force`, anything piped to `sudo`). Claude is right almost always — but almost is not always.
- **Configure permissions deliberately.** Allow the safe read-only stuff (`git status`, `ls`, `cat`) so you're not approving the same harmless command for the fiftieth time. Keep destructive commands on prompt.
