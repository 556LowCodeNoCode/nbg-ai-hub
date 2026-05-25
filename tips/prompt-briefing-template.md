---
type: tip
title: Brief Claude like a colleague (the 5-line template)
audience: beginner
topics: [prompting, fundamentals]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: null
deeper_link: null
ai_summary: A one-line prompt gets one-line-quality work. Brief Claude with Role + Goal + Task + Constraints + Context — the same shape you'd hand a colleague who's helping with the task.
---

A one-line prompt gets you one-line-quality work. The fix isn't writing *more* text — it's writing the right text. Five lines, in this order:

1. **Role** — who Claude should act as ("You're helping a credit-risk analyst…")
2. **Goal** — what the work is for ("…prep for Tuesday's risk committee.")
3. **Task** — the actual ask ("Summarise the attached Q3 portfolio report.")
4. **Constraints** — what must be true ("Plain language, no jargon, under 300 words.")
5. **Context** — what to read first ("File: `Q3-portfolio.pdf` in this folder.")

**Bad:** "summarise this PDF."

**Good (all five lines):**

> You're helping a credit-risk analyst prep for Tuesday's risk committee. Summarise `Q3-portfolio.pdf` for a non-technical audience. Plain language, no jargon, under 300 words. Lead with the three biggest changes vs. Q2.

You can drop lines when they're genuinely obvious — but most one-line prompts are missing three of the five, not one. The template isn't a checklist to recite, it's the shape of the briefing a colleague would need if you handed the task off in person.

Works for code too, but it shines on non-code work — analyses, summaries, reports, emails, decks — where there's no file path to anchor the prompt and Claude has to guess at the *purpose*.
