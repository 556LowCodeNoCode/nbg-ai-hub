---
type: glossary
title: Project
audience: beginner
topics: [foundations, claude-code]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: The folder you start Claude Code in. Everything inside it is fair game for Claude to read; everything outside is invisible. Choosing the right folder is the first decision of any session.
tldr: "The folder you start Claude Code in. Claude can read everything inside it and nothing outside it."
aliases: ["projects", "project folder", "working directory"]
---

Your **project** is simply the folder you were in when you ran `claude`.

That folder is Claude's whole world for the session. It can read any file inside it — code, spreadsheets, notes, the `CLAUDE.md` — and it cannot see anything outside it. There's no magic to it: no configuration, no registration. A project is a directory.

Two consequences worth knowing on day one:

- **Start in the right folder.** Running `claude` in your home directory gives Claude thousands of unrelated files to wade through. Running it inside the one folder your work lives in makes every answer sharper.
- **Anything you leave lying around gets read.** Old drafts, stale notes and abandoned scratch files are all fair game, and Claude can't tell which of three contradictory documents is the current one. That's the reasoning behind keeping a project tidy.

You don't need a project to be a code repository. A folder of Word documents is a perfectly good project.
