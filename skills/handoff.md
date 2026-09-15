---
type: skill
title: /handoff — end a session so the next one starts sharp
audience: both
topics: [context, workflow, productivity]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: "https://github.com/mattpocock/skills/tree/main/skills/productivity/handoff"
deeper_link: "https://github.com/mattpocock/skills"
ai_summary: Compresses the live conversation into a handoff document a fresh session can act on — written for the next agent, not as a summary for you. Plain markdown, saved to a temp directory, and it names which skills the next session should reach for.
when_to_use: Use this when a session has got long or slow and the work is not finished — before you hit /clear, not after.
install_command: "/plugin install mattpocock-skills@claude-plugins-official"
skill_id: handoff
origin: community
category: workflow
status: active
maintainer: "@mattpocock"
time_saved: "~20 min of re-explaining per restart"
worked_scenario: "It's 4pm, the session has been running all afternoon, and Claude is getting noticeably vaguer. You're two-thirds through a migration. Type `/handoff continue the migration tomorrow` and you get a markdown file stating where the work stands, what's decided, what's still open, and which skills to load. Tomorrow you paste it into a clean session and the first reply is already useful instead of Claude re-reading the repo for ten minutes."
---

This is the executable version of a tip we already publish — [write a handoff, not a summary](/tips/handoff-not-summary/). If you only read one thing here, read that; this skill does it for you.

```
/handoff finish wiring the Kafka audit events
```

You get a markdown document written **for the next agent to act on**, not a recap for you to read. The argument matters: tell it what the next session is for and the document is scoped to that.

## What it does that a summary doesn't

- **Saves outside your project.** The file lands in your OS temp directory, so you don't commit session notes by accident.
- **Refuses to duplicate.** If a decision already lives in a spec, an ADR, a commit or a diff, it references the path instead of restating it — so the document stays short enough to actually be read.
- **Names the skills.** It includes a "suggested skills" section telling the next session which skills to load.

## Why not just `/compact`

`/compact` keeps the session alive but loses specifics — that trade-off is covered in [compact and clear](/tips/compact-and-clear/). A handoff is the right move when the work *matters* and you're willing to spend one deliberate step to carry it cleanly into a fresh context window.

## Worth knowing

- **It's user-invoked only** — Claude won't decide to hand off on its own.
- **Do it before things degrade,** not after. The document is only as good as the context still in the window.
- **Installing gives you the whole set** — `/teach` and `/grill-me` arrive in the same plugin.

## Access

Public — no access request needed. It ships in Claude Code's official marketplace, so there is no `marketplace add` step.
