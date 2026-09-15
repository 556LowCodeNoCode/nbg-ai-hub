---
type: glossary
title: cd
audience: beginner
topics: [shell, fundamentals]
internal: false
authored: "2026-05-27"
last_reviewed: "2026-05-27"
external_link: null
deeper_link: null
ai_summary: The terminal command for "change directory". `cd <folder>` moves you into a folder so the next commands you run apply there. `cd ..` goes back up one level.
tldr: "Short for 'change directory'. Type `cd some-folder` to move into a folder; `cd ..` to go back up. Like double-clicking a folder, but with the keyboard."
aliases: ["change directory"]
---

`cd` is the terminal command for "change directory". You'll see it constantly because almost every Claude Code session starts with "first, `cd` into your project folder so I can see your files".

The five forms you'll meet on day 1:

- `cd my-project` — go into the folder `my-project` (which has to exist in the current folder).
- `cd /Users/suzy/code/my-project` — go to an absolute path. Works from anywhere.
- `cd ~` — go to your home folder (where your user lives — `/Users/suzy` on Mac, `/home/suzy` on Linux/WSL).
- `cd ..` — go up one folder.
- `cd -` — go back to the previous folder you were in.

If a command in a tutorial or a Claude session starts with `cd` and a folder name you don't recognise, ask before you press enter. The wrong `cd` won't break anything (it just leaves you in a different folder), but knowing where you are matters for everything that comes next.

You can always check where you are by running `pwd` (print working directory).
