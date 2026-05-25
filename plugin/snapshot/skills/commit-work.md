---
type: skill
title: commit-work — high-quality git commits
audience: beginner
topics: [git, workflow]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: "https://github.com/556LowCodeNoCode/Skills"
deeper_link: null
ai_summary: Reviews your unstaged changes, splits them into logical commits, and writes clear commit messages (Conventional Commits where appropriate). Stops you from shipping one 47-file "wip" commit.
install_command: "/plugin install commit-work@556LowCodeNoCode-skills"
skill_id: commit-work
origin: community
category: workflow
status: active
maintainer: "@nbg-ai-team"
---

`commit-work` is for the moment you've been hacking for an hour and have a working-but-untidy diff. Instead of `git commit -am "stuff"`, ask Claude to use this skill: it reads your changes, proposes a sensible split into multiple focused commits, drafts clear messages for each, and commits them in order.

The result: a clean history that's actually reviewable, not a single 47-file commit titled "wip".

Use it: any time before opening a PR with a noisy local diff.
