---
type: glossary
title: Tool use
audience: beginner
topics: [foundations, agents]
internal: false
authored: "2026-05-24"
last_reviewed: "2026-05-24"
external_link: null
deeper_link: null
ai_summary: How an LLM does things beyond producing text. Tools are functions the model is allowed to call — read a file, run a shell command, fetch a URL, query a database. Tool use is what turns a language model into an agent.
tldr: "How an AI does things beyond chatting — reading a file, running a command, fetching a webpage. Each ability the AI can use is called a tool."
aliases: ["tool use", "tool calling", "tool calls"]
---

**Tool use** is the mechanism by which a [language model](/glossary/#large-language-model) does anything beyond producing text. The model is given a list of *tools* — functions it's allowed to call — each described by a name, a JSON schema of its arguments, and a one-line summary of what it does. When the model decides a tool is the right next step, it emits a structured "call this tool with these arguments" message instead of regular text. The runtime sees the call, executes the tool, packages the output, and feeds it back into the model's context for the next turn.

**Examples of tools in Claude Code:**

| Tool | What it does |
|------|--------------|
| `Read` | Read a file from the filesystem |
| `Write` | Create or overwrite a file |
| `Edit` | Apply a string-replace edit to an existing file |
| `Bash` | Run a shell command |
| `Grep` | Search file contents with a regex |
| `WebFetch` | Fetch a URL and convert to markdown |
| `Agent` | Spawn a subagent for a focused sub-task |

Tool use is what turns a model into an [agent](/glossary/#agent). Without tools, an LLM can only describe what you should do; with tools, it can do it. This is the difference between Claude.ai (chatbot) and Claude Code (agent).

**Two things to know in practice:**

1. **You can register your own tools** via [MCP](/glossary/#mcp) servers or via custom skills. Anything you wire up — a database query, an internal API call, a deploy script — the model can then orchestrate.
2. **Tool calls cost tokens.** The model's "call this tool" message plus the tool's output both count against your [context window](/glossary/#context-window). A noisy tool that returns 50K tokens of output will eat your context fast.
