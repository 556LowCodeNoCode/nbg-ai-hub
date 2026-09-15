---
type: tip
title: Never let the session that wrote the code review the code
audience: beginner
topics: [safety, workflow]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: Asking the session that just built something to check its own work gets you a confident pass. The session carries every assumption it made while building. Open a fresh session, give it the diff and no history, and ask it to find what's wrong.
---

At the end of a build, the natural thing to type is *"now review what you just wrote."*

You will almost always be told it's fine.

The session that wrote the code is the worst possible reviewer of it. It made a hundred small decisions along the way and holds all of them as settled. Asking it to review is asking it to disagree with itself, using the same reasoning that produced the code in the first place. That's not review, it's a second opinion from the same person.

## The fix

Open a **new session**. Give it the diff and nothing else.

> Review the uncommitted changes in this repo. I didn't write them and I don't know what they were meant to do. Tell me what looks wrong, risky, or unfinished.

The fresh session has no investment in the decisions. It reads the code as code. Things the building session considered obvious — and therefore never questioned — are exactly what it flags.

Claude Code has a built-in for this too: **`/code-review`**.

## Why "I don't know what they were meant to do" is in the prompt

Deliberately. If you explain the intent, you hand the reviewer the same frame the builder had, and it will tend to evaluate whether the code matches your description rather than whether the code is any good. Withholding the intent forces it to work out what the code actually does — which is where the surprises are.

## The rhythm

1. Build in one session, including running the tests.
2. Commit, or at least leave the changes uncommitted and visible.
3. **New session.** Review the diff cold.
4. Take the findings back to the building session if you want them fixed in context.

Step 3 is the one people skip, and it's the one that catches things.

This pairs with the always-review-changes tip — that one is about *you* reading the diff, this one is about getting a second machine opinion that isn't compromised.
