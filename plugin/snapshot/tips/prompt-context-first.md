---
type: tip
title: Context first, ask second
audience: beginner
topics: [prompting, fundamentals]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: "https://556lowcodenocode.github.io/Onboarding/"
ai_summary: Give Claude the relevant files, paths, or screenshots BEFORE asking it to do anything. Cold-start questions get cold-start answers.
---

Bad: "Fix the dashboard."

Good: "Open `src/pages/dashboard.tsx` — the chart isn't rendering for users with no transactions. Repro: open `/dashboard` while logged in as the test user `empty@example.com`. Fix the empty-state."

Claude doesn't have your project in its head until you point at it. The first job of any prompt is *grounding* — file paths, screenshots, error messages, the failing test name. Once Claude has the right context, it gives a useful answer on the first try instead of guessing.

A pattern that works: "Read X. Then [the actual question]."
