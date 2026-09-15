---
type: tip
title: End a session with a handoff, not a summary
audience: both
topics: [workflow, context]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: A summary is written for a human and is nearly useless to the next session. A handoff is written for Claude — it points at files, names what was already tried and failed, and says where to start. Ask for a handoff instead and the next morning starts warm.
---

Ending a long session, most people ask for a summary. It reads well and helps almost nothing tomorrow.

The problem: a summary describes *what happened*. The next session needs to know *what to do* — which files matter, what's already been ruled out, and where to pick up. Those are different documents.

Ask for the second one.

> Write a handoff for the next session. Point at the specific files that matter, say what we already tried that didn't work and why, and state exactly where to begin. Write it for Claude to act on, not for me to read.

Four things a good handoff has that a summary doesn't:

- **Pointers, not copies.** File paths, not pasted contents. The next session can read the file; it can't un-read a stale copy of it.
- **The failed attempts.** "We tried X, it broke because Y" saves the next session from repeating it. Summaries almost always omit this — failures don't feel like progress worth reporting.
- **A starting instruction.** Not "the auth work is in progress" but "start by running the failing test in `auth/login.test.ts` and read the error".
- **Open questions, named as questions.** So the next session asks you instead of guessing.

## Use it mid-session too

Handoffs aren't only for the end of the day. When something out-of-scope comes up mid-task — a bug you noticed, a side question that needs real work — you have three bad options and one good one.

Bad: do it now and dilute the session. Bad: wipe context to make room. Bad: try to hold both tasks at once.

Good: hand the side task off to a fresh session, and keep this one on its original job.

> Write a handoff for a separate session that just does [the side task]. Include only the context that task needs.

## Don't escalate — hand off

When you're stuck, the instinct is to reach for a bigger model. It rarely helps, because the conversation carries the same wrong assumptions forward into the bigger model.

Write the handoff, start fresh. A clean session with a good brief beats a bigger model with a polluted one.
