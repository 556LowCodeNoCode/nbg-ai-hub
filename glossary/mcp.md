---
type: glossary
title: MCP (Model Context Protocol)
audience: both
topics: [protocol, integrations]
internal: false
authored: "2026-05-18"
last_reviewed: "2026-05-18"
external_link: null
deeper_link: null
ai_summary: An open protocol that lets Claude Code talk to external tools, data sources, and services through a uniform interface — think USB-C for AI integrations.
tldr: "A standard way to plug Claude Code into outside tools and data — Jira, Slack, your calendar. Think of it as a universal adapter for AI."
aliases: []
---

MCP is the protocol Claude Code uses to plug into the outside world: databases, file systems, APIs, Jira, Gmail, Figma. Each integration ships as an MCP server you register once and then call by name in conversation. The big win is that you don't write glue code every time — the server exposes its capabilities and Claude figures out how to use them.
