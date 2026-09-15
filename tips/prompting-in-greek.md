---
type: tip
title: Prompt in Greek (or any language) — Claude understands
audience: beginner
topics: [prompting]
internal: false
authored: "2026-05-27"
last_reviewed: "2026-05-27"
external_link: null
deeper_link: null
ai_summary: Claude is multilingual. Prompt in Greek when it's the language you can think in most clearly. The model replies in the language you wrote — and code/identifiers stay in English, which is exactly what you want.
---

The site is in English, but you don't have to think in English to use Claude Code. The model is multilingual. Prompting in Greek (or in any language you're more comfortable with) works, and for most non-developers it gives you better results — the prompt comes out cleaner when you're not also fighting a translation in your head.

Here's a real example.

**Greek prompt:**

> Δες το αρχείο `Q3-portfolio.pdf` στο φάκελο. Φτιάξε μια σύνοψη σε απλή γλώσσα για την επιτροπή κινδύνου της Τρίτης. Χωρίς τεχνικούς όρους, κάτω από 300 λέξεις. Ξεκίνα με τις τρεις μεγαλύτερες αλλαγές σε σχέση με το Q2.

**What you'll get back:** a 300-word summary in Greek, leading with the three biggest changes vs Q2, in plain language. Claude reads the PDF, writes the answer, and respects every constraint you stated — same as it would in English.

A few practical notes for prompting in Greek:

- **Code stays in English.** Function names, variable names, file paths — those don't translate. Mention them in their original form (`Q3-portfolio.pdf`, `customer_id`, `npm run dev`) even when the surrounding prose is Greek. Claude will read them correctly.
- **Mixed-language prompts work.** Write the framing in Greek, paste an English error message verbatim, ask the question in Greek. Claude handles the switch silently.
- **Bank-specific terminology in Greek is fine.** "επιτροπή κινδύνου", "πελάτης λιανικής", "ταμείο" — Claude knows financial vocabulary in Greek as well as in English. If you're explaining the business context to Claude in a prompt, do it in the language you actually use at work.
- **The output language follows the prompt language.** Greek prompt → Greek reply. English prompt → English reply. If you want the reply in a specific language regardless of the prompt, say so: "απάντησε στα ελληνικά" or "reply in English".

If you've been quietly translating your prompts before typing them — stop. You're losing precision in the translation. The "what I wish I knew a year ago" line on this hub applies here too: write your prompt in the language you can think most clearly in.

The hub UI is in English for now — that's a separate decision (see `SCOPE.md`). The bilingual UI question is open. The prompt-in-Greek answer is "yes, always, just do it".
