---
type: glossary
title: Git
audience: beginner
topics: [github, fundamentals]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: "https://git-scm.com/"
deeper_link: null
ai_summary: The system that records every version of every file in a project, so any change can be inspected, compared or undone. Git is the tool that runs on your machine; GitHub is the website that hosts the results.
tldr: "The system that records every version of every file, so any change can be undone. Git runs on your machine; GitHub is the website."
aliases: ["git"]
---

**Git** records every version of every file in a project, so you can see what changed, when, by whom — and put it back if you need to.

The distinction people trip over: **Git** is the tool running on your laptop. **GitHub** is a website that stores Git projects and adds reviews, issues and discussion on top. You can use Git with no GitHub at all.

For Claude Code specifically, Git is your safety net, and it's the reason one particular habit matters: **`/rewind` undoes what Claude changed, but it does not undo shell commands.** If Claude deletes a file by running a command, only Git gets it back — and only if the file was committed.

So the useful instinct is: commit before anything risky. It takes seconds.

> Commit the current state with a message describing where we are, so I have something to go back to.

You don't need to memorise Git commands to benefit from it. Ask Claude to do it and read the result.
