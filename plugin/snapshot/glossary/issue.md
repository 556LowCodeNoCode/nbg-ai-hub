---
type: glossary
title: Issue
audience: beginner
topics: [github, fundamentals]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: "https://556lowcodenocode.github.io/Onboarding/"
ai_summary: A tracked discussion thread on GitHub — bug reports, feature requests, ideas. Issues have a state (open/closed), labels, assignees, and a comment thread. They're how the team remembers what to do next.
---

An issue is a thread for one piece of pending work — a bug, a feature, an idea, a question. Each issue has a title, a body, labels (`bug`, `enhancement`, `question`), an assignee, and a state (`open` or `closed`).

Why the team uses them:

- The backlog is shared and visible
- Discussion sticks to the issue, not buried in chat
- PRs can reference issues — closing a PR can auto-close its linked issue

Ask Claude in plain English: "list the open issues", "create an issue for this bug", "close issue #42 — I just fixed it". Behind the scenes Claude calls `gh issue list / create / close`.
