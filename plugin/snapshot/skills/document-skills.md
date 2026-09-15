---
type: skill
title: document-skills — Word, Excel, PowerPoint and PDF files
audience: beginner
topics: [documents, office, reporting]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: "https://github.com/anthropics/skills"
deeper_link: "https://www.anthropic.com/news/create-files"
ai_summary: The four document skills that power Claude's own file creation — `docx`, `xlsx`, `pptx` and `pdf`. Claude stops handing you markdown to reformat and produces the actual Office file, with working formulas, real headings, and page numbers where they belong.
when_to_use: Use this when the deliverable is an actual file — a Word memo, an Excel model with live formulas, a PowerPoint deck, or a PDF you need to read, merge or fill in.
marketplace_command: "/plugin marketplace add anthropics/skills"
install_command: "/plugin install document-skills@anthropic-agent-skills"
skill_id: document-skills
origin: external
category: docs
status: active
maintainer: "@anthropics"
time_saved: "~30-60 min per document"
worked_scenario: "You need a credit memo as a Word file with a table of contents, letterhead and page numbers. Without the skill: Claude writes excellent markdown, you paste it into Word, and you spend forty minutes fixing heading styles. With `document-skills`: you get a .docx that opens correctly the first time. Same for the quarterly model — openpyxl means the spreadsheet arrives with formulas that recalculate, not values frozen at the moment Claude wrote them."
access_request: "Public — no access request needed. **One caveat worth knowing:** unlike most of the `anthropics/skills` repo, these four are *source-available, not open source*. Each ships a `LICENSE.txt` putting them under your existing Anthropic Commercial or Consumer Terms, and it explicitly forbids retaining copies outside the Services or making derivative works. Installing and using them inside Claude Code is exactly the intended use; lifting the prompt text into an internal tool is not."
---

This is the single most useful install on this page for a colleague whose job produces documents rather than code.

Claude is good at the *content* of a memo and, without help, bad at the *file*. Ask for a report and you get markdown. You then paste it into Word and rebuild the formatting by hand — which is the part that actually took the time.

`document-skills` is the bundle Anthropic uses in Claude's own file-creation feature. Four skills ship together:

| Skill | Handles |
|---|---|
| `docx` | Word documents and `.dotx` templates — tables of contents, headings, letterheads, tracked changes, find-and-replace |
| `xlsx` | Spreadsheets — live formulas, formatting, charts, and cleaning up messy tabular data |
| `pptx` | Decks and `.potx` templates — building, editing, reading speaker notes |
| `pdf` | Reading, extracting tables, merging, splitting, filling forms, OCR on scans |

## How you actually use it

You don't type a command. Mention the file and Claude loads the right skill:

> Read `Q3-provisions.xlsx`, find the rows where the coverage ratio dropped more than 5 points, and write me a one-page summary as a Word doc.

That single sentence pulls in `xlsx` to read and `docx` to write.

## Worth knowing before you install

- **Formulas survive.** The `xlsx` skill uses `openpyxl`, so a spreadsheet arrives with `=SUM(...)` intact rather than the number it happened to evaluate to.
- **Editing an existing file is a different path from creating one.** The skill knows this; you don't have to.
- **Check the licence line above** if you're thinking about anything beyond normal use in Claude Code.

## Access

Public — no access request needed. See the licensing caveat in the Access panel.
