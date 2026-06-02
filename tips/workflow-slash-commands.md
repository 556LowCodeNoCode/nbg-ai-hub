---
type: tip
title: Custom slash commands — turn repeated workflows into one keystroke
audience: both
topics: [workflow]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: https://code.claude.com/docs/en/slash-commands
deeper_link: null
ai_summary: If you find yourself typing the same prompt three times, write it as a custom slash command. Drop a markdown file in `.claude/commands/`, invoke with `/yourname`. Commit it and the whole team gets the shortcut.
---

The single biggest power-user unlock in Claude Code is also the easiest. A custom slash command is a markdown file with your prompt in it, dropped into `.claude/commands/` at the repo root.

Minimal example. Create `.claude/commands/review-pr.md`:

```markdown
Fetch the diff for PR $ARGUMENTS using `gh pr diff $ARGUMENTS`.

Review the diff for:
- Logic errors and missing edge cases
- Security issues (auth, input handling, secret leaks)
- Missing error handling

Skip style and naming comments — we have a linter for that.

Return a structured list:
- Critical (must fix before merge)
- Important (should fix)
- Minor (nice to have)
```

Now in any Claude session in that repo, type `/review-pr 142` and Claude reviews PR 142 with your house rules. `$ARGUMENTS` gets replaced with whatever you typed after the command.

A handful of patterns the team has found load-bearing:

- **`/commit`** — stage, write a conventional commit message in our format, show it for confirmation, then commit.
- **`/release-notes`** — read commits since the last tag, produce changelog entries grouped by feature/fix/chore.
- **`/explain-this`** — read `$ARGUMENTS` (a file or function), explain what it does and why it exists, in plain language.
- **`/triage`** — read open issues from GitHub or Jira, classify by area, suggest priorities.

Three things that make commands compound in value:

1. **They live in git.** Commit `.claude/commands/` and every colleague who clones the repo gets the same shortcuts. Onboarding becomes "the commands are documented in `.claude/commands/`".
2. **They embed shell output.** A line like `` Current diff: !`git diff HEAD` `` runs `git diff HEAD` and pastes the output into the prompt. Claude sees the actual diff, not a description of one.
3. **They can reference files with `@`.** `@CLAUDE.md` in a command body pulls the file content into context. Useful for commands that should always re-read a specific doc before running.

When to make a slash command: any prompt you've typed three times. Any prompt the team has explained more than once. Any prompt where the boilerplate (file paths, output format, constraints) is the same and only the topic changes.

## Don't write the markdown by hand — ask Claude

The shape above isn't a syntax to memorise. Describe the workflow and ask Claude to create the command file for you:

> Create a `/triage` slash command for this repo. It should fetch open GitHub issues via `gh`, group them by area (auth, billing, ops), and output a markdown table sorted by priority.

Claude scaffolds `.claude/commands/triage.md` with the right shape — `$ARGUMENTS`, `!`-shell blocks, `@`-file refs where they help. Review the diff like any other change, then commit it so the whole team gets the shortcut.

Skills are the richer, frontmatter-driven sibling of commands — same idea, more knobs. Start with commands; reach for skills when you need stricter control (model selection, allowed-tools restrictions, auto-invocation rules).
