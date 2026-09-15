---
type: glossary
title: Prompt
audience: beginner
topics: [foundations, prompting]
internal: false
authored: "2026-05-24"
last_reviewed: "2026-05-24"
external_link: null
deeper_link: null
ai_summary: The text you give a language model as input. Anything you type into Claude Code is a prompt. The system prompt is the always-loaded instruction layer underneath. Good prompting is half the productivity gain — be specific, set constraints, give examples.
tldr: "Whatever you type to an AI as input. Prompt in, completion out — that is the whole vocabulary."
aliases: ["prompts", "prompting"]
---

A **prompt** is the text you give a [language model](/glossary/#large-language-model) as input. Anything you type into Claude Code is a prompt. The model's response back is the *completion*. **Prompt in, completion out — that's the whole vocabulary.**

The model's response is conditioned on the prompt plus whatever else is in the [context window](/glossary/#context-window): conversation history, files it has read, the system prompt, [CLAUDE.md](/glossary/#claudemd), and any [skills](/glossary/#skill) currently active.

**Three layers of prompting in Claude Code:**

1. **System prompt** — the always-loaded instructions Anthropic ships, plus your CLAUDE.md (project + global). Sets baseline behaviour. You don't see it but it's always there.
2. **User prompt** — what you type each turn.
3. **Tool output** — what gets fed back into the context after a tool call (file contents, shell output, etc.). Indirect, but still part of what the model is conditioning on.

**Good prompts share five properties:**

1. **Specific.** "Refactor `auth.ts` to extract the token-validation logic into its own module" beats "clean up auth."
2. **Constrained.** "Don't change the public API" beats hoping the model intuits it.
3. **Example-led.** "Use the same pattern as `validator.ts`" beats explaining the pattern in prose.
4. **Outcome-shaped.** "All tests in `auth/` pass after the change" gives the model a check.
5. **Short on flattery, heavy on facts.** "Please be careful" adds zero information. "The customer-id is always a UUID v4; never coerce it" adds real signal.

Prompting is half the productivity gain. The other half is keeping context clean. The /tips/ page covers concrete patterns.
