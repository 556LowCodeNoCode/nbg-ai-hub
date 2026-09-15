---
type: glossary
title: CLI (command-line interface)
audience: beginner
topics: [foundations, tools]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: null
deeper_link: null
ai_summary: A CLI is a text-only program you operate by typing commands into a terminal rather than clicking buttons in a window. Claude Code is a CLI — that's why you launch it from a terminal with `claude` and not from an icon in your dock. Most developer tooling lives at the command line because text is composable, scriptable, and survives version control.
tldr: "Any program you run by typing rather than clicking — CLI is anything you type instead of click. Git is one; Claude Code is one."
aliases: ["CLI", "command-line interface", "command line interface", "command line"]
---

A **CLI** — command-line interface — is a program you talk to by typing. You open a terminal, type a command, hit return, read the output, type the next command. No mouse, no buttons, no windows. Just text in, text out.

The opposite is a **GUI** (graphical user interface) — the windowed apps you click around in. GUIs are friendlier on day one; CLIs are faster, scriptable, and composable once you're used to them. You can pipe one CLI's output into another, save commands as scripts, run them on a remote server, and reproduce them exactly six months later. None of that is easy with a GUI.

[Claude Code](/glossary/#claude-code) is a CLI. You launch it by typing `claude` in a terminal inside your project folder — there is no Claude Code app icon. That's deliberate: it sits next to the other tools you already use at the command line:

- `git` — version control
- `gh` — GitHub (issues, PRs, releases)
- `npm` — install and run Node packages
- `claude` — start a Claude Code session

When someone says "run it in a terminal" or "run it on the command line," they mean: use a CLI. Same thing.
