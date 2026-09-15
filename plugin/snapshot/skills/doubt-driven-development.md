---
type: skill
title: doubt-driven-development — a second opinion that hasn't seen the first
audience: advanced
topics: [review, verification, quality]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: "https://github.com/addyosmani/agent-skills/tree/main/skills/doubt-driven-development"
deeper_link: "https://github.com/addyosmani/agent-skills"
ai_summary: Before a non-trivial decision stands, it spawns a fresh-context reviewer whose job is to disprove it rather than approve it. Catches the failure where a long session quietly promotes an assumption into a fact nobody re-checked.
when_to_use: Use this when a wrong answer is expensive and would be cheaper to catch now than to debug later — security logic, migrations, anything irreversible.
marketplace_command: "/plugin marketplace add addyosmani/agent-skills"
install_command: "/plugin install agent-skills@addy-agent-skills"
skill_id: doubt-driven-development
origin: community
category: workflow
status: active
maintainer: "@addyosmani"
time_saved: "~a day per avoided bad merge"
worked_scenario: "Ninety minutes into a session you and Claude agree the reconciliation job can safely run twice on the same batch. Neither of you re-derives it — it was established early and has been treated as settled ever since. A fresh reviewer, given only the claim and none of the reasoning that produced it, asks what happens when the second run lands mid-write. That question never occurs inside the original session, because the original session already believes the answer."
---

Long sessions have a specific failure mode: something plausible gets said early, nobody challenges it, and forty exchanges later it is load-bearing fact. The session cannot catch this, because the session is the thing that believes it.

This skill materialises a reviewer with **fresh context and an explicit bias to disprove**, before the decision stands.

## How it differs from a code review

A review is a verdict on a finished artifact. This is an in-flight posture — it fires while changing course is still cheap, on decisions rather than diffs.

It triggers on the things you'd expect to matter: production auth, security-sensitive logic, high-stakes migrations, irreversible operations, unfamiliar code.

## Why it's marked advanced

Not because it's hard to run — it isn't — but because it costs tokens and wall-clock on every non-trivial decision, and a beginner working on low-stakes tasks will feel that as friction without seeing the payoff. Start with the free version of the same instinct: [review in a fresh session](/tips/review-in-a-fresh-session/) and [be brutally honest](/tips/be-brutally-honest/). Graduate to this when you're shipping something you'd have to explain if it broke.

## Worth knowing

- **Installing gives you 25 skills.** `source-driven-development` on this page is in the same bundle.
- **SSH clone errors on a managed laptop?** Use the HTTPS marketplace form: `/plugin marketplace add https://github.com/addyosmani/agent-skills.git`.

## Access

Public — no access request needed. MIT licensed.
