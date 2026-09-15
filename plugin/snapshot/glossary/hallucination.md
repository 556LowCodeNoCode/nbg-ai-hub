---
type: glossary
title: Hallucination
audience: beginner
topics: [foundations, ai-basics, safety]
internal: false
authored: "2026-05-24"
last_reviewed: "2026-05-24"
external_link: "https://www.ibm.com/think/topics/context-window"
deeper_link: null
ai_summary: When the model invents plausible-sounding content that isn't true. Inventing a function name, a citation, a package import — anything that *should* be grounded in reality but isn't. Hallucinations spike when context windows fill up, when the model is asked to commit beyond its training cutoff, or when it's flattered into agreeing with a wrong premise.
tldr: "When the AI confidently makes something up that sounds right but isn't. A fake function name, a wrong citation, a made-up fact."
aliases: ["hallucinations", "hallucinate"]
---

A **hallucination** is when the model invents content that *sounds* correct but isn't — a function name that doesn't exist, a citation that was never published, a configuration flag the library never shipped. It's not lying in the human sense; it's pattern-completing on what *should* come next, with no internal mechanism to check whether what it produced is real.

**Common triggers:**

1. **Context window pressure.** When the [context window](/glossary/#context-window) fills up, earlier instructions and source material lose attention weight. The model leans more on its general training instincts and less on the actual file in front of it. Researchers call this the "lost in the middle" effect.
2. **Knowledge cutoff.** The model's training data was frozen at some past date. Anything newer than that, it has to guess.
3. **Premise flattery.** Ask a leading question ("Doesn't Claude Code support feature X?") and the model is statistically inclined to agree with the framing — even when X doesn't exist.
4. **Long autonomous loops.** When an [agent](/glossary/#agent) goes deep on its own, early mistakes get locked in and built upon. Each iteration adds compounding error.

**Defences in practice:**

- **Trust nothing past the 70% context-fill mark without re-reading the diff.** Use `/compact` or `/clear` to reset.
- **Always check the diff before accepting.** A hallucinated import won't compile — let the compiler catch it.
- **Specifically distrust references** — citations, links, file paths, package names. Verify any non-trivial claim against the source.
- **Use the right model for the job.** Hard problems → Opus. Routine work → Sonnet. Don't ask Haiku to architect a system.

The rule of thumb: Claude Code is a brilliant junior — capable, fast, occasionally confidently wrong. Review the work.
