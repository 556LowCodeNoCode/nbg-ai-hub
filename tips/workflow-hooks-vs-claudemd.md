---
type: tip
title: Hooks for the non-negotiables — CLAUDE.md only asks nicely
audience: advanced
topics: [workflow, advanced]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: https://code.claude.com/docs/en/hooks
deeper_link: null
ai_summary: CLAUDE.md is advisory — Claude follows it about 80% of the time. Hooks are deterministic — they run every time, no exceptions. If something must happen 100% of the time (lint, security check, format), make it a hook.
---

There's one detail about CLAUDE.md that takes most teams a few weeks to internalise: **it's advisory.** Claude reads it at the start of every session and tries to follow it. Most of the time it does. Not every time.

The empirical number that floats around the Anthropic team and community guides: ~80% adherence. Good enough for "prefer `const` over `let`". Not good enough for "never force-push to main" or "always run the linter after editing".

For the things that *must* happen, use **hooks**. A hook is a shell command Claude Code runs on a specific event — and it runs deterministically, every time.

The events worth knowing:

- **`PreToolUse`** — fires before Claude calls a tool. Use to block dangerous commands or require a confirmation. Example: "if Claude tries to run `git push --force`, refuse."
- **`PostToolUse`** — fires after. Use to enforce post-edit invariants. Example: "after any file edit, run `npm run lint --fix`."
- **`Stop`** — fires when Claude finishes a turn. Use for safety nets. Example: "after every turn, run the test suite; if it fails, surface the failures to the next prompt."
- **`UserPromptSubmit`** — fires when you press enter on a prompt. Use to inject context. Example: "before every prompt, append the current git branch name."

Hooks are configured in `.claude/settings.json` (project) or `~/.claude/settings.json` (personal). A minimal example — auto-lint after every edit:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "npm run lint:fix --silent"
      }
    ]
  }
}
```

After every `Edit` or `Write`, the lint runs. Claude can't forget it. The hook doesn't need permission. It just happens.

The mental model that helps:

| If the rule is… | …put it in… |
|---|---|
| "Prefer this style" / "Use this pattern" | CLAUDE.md |
| "Always run this after editing" | `PostToolUse` hook |
| "Block this dangerous command" | `PreToolUse` hook |
| "Surface this on every prompt" | `UserPromptSubmit` hook |

A small warning: hooks compose with permission modes and slash commands in non-obvious ways. Start with one hook, see how it behaves, then add more. Hooks that fail noisily are annoying; hooks that fail silently are dangerous. Log generously while you're tuning them.
