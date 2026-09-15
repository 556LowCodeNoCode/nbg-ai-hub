---
type: skill
title: /teach — a tutor that remembers where you got to
audience: beginner
topics: [learning, onboarding, productivity]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: "https://github.com/mattpocock/skills/tree/main/skills/productivity/teach"
deeper_link: "https://github.com/mattpocock/skills"
ai_summary: Turns the current folder into a teaching workspace and Claude into a tutor that keeps your progress in files. Learning is treated as a multi-session thing — you can stop, come back next week, and pick up where you left off instead of re-explaining what you already know.
when_to_use: Use this when you want to genuinely learn a topic rather than get an answer — and you know it will take more than one sitting.
install_command: "/plugin install mattpocock-skills@claude-plugins-official"
skill_id: teach
origin: community
category: productivity
status: active
maintainer: "@mattpocock"
time_saved: "replaces a half-day course"
worked_scenario: "You've been asked to review a colleague's Python notebook and you don't really know Python. Asking Claude to explain it line by line works once, but next Tuesday you start from zero. With `/teach python basics` the folder becomes a workspace: what you've covered, what you struggled with, and what's next all live in files on disk. Three sessions later Claude opens knowing you're solid on lists and still shaky on decorators, and picks up there."
---

Most Claude sessions answer a question. `/teach` is built to run a *course* — and the difference is that it keeps state.

Run it in an empty folder:

```
/teach how git branching works
```

Claude treats that directory as a teaching workspace and writes your progress into it — what you've covered, where you got stuck, what comes next. Close the session, come back in a week, and the context is on disk rather than gone.

## Why this one is on the list

It is the closest thing on this page to what this hub is for. A colleague who wants to *understand* permission modes rather than copy a command is better served by a tutor that tracks them over three sittings than by one very good answer they'll have forgotten by Thursday.

It also pairs naturally with [Level up to interactive](/tips/level-up-to-interactive/) — ask for the lesson as an interactive HTML page and you get something you can click through rather than scroll.

## Worth knowing

- **Use a dedicated folder.** The skill writes its state files into the working directory. Point it at a real project and you'll get lesson notes scattered among your code.
- **It's user-invoked only.** Claude won't start teaching on its own; you type `/teach`.
- **Installing gives you the whole set.** `mattpocock-skills` is one plugin containing many skills — `/handoff` and `/grill-me` on this page arrive in the same install.

## Access

Public — no access request needed. It ships in Claude Code's official marketplace, so there is no `marketplace add` step.
