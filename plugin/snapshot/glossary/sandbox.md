---
type: glossary
title: Sandbox
audience: beginner
topics: [infrastructure, tooling, claude-code]
internal: false
authored: "2026-06-17"
last_reviewed: "2026-06-17"
external_link: "https://claude-code-sandbox.azurewebsites.net/"
deeper_link: null
ai_summary: NBG's personal cloud VM offering — one Linux machine per colleague, with Claude Code pre-installed, reached through a small desktop app. The way to use Claude on bank data without anything sensitive sitting on your laptop.
tldr: "NBG's personal cloud Linux VM with Claude Code pre-installed. One per colleague, reached through a small desktop app. Bank data stays in the cloud."
aliases: ["sandboxes", "Sandbox Connect"]
---

The Sandbox is an internal NBG offering that gives every colleague their own personal Linux VM, sitting in the bank's private Azure cloud, with Claude Code already installed and ready to use.

You reach it from a small desktop app called **Sandbox Connect**. One click connects your laptop to your VM; files move by drag-and-drop; whatever Claude builds on the VM opens in your laptop's browser as if it ran locally. The technical plumbing — network, certificates, identity, audit logging — is handled for you.

Why use the Sandbox instead of running Claude on your laptop:

- **Bank data never touches your machine.** Files live on the VM. Prompts travel from the VM to Claude inside NBG's own cloud — never through your laptop.
- **Lost or stolen laptop = nothing on disk + one click to revoke access.**
- **No install gymnastics.** Claude Code, Docker, Node + pnpm, Python via uv, Playwright, and Git all come pre-loaded.

When to skip the Sandbox: public OSS work, hackathon side projects, throwaway examples where you're just learning Claude. For "anything you'd hesitate to paste into a public chatbot", reach for the Sandbox. The full setup walkthrough is shipping later this week — until then, the [Day 1](/start-here/day-1/) page carries the heads-up.
