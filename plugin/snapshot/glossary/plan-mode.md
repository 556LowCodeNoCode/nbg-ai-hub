---
type: glossary
title: Plan mode
audience: beginner
topics: [claude-code, foundations]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: A read-only permission mode where Claude can examine the project and propose an approach but cannot change anything. The safest way to explore unfamiliar work, and the natural first half of plan-then-execute.
tldr: "A read-only mode where Claude can look and propose but change nothing. The safe way to explore before committing to anything."
aliases: ["plan mode", "plan-mode", "planning mode"]
---

**Plan mode** is the read-only setting: Claude can read files, work out what's going on and tell you what it *would* do — but it cannot edit, run or change anything.

Reach for it when:

- You're in an unfamiliar folder and want to understand it before touching it.
- The change is big enough that you want to agree the approach first.
- You want an opinion, not an action.

Get there by pressing **Shift+Tab** until the mode shows as plan, or start that way with `claude --permission-mode plan`.

The rhythm most people settle into: plan first, read the proposal, agree the direction, then switch to a mode that lets Claude execute while you watch the diffs. The planning half costs a minute and routinely saves an afternoon of unpicking the wrong approach.
