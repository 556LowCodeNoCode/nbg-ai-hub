---
type: glossary
title: Bash
audience: beginner
topics: [tooling, shell, fundamentals]
internal: false
authored: "2026-05-27"
last_reviewed: "2026-05-27"
external_link: null
deeper_link: null
ai_summary: The default shell on most macOS and Linux systems — the language you type into a terminal. `cd`, `ls`, `mkdir`, pipes, scripts. Claude Code runs commands here.
tldr: "The language you type into a terminal — cd, ls, mkdir, and so on. The default on macOS and Linux. Claude runs shell commands by speaking Bash."
aliases: ["bash script", "bash scripts", "sh"]
---

Bash (short for *Bourne Again Shell*) is the language you type into a terminal on most macOS and Linux machines. It's what's running when you see a prompt like `$ ` waiting for input.

The handful of commands you'll see Claude run on day 1:

- `cd <folder>` — change directory (move to a folder).
- `ls` — list what's in the current folder.
- `mkdir <name>` — make a folder.
- `mv <a> <b>` / `cp <a> <b>` / `rm <a>` — move, copy, remove.
- `cat <file>` — print a file to the screen.
- `<cmd1> | <cmd2>` — pipe the output of one command into the next.

You don't need to know Bash deeply. When you run `claude --dangerously-skip-permissions` and ask Claude to "list every Python file in this folder" or "rename these images", it speaks Bash on your behalf. The skill is recognising what the commands do well enough to spot the one that surprises you. If a Bash command shows up in a session that you don't understand, ask Claude what it does before approving it.

On Windows, the equivalent is PowerShell or — preferably — a Bash-style shell inside WSL.
