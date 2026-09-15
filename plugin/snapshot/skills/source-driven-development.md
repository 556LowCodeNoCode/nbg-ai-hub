---
type: skill
title: source-driven-development — make Claude cite the docs
audience: both
topics: [verification, compliance, quality]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: "https://github.com/addyosmani/agent-skills/tree/main/skills/source-driven-development"
deeper_link: "https://github.com/addyosmani/agent-skills"
ai_summary: Forces every framework-specific decision to be checked against official documentation and cited, instead of recalled from training data. Training data goes stale and APIs get deprecated; this makes Claude show you the source so you can check it yourself.
when_to_use: Use this when being subtly out of date would be expensive — a library you don't know well, or anything a colleague will copy across a project.
marketplace_command: "/plugin marketplace add addyosmani/agent-skills"
install_command: "/plugin install agent-skills@addy-agent-skills"
skill_id: source-driven-development
origin: community
category: code
status: active
maintainer: "@addyosmani"
time_saved: "~2-4 hours per deprecated-API rabbit hole"
worked_scenario: "You ask for an authentication flow using a library Claude knows well — and it writes the version that was correct eighteen months ago, confidently, with no sign anything is wrong. You lose an afternoon to a deprecation warning that turns out to be load-bearing. With this skill, the same request comes back with links to the current official docs beside each decision, and the outdated pattern never gets written."
---

The failure this fixes is the one most likely to embarrass you: Claude being **confidently out of date**. Wrong code announces itself. Deprecated-but-working code doesn't, until it's in production.

This skill changes the posture. Every framework-specific decision must be backed by official documentation, cited inline, so you can click through and check. Nothing gets implemented from memory.

## Why this one matters here

Two reasons specific to us:

1. **It is the discipline we already ask of ourselves.** This hub has a standing rule that a documented keystroke which does nothing costs more credibility than the missing tip was worth. Same idea, applied to code.
2. **Citations are auditable.** "Claude said so" is not a defence. A link to the vendor's current documentation is.

If you read one related tip, make it [make Claude prove it](/tips/make-claude-prove-it/) — this skill is that instinct, automated and always on.

## Worth knowing

- **It is slower.** Checking sources costs time. That's the trade, and it's worth it exactly when correctness beats speed — not on a throwaway script.
- **Installing gives you 25 skills,** not one. `doubt-driven-development` on this page is in the same bundle.
- **If `/plugin install` fails with a `Permission denied (publickey)` error**, the marketplace is trying to clone over SSH. Use the HTTPS form instead: `/plugin marketplace add https://github.com/addyosmani/agent-skills.git`. Worth knowing on a locked-down bank laptop where you may have no SSH key at all.

## Access

Public — no access request needed. MIT licensed.
