---
type: glossary
title: Token
audience: beginner
topics: [foundations, ai-basics]
internal: false
authored: "2026-05-24"
last_reviewed: "2026-05-24"
external_link: "https://platform.openai.com/tokenizer"
deeper_link: null
ai_summary: The unit a language model thinks in. Roughly 3-4 characters of text, or about ¾ of a word on average. Every prompt, every response, every file the model reads is measured in tokens — and the model's context window is a fixed-size budget of them.
tldr: "The chunks of text an AI thinks in — roughly three-quarters of a word each. Pricing and memory limits are both counted in tokens."
aliases: ["tokens"]
---

A **token** is the unit a language model reads and produces. Not a character, not exactly a word — somewhere in between. Common English words are often a single token; less-common words split into two or three. Code symbols, punctuation, and whitespace also count.

Quick rule of thumb: **1 token ≈ ¾ of a word ≈ 3-4 characters**. A 500-line source file is about 2,000-3,000 tokens. A typical chat exchange might be 100-1,000 tokens per turn. Your [CLAUDE.md](/glossary/#claudemd) might be 500-2,000 tokens — paid once per session.

Tokens matter because they're the *unit of currency* for two things you actually care about:

1. **Context window size.** Modern Claude models hold ~200,000 tokens of working memory. Everything in the conversation — your prompts, the model's replies, the files it reads, the tool outputs — counts against that budget.
2. **Pricing on the API.** Pay-per-token billing. Input tokens are cheaper than output tokens. Long sessions get expensive fast.

OpenAI ship a [tokenizer playground](https://platform.openai.com/tokenizer) where you can paste text and see how it splits. Useful for building intuition.

Not to be confused with: **API tokens** (an authentication string), **NFT tokens**, **OAuth tokens**, or any other "token" in the security/auth sense.
