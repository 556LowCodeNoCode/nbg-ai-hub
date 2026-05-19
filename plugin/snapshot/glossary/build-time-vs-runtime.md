---
type: glossary
title: Build time vs. runtime
audience: both
topics: [llm-strategy, architecture]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: "https://556lowcodenocode.github.io/Onboarding/"
ai_summary: Two ways to use an LLM — at build time (Claude helps you create a tool once, then the tool runs without an LLM) versus runtime (the tool calls an LLM on every execution). Picking the right one matters for cost and data residency.
---

**Build time** — Claude Code helps you write a script, define a workflow, or scaffold a project. Once it's built, it runs on its own. No LLM in the loop at runtime. Predictable cost. Deterministic behaviour.

**Runtime** — The tool you built calls an LLM (Anthropic API, Azure OpenAI, Gemini) every time it runs. Used when the task requires *judgment* — classifying free text, summarising documents, extracting from messy input.

Why this distinction matters at the bank:

- Use deterministic code when you can — it's cheaper and easier to debug.
- Use a runtime LLM only when the task genuinely needs judgement (classification, summarisation, extraction).
- **For real bank data at runtime: it MUST go through Azure OpenAI**, not the public Anthropic API. Data residency is non-negotiable.
