---
type: glossary
title: GUI (graphical user interface)
audience: beginner
topics: [foundations, tools]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: null
deeper_link: null
ai_summary: A GUI — graphical user interface — is the windowed kind of program you click around in. Word, Slack, Chrome, your IDE, Photoshop — all GUIs. The opposite is a CLI, which you drive by typing commands in a terminal. Most developer tools live in CLIs because text is composable, scriptable, and reproducible in a way that mouse clicks aren't. Claude Code is a CLI, not a GUI.
tldr: "The clickable, windowed kind of software — Word, Slack, Chrome. Anything you use with a mouse. The opposite of a CLI."
aliases: ["GUIs", "graphical user interface"]
---

A **GUI** — graphical user interface — is the windowed kind of program you click around in with a mouse. Word, Slack, Chrome, your IDE, Photoshop, your operating system itself — all GUIs. Friendly on day one, no typing required, the whole world of an app laid out as menus and buttons.

The opposite is a [CLI](/glossary/#cli) (command-line interface), which you drive by typing commands in a [terminal](/glossary/#terminal) instead. CLIs win once you're used to them, for three reasons:

- **Composable.** Pipe one program's output into another. Try doing that with two GUI apps.
- **Scriptable.** Save a sequence of commands as a file, run it tomorrow on a different machine, get the same result.
- **Reproducible.** "Click File → Export → choose format → set quality → save" is unwriteable as documentation; `convert in.png -resize 800x out.jpg` is.

[Claude Code](/glossary/#claude-code) is a CLI, not a GUI. There is no Claude Code app icon. You launch it by opening a terminal, `cd`-ing into a project folder, and typing `claude`. That's deliberate — it sits next to the other tools developers already use at the command line (`git`, `gh`, `npm`) and inherits all the composability that comes with the territory.
