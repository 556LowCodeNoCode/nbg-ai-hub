---
type: tip
title: 'Real bank data at runtime: Azure OpenAI only'
audience: advanced
topics: [compliance, data-residency, llm-strategy]
internal: true
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: "https://556lowcodenocode.github.io/Onboarding/"
ai_summary: If a tool will process real bank data at runtime, its LLM calls MUST go through Azure OpenAI. The public Anthropic API and Gemini are off-limits for real customer data. This is data-residency, not a preference.
---

The team's hard rule: **runtime LLM calls that touch real bank data go through Azure OpenAI. Period.**

Why: data residency. The Anthropic API and Google Gemini do not give us the data-residency and compliance guarantees the bank requires for real customer data. Azure OpenAI does.

Which API for which job:

- **Anthropic API (Claude)** — best reasoning quality. Use freely for **non-confidential** workloads (research, internal docs, public data).
- **Azure OpenAI** — mandatory for **real bank data** at runtime. Always.
- **Gemini** — large-context tasks (huge documents). Non-confidential only.

This applies to **runtime** LLM calls (the tool calls an LLM each time it runs). It does NOT apply to using Claude Code itself for build-time work — Claude Code is the AI assistant we use to *write* the tool, not the LLM the tool calls in production.

When in doubt, ask. Compliance review beats data-residency incident.
