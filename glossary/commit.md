---
type: glossary
title: Commit
audience: beginner
topics: [github, fundamentals]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: null
ai_summary: A saved snapshot of changes with a message describing why. Commits live on your machine until you push them — they're the unit of "I'm done with this slice of work."
tldr: "A saved checkpoint of your changes, with a short note explaining what and why. You can always come back to any earlier commit."
aliases: ["commits"]
---

A commit is one saved change-set: a few files, a one-line message, and a parent commit it builds on. Together, commits form your project's history.

Key thing newcomers miss: a commit is **local** until you push it. You can commit ten times, change your mind, rewrite history (carefully), and only push the result. Once pushed, others see it — at that point it's effectively immutable.

Claude Code never commits without your explicit "yes, commit". Per the global rules: no version-control operations unless you ask.

Good commit messages explain *why*, not *what* — the diff already shows what changed.
