---
type: tip
title: '`@file` and `!command` — two prompt shortcuts every newcomer misses'
audience: beginner
topics: [workflow, commands]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: null
deeper_link: null
ai_summary: Type `@` to reference a file by path (autocompletes), `!` to run a shell command and embed its output. Both go straight into the prompt. They cut the "let me copy this in" loop entirely.
---

Two characters that change how you write prompts.

## `@` — reference a file

Start typing `@` in the prompt and Claude offers an autocomplete of files in the current directory tree. Pick one and the file path drops into the prompt.

```
Compare @src/auth/old.ts with @src/auth/new.ts and tell me what changed.
```

Claude reads both files automatically. You didn't have to paste paths, didn't have to spell them, didn't risk a typo.

Works with directories too. `@src/auth/` gives Claude the whole folder as context.

## `!` — run a shell command inline

Prefix a line with `!` and Claude runs the command immediately and pastes the output into the prompt. The command runs in your shell; you see what ran.

```
!git status
!git diff HEAD

What are these changes about? Summarise for the commit message.
```

You didn't have to switch terminals. You didn't have to copy-paste. Claude saw the actual git state, not a description of it.

Useful targets for `!`:

- `!git log -5 --oneline` — recent commits as context
- `!npm test -- --reporter=summary` — paste test output before asking "why is this failing"
- `!ls -la` — quick "what's in here?" without the back-and-forth
- `!cat package.json | jq .scripts` — pull a specific slice of a file

When *not* to use `!`: long-running commands (`!npm run dev` will hang the prompt waiting for a server that never finishes). Quick one-shot output only.

These two shortcuts replace dozens of small copy-pastes per day. Once they're muscle memory you'll wonder how you used Claude without them.
