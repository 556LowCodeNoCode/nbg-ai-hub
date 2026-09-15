---
type: skill
title: skill-creator — write a skill of your own
audience: advanced
topics: [authoring, skills, productivity]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: "https://github.com/anthropics/skills/tree/main/skills/skill-creator"
deeper_link: "https://code.claude.com/docs/en/skills"
ai_summary: Anthropic's official skill for building skills — drafts one from a description, then helps you test and tune it with eval cases so you can tell whether it actually fires when it should, instead of guessing.
when_to_use: Use this when you have explained the same procedure to Claude three times and it should have been written down once.
install_command: "/plugin install skill-creator@claude-plugins-official"
skill_id: skill-creator
origin: external
category: productivity
status: active
maintainer: "@anthropics"
time_saved: "~a day per skill you'd otherwise hand-write"
worked_scenario: "Your team has a specific way of writing release notes — a fixed order, an approval line, a Jira reference format. You have now explained it to Claude on four separate occasions. `skill-creator` turns that explanation into a skill, then helps you write a handful of test prompts to check it actually triggers on 'write the release notes' and stays quiet when you're doing something else."
---

The moment to reach for this is recognisable: you are pasting the same paragraph of instructions into Claude for the third time.

A skill is a folder with a `SKILL.md` in it. The official template is six lines long. `skill-creator` writes the first draft, then — the part people skip — helps you *measure* whether it works.

## The part that decides whether your skill is any good

**The description field.** It is the only part Claude always has loaded, and it is what decides whether the skill fires at all. A vague description produces a skill that either never triggers or triggers constantly. Write what it does, when to use it, and — just as important — when *not* to.

The document skills on this page are a good model: read the `description` on `xlsx` and notice how much of it is spent on when *not* to trigger.

## Before you write one, check it shouldn't be something simpler

- A standing rule for one project → put it in `CLAUDE.md` (see [the worked example](/tips/claudemd-worked-example/)).
- A prompt you rerun by hand → a [slash command](/tips/workflow-slash-commands/).
- Something that must happen every time, without Claude choosing to → a [hook](/tips/workflow-hooks-vs-claudemd/).

A skill is right when Claude should decide *for itself* that now is the moment to follow your procedure.

## Worth knowing

- **Decide user-invoked vs model-invoked deliberately.** A skill Claude may fire on its own needs a much more carefully written description than one you always type yourself.
- **Test it.** `claude plugin eval` runs eval cases against a plugin and scores the result. Unmeasured skills tend to be worse than their authors think.
- **Keep it short.** The body loads only when the skill triggers, but it still spends context. Write the gotchas, not a manual.

## Access

Public — no access request needed. It ships in Claude Code's official marketplace, so there is no `marketplace add` step.
