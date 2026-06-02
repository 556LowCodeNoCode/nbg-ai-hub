---
type: tip
title: Correct with 'No, what I meant was…'
audience: beginner
topics: [prompting]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: null
ai_summary: When Claude misunderstood, lead the correction with 'No, what I meant was…' — it's shorter than re-explaining everything and Claude takes the cue cleanly.
---

The fastest way to redirect Claude when its answer is off-target is the phrase **"No, what I meant was…"**.

It's a short, unambiguous signal that means: *"don't keep building on what you just did — back up and try again."*

Don't re-paste the whole prompt. Don't apologise. Don't `/clear`. Just:

> No, what I meant was — the bug is in the **frontend** rendering, not the backend query. The data is fine; the chart just isn't picking it up.

Claude reads that as a hard correction and pivots. Far better than letting it build a wrong solution further or starting over from scratch.
