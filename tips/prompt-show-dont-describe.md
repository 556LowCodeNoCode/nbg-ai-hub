---
type: tip
title: Show, don't describe
audience: both
topics: [prompting]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: null
ai_summary: A screenshot of a broken UI beats four paragraphs of describing it. Drag the image into the terminal — Claude will see what you see.
---

When the problem is visual — a misaligned button, a chart that's not rendering, a layout that breaks on mobile — describing it in words wastes everyone's time. Show Claude the screenshot.

**macOS:** ⌃⇧⌘4 puts the screenshot on the clipboard. Then **Ctrl + V** (not ⌘V!) pastes it into Claude Code. Yes, Ctrl, not Command — this trips people up the first time.

**Windows / WSL:** save the screenshot to a file first, then drag-and-drop it into the terminal window.

Same applies to error messages: paste the actual stack trace, not "I got an error". Same applies to console output: paste it, don't paraphrase. The fewer lossy human-translation hops, the better.
