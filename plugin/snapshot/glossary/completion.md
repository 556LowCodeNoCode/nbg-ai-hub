---
type: glossary
title: Completion
audience: beginner
topics: [foundations, prompting]
internal: false
authored: "2026-05-27"
last_reviewed: "2026-05-27"
external_link: null
deeper_link: null
ai_summary: The text the model produces back when you give it a prompt. The flip side of "prompt in" — completion out. In Claude Code, every response Claude types in the terminal is a completion; so is every file edit, every tool call, every bit of generated text that follows your input.
tldr: "Whatever the model produces back when you give it a prompt. Prompt in, completion out — that is the whole vocabulary."
aliases: ["completions"]
---

A **completion** is the text the model produces back when you give it a [prompt](/glossary/#prompt). The name comes from the underlying mechanic: the model is *completing* your input — predicting what comes next, one token at a time, until it decides the response is finished.

**Prompt in, completion out. That's the whole vocabulary.**

In a chat product like Claude.ai or ChatGPT, the completion is the message you see appear in the conversation. In [Claude Code](/glossary/#claude-code), a completion is broader — it includes the prose Claude types back in the terminal, every file edit it proposes, every tool call it makes, and every reasoning step it shows. All of it is "what the model produced in response to the prompt."

A few things worth knowing:

- **Completions are statistical, not authored.** The model has no plan when it starts generating. It picks the next token, then the next, then the next — and the [completion](/glossary/#completion) emerges. That's why a tighter prompt usually yields a tighter completion: less ambiguity to drift through.
- **Completions are billed by the token.** Every token the model produces — every word in its reply, every line of code, every comment — counts against the [token](/glossary/#token) budget for the session and against your usage limit on the API.
- **Completions are not memory.** Once a completion finishes, it sits in the [context window](/glossary/#context-window) as part of the conversation history. If the window fills up, the completion can be summarised or dropped just like anything else. The model does not "remember" what it said — it re-reads it from the window each turn.

When someone says "the completion was wrong" or "the completion hallucinated," they mean the model's output was inaccurate. The fix is at the prompting end — clearer instructions, tighter context, more grounding — or at the verification end (review the diff, don't trust unverified citations). The model itself doesn't know whether a completion is correct; it only knows it is plausible.
