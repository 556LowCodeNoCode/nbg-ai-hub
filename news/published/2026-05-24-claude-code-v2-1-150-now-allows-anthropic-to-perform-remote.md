---
type: news
title: Claude Code v2.1.150 now allows Anthropic to perform remote system prompt injection
audience: advanced
topics:
  - security
  - system-prompt-injection
  - platform-news
  - claudecode
editor_confidence: high
internal: false
authored: 2026-05-24
last_reviewed: 2026-05-24
external_link: https://www.reddit.com/r/ClaudeCode/comments/1tmizuy/claude_code_v21150_now_allows_anthropic_to/
deeper_link: null
ai_summary: Claude Code version 2.1.150 introduced a new capability allowing Anthropic to perform remote system prompt injection via network calls, which can modify the system prompt dynamically. This change was undocumented in the changelog and can be mitigated by environment variables that disable nonessential network traffic and GrowthBook feature flags.
source: r/ClaudeCode
fingerprint: 6a89ead47f306d6b
---

Claude Code version 2.1.150 introduced a new capability allowing Anthropic to perform remote system prompt injection via network calls, which can modify the system prompt dynamically. This change was undocumented in the changelog and can be mitigated by environment variables that disable nonessential network traffic and GrowthBook feature flags.

> Source: [r/ClaudeCode](https://www.reddit.com/r/ClaudeCode/comments/1tmizuy/claude_code_v21150_now_allows_anthropic_to/)
