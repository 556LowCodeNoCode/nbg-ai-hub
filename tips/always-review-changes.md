---
type: tip
title: Always look at the diff before you accept
audience: beginner
topics: [safety]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: null
ai_summary: Claude is fast and capable — treat it like a brilliant junior. Read what it's about to change before saying yes. Skipping the diff review is the most expensive habit a newcomer can pick up.
---

The mental model: Claude is a brilliant junior colleague. Capable, fast, mostly correct. But *brilliant junior* still means **review-before-merge**.

Every time Claude proposes a change, it shows you the diff before applying. Read it. Even briefly. Even when you trust the result.

The two failure modes the diff catches:

1. **Wrong scope** — Claude edited 14 files when you wanted 1. Easier to catch in the diff than to undo later.
2. **Subtle wrong fix** — Claude "fixed" a bug by suppressing the symptom instead of finding the cause. Often invisible if you don't read the code.

Trust grows over time as Claude learns your project (via `CLAUDE.md` and skills). It never grows to "auto-accept everything". The diff is cheap; the cleanup isn't.
