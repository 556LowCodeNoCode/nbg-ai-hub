---
type: glossary
title: Branch
audience: beginner
topics: [github, fundamentals]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: null
ai_summary: A parallel line of work. You branch off `main`, make changes without disturbing anyone, then merge back via a Pull Request when it's ready.
tldr: "A safe side-copy of the project where you can try changes without breaking what everyone else is using. When ready, you merge it back in."
aliases: ["branches"]
---

A branch is a parallel line of work in the same repo. The team's default branch is usually `main` (or `master` on older repos). You create a feature branch off `main`, make your changes there, and merge it back through a Pull Request.

Why branches matter: you can experiment, make a mess, change your mind — without touching `main`. The branch is your sandbox.

Day-to-day, you rarely create branches by hand. You ask Claude ("start a branch for this work") or use `/team` / `/gsd-*` skills, which handle branching as part of the workflow.
