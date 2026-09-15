---
type: skill
title: prototype — throwaway code that answers one question
audience: both
topics: [prototyping, design, workflow]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: "https://github.com/mattpocock/skills/tree/main/skills/engineering/prototype"
deeper_link: "https://github.com/mattpocock/skills"
ai_summary: Builds deliberately disposable code to answer a specific design question — does this flow feel right, is this data model workable, which of these three layouts wins. The output is a decision, not a codebase, and the code is meant to be deleted.
when_to_use: Use this when you are stuck arguing about a design in the abstract and it would be quicker to look at two versions of it.
install_command: "/plugin install mattpocock-skills@claude-plugins-official"
skill_id: prototype
origin: community
category: code
status: active
maintainer: "@mattpocock"
time_saved: "~a week of spec arguments"
worked_scenario: "Three people disagree about how a complaints queue should be sorted, and the meeting has happened twice. Instead of a third meeting, ask for a prototype of each option. Twenty minutes later there are two clickable versions and the argument resolves in about ninety seconds, because everyone is now pointing at a screen instead of describing one."
---

The useful idea here is older than Claude and cheaper than it has ever been: when a design argument won't resolve, stop describing and start showing.

A prototype is **throwaway code that answers a question**. The question decides what gets built — and what gets ignored. No error handling, no tests, no persistence, unless the question is about error handling, tests or persistence.

## When it earns its place

- You can't tell whether a flow feels right until you click it.
- The data model looks fine on a whiteboard and you suspect it isn't.
- There are three plausible layouts and everyone has an opinion.

Asking for options A / B / C is the strongest move. Reacting to something concrete is far easier than specifying it from a blank page, especially for colleagues who don't write code and have been asked "so what do you want it to look like?"

## Worth knowing

- **Delete it.** The whole value is that it's disposable. A prototype that quietly becomes production is the most expensive thing on this page.
- **Say what the question is.** "Build me a prototype" without a question produces a small unfocused app. "Prototype whether one-click approval is confusing" produces an answer.
- **Pairs with** [show, don't describe](/tips/prompt-show-dont-describe/) and the *Level up* step on the [use cases](/use-cases/) — same instinct, applied to a whole build.
- **Installing gives you the whole set** — `/teach`, `/handoff` and `/grill-me` arrive in the same plugin.

## Access

Public — no access request needed. It ships in Claude Code's official marketplace, so there is no `marketplace add` step.
