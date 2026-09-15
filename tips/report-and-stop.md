---
type: tip
title: '"Report and stop" — tell Claude where the work ends'
audience: beginner
topics: [prompting, control]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: Claude will happily turn a question into a project. Add an explicit boundary — "report findings and stop" for questions, "go ahead and implement" for work — and you stop getting changes you didn't ask for.
---

You ask *"why is this report slow?"* and come back to six modified files and a refactored query layer.

Nothing went wrong, exactly. You asked a question that sounded like a complaint, and Claude read it as a job. The fix is to say which one it is.

## Two phrases

**When you want analysis:**

> Look into why this is slow. Report what you find and stop — don't change anything yet.

**When you want action:**

> Go ahead and implement it. Don't stop to check in unless you hit something that contradicts what I've told you.

Almost every prompt is one of those two, and almost nobody says which.

## Why beginners hit this harder

Experienced users have internalised a rhythm — investigate, agree, then execute — and signal it without thinking. A newcomer types the way they'd talk to a colleague, where "can you look at the login bug?" obviously means look first. Claude doesn't share that convention unless you supply it.

## The stronger version: bound the scope too

"Stop" handles *when*. You often also want *how far*:

> Fix the date parsing in `import.ts`. Don't refactor anything around it, don't add tests, don't tidy the imports — just the date bug.

This is the antidote to the specific failure where a one-line fix arrives as a 200-line "while I was in there" cleanup. The cleanup may even be good. It's still not what you asked for, and now your diff is unreviewable.

Pair this with plan mode (Shift+Tab) when the work is big enough that you want to see the plan before any of it happens.
