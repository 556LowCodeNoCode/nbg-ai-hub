---
type: tip
title: Subagents — delegate the file-reading so your main session stays clean
audience: advanced
topics: [workflow]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: https://code.claude.com/docs/en/subagents
deeper_link: null
ai_summary: A subagent runs in its own context window, does its exploration, and reports a summary. Your main session never loads the 40 files it had to read. Best for research-heavy tasks where the input is large and the answer is small.
---

The main reason you'd want a subagent isn't speed — it's **context cleanliness.**

Imagine you ask Claude: "Find every place in the codebase where we cache user data and tell me if the TTLs are consistent." A direct answer would have Claude read 40 files into your conversation. Now those 40 files sit in your context window, and Claude's reasoning on the *next* prompt is dragged through all of them, whether they're relevant or not.

A subagent does the same work in an isolated session. It reads the 40 files in its own context, produces a one-paragraph summary, and hands the summary back to your main session. Your scrollback shows: "I delegated this; here's what came back."

When to reach for a subagent:

- **Research-heavy questions** — "find all callers of X", "list every place we read this env var", "audit the migration files for additive-only".
- **Sandboxed risky exploration** — running shell commands you don't want polluting your main context (test runs, log scrapes).
- **Parallel work** — you can spawn up to ~10 subagents at once. Three subagents looking at three different modules at the same time is faster than three sequential reads in one session.

When to *not* use a subagent:

- The task is tightly coupled to what you're doing right now. The subagent loses the context that mattered.
- You're going to want to drill into the details the subagent looked at. The summary it returns won't include them.

**How to invoke** (project-specific subagents live in `.claude/agents/<name>.md`):

```markdown
---
name: codebase-explorer
description: Read-only codebase exploration; returns structured findings.
tools: [Read, Grep, Glob]
---

You explore the codebase and answer one targeted question per invocation.
Return a 1-paragraph summary and a structured "findings" list.
Do not write files. Do not run shell commands beyond grep.
```

Then from a normal Claude session: *"Use the codebase-explorer subagent to find every place we call `chargeCard`."*

## Don't write the agent file by hand — ask Claude

The frontmatter shape above is the official format, but you don't need to type it from scratch. Describe the subagent's job and let Claude scaffold the file:

> Create a `codebase-explorer` subagent under `.claude/agents/`. It should be read-only — grep, glob, and read files but never write or run shell commands. Returns a one-paragraph summary plus a structured findings list.

Claude writes the markdown, including the `tools` restriction and the prompt body. Review the diff. The subagent is callable from the next prompt onwards.

Trade-off worth naming: a subagent can't reason about the broader plan it's part of. If you push too much logic into subagents, your main Claude loses the holistic view of what's happening. Use them for *bounded* reads, not for the thinking that decides what to do next.
