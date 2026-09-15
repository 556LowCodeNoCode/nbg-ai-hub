---
type: glossary
title: Agent (vs chatbot, plus subagents)
audience: beginner
topics: [foundations, agents, orchestration]
internal: false
authored: "2026-05-18"
last_reviewed: "2026-05-24"
external_link: "https://forethought.ai/blog/what-is-an-ai-agent"
deeper_link: null
ai_summary: An agent is a language model wrapped in a loop that lets it call tools — read files, run commands, query APIs — and iterate on its own work until the task is done. A chatbot is the same model without that loop. Claude Code is an agent. Inside Claude Code, you can also spawn focused subagents to delegate sub-tasks without polluting the parent context.
tldr: "An AI assistant that can take actions on your behalf — read files, run commands, browse the web — not just chat back. Claude Code is one."
aliases: ["agents"]
---

An **agent** is what you get when you take a [language model](/glossary/#large-language-model) and give it hands. Specifically: a set of *tools* it's allowed to call (read a file, write a file, run a shell command, fetch a URL, query a database…) wrapped in a loop that lets it decide which tool to use, call it, read the output, decide again, and continue — until it thinks the task is done.

A **chatbot** is the same model without the loop. One question in, one answer out. It can produce text but it can't *do* anything in your environment. Claude.ai and ChatGPT's web interface are chatbots (mostly — both are growing agent features over time).

**[Claude Code](/glossary/#claude-code) is an agent.** That's the central thing it does — composing file reads, edits, shell commands, and its own reasoning into one continuous loop.

**What changes when you switch from chatbot to agent:**

| | Chatbot | Agent |
|---|---|---|
| **Blast radius** | A paragraph you can ignore. | A deleted file, a wrong git push, an outbound API call. |
| **Error feedback** | You ignore or correct manually. | Errors compound visibly — compile fails, tests fail, file changes you didn't want. |
| **Iteration** | Copy-paste error → ask again. | Automatic — the agent already saw it, already retried. |
| **What you delegate** | Drafting, brainstorming. | Multi-file refactors, debug loops, "make all tests pass." |
| **What you keep** | All execution. | Approval on risky actions. Review on every diff. |

## Subagents — agents inside agents

Inside a Claude Code session you can spawn **subagents** — fresh Claude instances with their own context window, system prompt, and tool set — to handle one focused job. The parent agent collects the result and discards the subagent's working context. This is the cleanest way to run long, exploratory tasks (research, deep file searches, parallel work) without burning through your main session's tokens.

Use them when:
- The sub-task is *exploratory* (you don't know what you'll find)
- You don't want the noise polluting your main context
- The sub-task can be parallelised against others
