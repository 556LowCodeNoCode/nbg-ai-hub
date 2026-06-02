---
type: skill
title: frontend-design — distinctive UI generation
audience: both
topics: [frontend, design, ui]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-06-02"
external_link: "https://github.com/anthropics/skills/tree/main/skills/frontend-design"
deeper_link: https://claude.com/plugins/frontend-design
ai_summary: Anthropic's official frontend-design skill — generates production-grade components and pages with distinctive visual choices, avoiding the generic "AI-slop" aesthetic that gives away machine-generated UIs.
when_to_use: Use this when you want a frontend that looks intentional, not algorithmic — when Claude's default Tailwind-card-and-shadow output would give away that a human didn't sit at the keyboard.
marketplace_command: "/plugin marketplace add anthropics/skills"
install_command: "/plugin install frontend-design@skills"
skill_id: frontend-design
origin: community
category: code
status: active
maintainer: "@anthropics"
time_saved: "~1-2 hours per page"
worked_scenario: "Building a landing page for a new internal dashboard. Without the skill: Claude produces a competent-but-generic gradient hero, three feature cards, and a pricing table — fine, but recognisably AI-shaped. With `frontend-design`: the same prompt produces a layout with unexpected type scale, an asymmetric hero, and a colour palette that wasn't reached for by reflex. Same effort; output that doesn't apologise for being machine-made."
---

`frontend-design` is Anthropic's official skill for steering Claude away from default UI output. The default Claude aesthetic — symmetric cards, generic shadows, the same Tailwind palette every time — is recognisable from across the room. This skill pushes the model toward distinctive choices: unusual fonts, bolder colour palettes, atmospheric effects.

Use it: when the visual outcome actually matters and you don't want the page to look obviously generated. Pairs well with `/team` for end-to-end feature work where the front end is part of the deliverable.

## Access

Public — no access request needed. It's an Anthropic-published skill in the official `anthropics/skills` marketplace.

## What this catalog entry does *not* cover

The skill itself ships with worked-example aesthetics (Stripe, Linear, Apple-influenced, etc.) — those are documented upstream in the [Claude plugin page](https://claude.com/plugins/frontend-design). This hub entry is the "should I install this?" decision page, not the full skill manual.
