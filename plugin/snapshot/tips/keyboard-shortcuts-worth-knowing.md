---
type: tip
title: Seven keys that make Claude Code feel like a tool, not a chat box
audience: beginner
topics: [control]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: Beyond Esc there are about seven shortcuts that change how the session feels — search your own history, park a half-written prompt, open the editor, see what Claude actually did, and background a long task. All verified against Claude Code 2.1.
---

Everyone learns **Esc**. Almost nobody learns the rest. These are the ones that change the day-to-day.

| Key | What it does | Why you'd want it |
|---|---|---|
| **Ctrl+R** | Search your prompt history | "What did I type last week that worked?" Your own past prompts are the best prompt library you have. |
| **Ctrl+S** | Park the half-written prompt | You're three sentences into a prompt and need to check something. Park it, go look, come back. Claude Code calls this "stash". |
| **Ctrl+G** | Open the prompt in your real editor | Writing a long, careful prompt in a terminal box is miserable. This opens `$EDITOR` instead. |
| **Ctrl+T** | Toggle the task checklist | Shows what Claude thinks it's doing. The cheapest way to catch it planning the wrong thing. |
| **Ctrl+O** | Toggle the full transcript | Expands everything Claude collapsed — every command it ran, every file it touched. |
| **Ctrl+B** | Send the running task to the background | A long job doesn't have to hold your session hostage. |
| **Ctrl+J** | Start a new line without sending | The answer to "how do I write a second paragraph without pressing send?" |
| **Alt+T** | Toggle thinking for the next turn | Extra reasoning when you want it, without changing any settings. On macOS the same key is labelled **Option**. |

A few more you'll meet by accident, so meet them on purpose instead:

- **Shift+Tab** — cycles the permission mode (see the permission-modes tip).
- **Alt+P** — model picker. **Alt+O** — fast mode.
- **Ctrl+V** — paste an image straight into the prompt. On Windows and WSL that's **Alt+V**.
- **Esc Esc** — clears the input box. Press it when the prompt is a mess and you want a clean start.

And three characters that are technically not shortcuts but behave like them, shown in Claude Code's own hint strip:

- **`!`** starts a shell command.
- **`/`** starts a command.
- **`@`** points at a file path.

## Don't trust a shortcut list — including this one

Bindings change between versions, and most lists online are out of date. Run **`/keybindings`** to open your own shortcuts file and see what's true in the version you're running. If a key here doesn't do what it says, that file wins.
