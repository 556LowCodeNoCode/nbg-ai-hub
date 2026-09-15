---
type: tip
title: Show, don't describe
audience: both
topics: [prompting]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: A screenshot of a broken UI beats four paragraphs of describing it. Drag the image into the terminal — Claude will see what you see.
---

When the problem is visual — a misaligned button, a chart that's not rendering, a layout that breaks on mobile — describing it in words wastes everyone's time. Show Claude the screenshot.

**macOS:** ⌃⇧⌘4 puts the screenshot on the clipboard. Then **Ctrl + V** (not ⌘V!) pastes it into Claude Code. Yes, Ctrl, not Command — this trips people up the first time.

**Windows / WSL:** save the screenshot to a file first, then drag-and-drop it into the terminal window.

Same applies to error messages: paste the actual stack trace, not "I got an error". Same applies to console output: paste it, don't paraphrase. The fewer lossy human-translation hops, the better.

## Annotate the screenshot instead of describing the change

The upgrade almost nobody makes: don't just show Claude what's wrong — **draw on it**.

Open the screenshot in any image editor (Preview on macOS does it), scribble an arrow and "move this up here", circle the element that's wrong, write "too much space" next to the gap. Then paste the annotated image.

This collapses the hardest part of visual work — saying *which* element you mean and *where* you want it — into a picture. "Move the third card in the second row up to align with the header" is a sentence you have to compose carefully and Claude has to parse carefully. An arrow is neither.

Worth it whenever you catch yourself writing a paragraph of spatial description. If the words "the one below the…" appear in your prompt, annotate instead.
