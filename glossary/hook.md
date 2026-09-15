---
type: glossary
title: Hook
audience: advanced
topics: [automation, customization, claude-code]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: "https://docs.claude.com/en/docs/claude-code/hooks"
deeper_link: null
ai_summary: A hook is a shell command Claude Code runs automatically at specific event points — before/after a tool call, on session start, on session stop. Hooks are configured in settings.json and run in the host shell, not the sandbox, which makes them powerful enough to enforce repo-wide policies and powerful enough to wedge your whole session if you write a bad one.
tldr: "A command Claude Code runs automatically at certain moments — before a tool runs, when a session ends. Used for guardrails and automation."
aliases: ["hooks"]
---

A **hook** is a shell command Claude Code runs automatically at a specific event point in a session. The event points include:

- **PreToolUse** — fires before a tool call (file edit, bash command, web fetch). Can block the call.
- **PostToolUse** — fires after a tool call completes
- **SessionStart** — fires when a session boots
- **Stop** — fires when Claude finishes a turn
- a handful of others (notification, subagent-stop, etc.)

Hooks are configured in JSON, either at the user level in `~/.claude/settings.json` or per-project in `.claude/settings.local.json`. Each entry binds an event to a shell command:

```json
{
  "hooks": {
    "Stop": [
      { "command": "scripts/check-decisions-updated.sh" }
    ]
  }
}
```

**Why they matter.** They're how you enforce policy that Claude itself can't be trusted to remember. NbgAiHub uses a `Stop` hook to warn when source files change but `DECISIONS.md`/`SCOPE.md`/`Issues - Pending Items.md` haven't — exactly the kind of thing a model will skip on turn 50 of a long session. Hooks catch it deterministically because the *harness* runs them, not the model.

**The sharp edge.** Hooks execute in the host shell, not inside Claude's sandbox. They can do anything bash can do — touch your filesystem, hit the network, eat CPU, prompt for input. A misconfigured `PreToolUse` hook that exits non-zero will block every single tool call until you fix it. Edit them with the same care you'd edit a git pre-commit hook.

Inspect or edit the active set with `/hooks` from inside Claude Code.
