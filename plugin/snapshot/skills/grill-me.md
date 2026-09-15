---
type: skill
title: /grill-me — get interrogated before anything gets built
audience: both
topics: [planning, requirements, workflow]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: "https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me"
deeper_link: "https://github.com/mattpocock/skills"
ai_summary: Turns Claude into an interviewer that works through your plan as a decision tree, one round of numbered questions at a time — each with its recommended answer — until nothing is left silently assumed. It refuses to start building until you confirm you agree.
when_to_use: Use this when you have a half-formed idea and you know the expensive mistakes are the assumptions you haven't noticed yet.
install_command: "/plugin install mattpocock-skills@claude-plugins-official"
skill_id: grill-me
origin: community
category: workflow
status: active
maintainer: "@mattpocock"
time_saved: "~a day of rework per project"
worked_scenario: "You want a tool that chases missing KYC documents. It sounds like a two-day build. `/grill-me` opens with a round of numbered questions — who owns the chase, what happens on the third reminder, does a partial document count, what's the audit requirement — each with a recommended answer so you're reacting, not composing. Round two only asks what round one unblocked. By the end you either have a real spec or you've discovered the thing is three separate tools."
---

Beginners skip the thinking step because Claude is fast enough that building feels cheaper than planning. `/grill-me` puts the thinking back, and makes it Claude's job rather than yours.

```
/grill-me
```

Then describe the idea. What follows is an interview, not a chat.

## How it actually behaves

- **Rounds, not a firehose.** It maps your idea as a decision tree and asks only the questions whose prerequisites are already settled. Your answers push the frontier outward and unlock the next round.
- **Every question comes with its recommended answer.** You're reacting to a proposal rather than inventing one from nothing — much easier when you're new to the domain.
- **It looks things up itself.** Facts it can find on disk are not your job; it dispatches a sub-agent and keeps asking you the questions only you can answer.
- **It won't start until you say so.** The session ends when nothing is left assumed and you confirm you agree.

## Worth knowing

- **The skill is a one-line shim.** `/grill-me` immediately calls a skill named `grilling`, which does the work. If you see `grilling` in the logs, that's expected.
- **It is deliberately relentless.** That's the point, but it makes it the wrong tool for a five-minute fix.
- **Related but different:** [plan first](/tips/workflow-plan-first/) is the free, built-in version of this instinct. Start there; reach for `/grill-me` when the stakes justify the interrogation.
- **Installing gives you the whole set** — `/teach` and `/handoff` arrive in the same plugin.

## Access

Public — no access request needed. It ships in Claude Code's official marketplace, so there is no `marketplace add` step.
