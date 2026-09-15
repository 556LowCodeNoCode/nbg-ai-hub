---
type: glossary
title: Large language model (LLM)
audience: beginner
topics: [foundations, ai-basics]
internal: false
authored: "2026-05-24"
last_reviewed: "2026-05-24"
external_link: "https://www.youtube.com/watch?v=LPZh9BOjkQs"
deeper_link: "https://www.3blue1brown.com/lessons/gpt/"
ai_summary: A large language model is a statistical engine trained to predict the next chunk of text given everything that came before. Despite the name, it doesn't "reason" — it does very good pattern completion at scale. Everything Claude, ChatGPT, and Gemini do downstream sits on top of this one trick.
tldr: "The AI behind chatbots like Claude. It learned from huge amounts of text to predict what word comes next — that's the whole trick."
aliases: ["LLM", "LLMs"]
---

A **large language model** (LLM) is the engine. Given some text as input, it computes a probability distribution over what the next *token* (roughly: a word-piece) should be, picks one, and repeats. That's it. Doing this trick a billion times on text scraped from the public internet — books, code, conversations — turns out to produce something that feels astonishingly close to understanding.

Three properties matter in practice:

1. **It's predictive, not deliberative.** There's no internal logic prover. It produces what looks like reasoning by *imitating* reasoning text from its training data.
2. **It has a frozen knowledge cutoff.** What it "knows" was baked in when it was trained. Ask about events after that date and it may invent plausible-sounding nonsense (hallucination).
3. **It has no memory between sessions.** Anything it knows about your project, your conventions, your past conversations is what's currently in its [context window](/glossary/#context-window). When the session ends, it forgets.

Claude, ChatGPT, Gemini, Grok — all LLMs. Same underlying trick, different training data and tuning.

Best plain-language explanations: [3Blue1Brown's "Large Language Models explained briefly"](https://www.youtube.com/watch?v=LPZh9BOjkQs) (10 min), and [Andrej Karpathy's "Intro to LLMs"](https://www.youtube.com/watch?v=zjkBMFhNj_g) (1 hour, worth every minute).
