---
type: glossary
title: Model
audience: beginner
topics: [foundations, claude-code]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: "https://docs.claude.com/en/docs/about-claude/models/overview"
deeper_link: null
ai_summary: A model in Claude Code is a specific trained version of Claude that Anthropic publishes — the actual large language model the agent is wrapped around. Three current families (Opus, Sonnet, Haiku) trade off depth of reasoning against speed and cost, each with numbered releases. Switch inside Claude Code with /model — pick for speed × task fit, not cost.
tldr: "A specific version of Claude. Opus is the smartest, Haiku is the fastest, Sonnet is the middle ground. Switch with /model in Claude Code."
aliases: ["models"]
---

A **model** in this context is a specific trained version of Claude that Anthropic has published. It's the large language model the agent is wrapped around — the actual prediction engine doing the work. Claude Code, the skill, the loop, the tools — those are the scaffolding. The model is what's *thinking*.

Anthropic currently ships three families, each with numbered releases:

- **Opus** — deepest reasoning, slowest, most expensive. The right call for ambiguous specs, novel architecture, hard debugging, cross-cutting design decisions, long-horizon plans. Latest: Opus 4.7.
- **Sonnet** — the daily driver. Multi-file edits, refactors, building from a clear spec, normal debugging, scaffolding. Right the first try on most work. Latest: Sonnet 4.6.
- **Haiku** — cheap and instant. Only the right pick for truly one-shot mechanical work: format conversion, batch rename, single-file grep-and-edit, pure transformation. The moment any judgment is needed, prefer Sonnet — it'll be net faster because it'll be right the first try. Latest: Haiku 4.5.

Inside Claude Code, switch models with:

```
/model <name>
```

The optimisation target here is **speed × task fit**, not cost. A heavy model on a trivial task is over-spec'd but not broken; a light model on a complex task is genuinely problematic — it'll churn, miss the point, and burn more wall-clock time than the model upgrade would have cost. Asymmetric tolerance: lean heavier rather than lighter when in doubt.

The model number bumps roughly every few months. The family names stay stable — `Sonnet` will keep meaning "the daily driver" even when 4.6 becomes 4.7 becomes 5.0.
