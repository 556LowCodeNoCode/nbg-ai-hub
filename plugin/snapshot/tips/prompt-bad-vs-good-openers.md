---
type: tip
title: Bad vs. good openers
audience: beginner
topics: [prompting, examples]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: "https://556lowcodenocode.github.io/Onboarding/"
ai_summary: A useful prompt names the file, the symptom, the repro, and the desired action. Vague prompts get vague results.
---

The five-part recipe for an opener that gives Claude what it needs:

1. **Location** — the file, folder, or page involved
2. **Symptom** — what's currently happening
3. **Repro** — how to make the symptom happen (URL, test name, user step)
4. **Desired** — what should happen instead
5. **Constraint** *(optional)* — anything that's locked in (don't break X, must use Y)

**Bad:** "Fix the dashboard."

**Good:** "In `src/pages/dashboard.tsx`, the empty-state placeholder is overlapping the chart legend. Repro: log in as `empty@example.com` and open `/dashboard`. I want the placeholder centred and the legend hidden when there's no data."

Notice: the good version is one short paragraph, not a wall of text. Specificity beats length.
