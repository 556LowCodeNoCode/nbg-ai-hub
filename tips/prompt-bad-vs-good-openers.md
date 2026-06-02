---
type: tip
title: Bad vs. good openers
audience: beginner
topics: [prompting]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-28"
external_link: null
deeper_link: null
ai_summary: A useful prompt names the file, the symptom, the repro, and the desired action. Vague prompts get vague results. The five-part shape gives Claude what it needs on the first try.
---

Claude doesn't have your project in its head until you point at it. Cold-start prompts get cold-start answers.

The five-part shape of an opener that gives Claude what it needs:

1. **Location** — the file, folder, page, or document involved
2. **Symptom** — what's currently happening
3. **Repro** — how to make the symptom happen (URL, test name, user step)
4. **Desired** — what should happen instead
5. **Constraint** *(optional)* — anything that's locked in (don't break X, must use Y)

**Bad:** "Fix the dashboard."

**Good:** "In `src/pages/dashboard.tsx`, the empty-state placeholder is overlapping the chart legend. Repro: log in as `empty@example.com` and open `/dashboard`. I want the placeholder centred and the legend hidden when there's no data."

Notice: the good version is one short paragraph, not a wall of text. Specificity beats length.

When the prompt is more open than a bug fix — exploring a new area, planning a refactor — front-load the grounding with the **"Read X. Then ask Y"** pattern:

> Read `src/services/billing.ts` and `src/routes/billing.ts`. Then tell me where invoice totals are computed and whether there's a single source of truth.

Two sentences. First sets context, second asks the question. Stops Claude from guessing what file you meant.
