---
type: journey-step
title: Foundations — what is Claude Code, and why should I care?
audience: beginner
topics: [foundations, onboarding, mental-models]
internal: false
authored: "2026-05-24"
last_reviewed: "2026-05-27"
external_link: null
deeper_link: "https://anthropic.skilljar.com/claude-code-101"
ai_summary: Six foundational explainers for anyone who has never used Claude Code before — what an LLM actually is, why context windows matter, what makes an agent different from a chatbot, what Claude Code is, how it differs from ChatGPT, and why we picked it over the alternatives. Read this first if any of those questions feels uncertain.
---

You don't need Claude Code to do your job. Plenty of people get along fine without it. The hub exists because *we* find it useful enough to want our colleagues on board — and the fastest way to be useful is to be honest about what it is, what it isn't, and where it fits. This page is the "why," before any of the "how" on Day 1.

Read straight through, or skip to the section that matches the question you're sitting on right now. The order goes concept → product → choice: what the underlying AI is, what it can and can't remember, what changes when you give it tools, what the specific product is, how it relates to its siblings, and why we picked it.

---

## Step 1 — What is a large language model (LLM)?

Cut through the word "AI" first. **AI is a marketing umbrella.** It covers image generation, speech recognition, self-driving cars, recommendation engines, robotics — and the thing we're actually here to talk about. On its own the word is almost useless.

The specific thing that exploded in late 2022, the thing reshaping how knowledge workers do their jobs — including ours — is one narrow slice called a **Large Language Model**, or **LLM**. Other kinds of AI exist and matter. Throughout this hub, when we say AI, we mean LLM. Everything else is a different conversation.

An LLM is a program. A very large one. It was trained on a huge amount of text — books, websites, code, documentation, forums, manuals. Most of the public internet. During training it learned one thing, and only one thing, very well: given a sequence of words, **predict the next word**. That's it. That's the whole trick.

Now do that prediction billions of times, with hundreds of billions of internal parameters, and what emerges is a system that can answer questions, write code, summarise a document, draft an email — because all of those, when you look closely, are "what comes next" problems. You ask *"what's the capital of France"* — the most statistically likely next words are *"The capital of France is Paris."* You ask *"write a Python function that sorts a list"* — the most likely next tokens are valid Python. You paste a five-page contract and ask for a summary — the most likely next words are a summary.

**1. It is statistical, not thinking.** The LLM has no beliefs, no opinions, no memory between conversations, no model of truth versus falsehood. It is optimising for *plausibility* — what looks like a reasonable next word — not correctness. Most of the time plausibility and correctness overlap. When you ask *"what's two plus two,"* the plausible answer and the correct answer are both "four." But they can diverge.

**2. That's why it hallucinates.** A hallucination is when the model confidently produces something that sounds right and isn't. A made-up function name. A fictional court case. A wrong date. A library that doesn't exist. **It's not lying. Lying requires knowing the truth.** It's pattern-matching to what a plausible answer looks like. If you ask for a citation, citations have a *shape* — author, year, title, journal — and it will produce something with that shape, even if the citation doesn't exist. The fix is not to trust it. The fix is to verify. Always.

**3. A token is the unit.** When the LLM predicts "the next word" it's actually predicting the next *token*. A token is roughly a word, or a piece of a word. "Hello" is one token. "Hallucination" might be three. Punctuation is its own token. You'll see token counts everywhere — pricing is per token, context limits are in tokens. A 200,000-token context window is roughly 150,000 words.

**4. Prompt in, completion out.** Everything you type — your question, the files Claude reads, the instructions you give — is the *prompt*. Everything it produces back is the *completion*. That's the whole vocabulary.

**5. It has no memory between sessions.** Close the terminal, reopen it tomorrow, the model has zero recollection of yesterday. Everything Claude "knows" about your project, your conventions, your past conversations is what's *currently in its context window* (next step). Anything outside that, it cannot see. The knowledge baked into the model itself was also frozen at some point in the past — its "training cutoff." Ask it about events after that date and it'll either say it doesn't know, or — worse — make something up that sounds right.

This is a wildly compressed summary. If you want to actually *understand* this, the resources at the end of this section are some of the best free explanations ever produced.

---

## Step 2 — Context windows — why memory has a limit

If you remember one mechanical fact from this whole page, make it this: **the model can only see what fits in its context window, and once it's full, things start falling out**.

**The glass-of-water metaphor:**

Picture a glass of water. Every conversation fills the glass. Your first prompt pours something in. The model's reply pours something in. Every file the model reads, every command it runs — all pour into the same glass.

The glass has a fixed size. When it's full, the oldest water spills out. The model literally stops being able to see the early part of the conversation.

This is why long sessions degrade. The model forgets what you told it an hour ago, because that water spilled.

This is why we have commands like `/compact` — squeeze the conversation down to a summary — and `/clear` — empty the glass and start fresh. **When in doubt: clear and start over. Cheaper than fighting a polluted context.**

**The numbers:**

A context window is measured in *tokens* (think: ~3-4 characters of text per token, or about ¾ of a word on average). Modern Claude models hold ~200,000 tokens, which sounds like a lot until you realise a 500-line source file might cost you 2,000 tokens, and a session that reads ten files plus a long stack trace plus your back-and-forth chat can fill 50,000 before you notice.

**Two failure modes happen when context fills up:**

1. **Older content gets quietly dropped or compressed.** The model loses the early instructions, your project conventions, the constraint you set up an hour ago. From your side it looks like Claude "forgot" what you said — because it literally did.
2. **Hallucinations spike.** Lost in long contexts, the model leans more on its pre-trained instincts and less on the actual file in front of it. It starts inventing function names that don't exist, importing modules that don't ship, "remembering" rules you never wrote. Researchers call this the *"lost in the middle"* effect: even when the relevant info IS in the window, if it's buried under noise, the model often skips over it.

**Practical implications:**
- **`/compact`** — summarises the conversation so far, freeing up tokens. Use it between unrelated tasks.
- **`/clear`** — wipes the context entirely. Cheaper context = better answers. Don't be precious about it.
- **`CLAUDE.md`** — a file you write at the project root that gets loaded *every session*. The persistent memory, paid for in tokens once per session instead of repeated every turn.
- **Skills** — small, scoped instruction bundles loaded on demand, not always. Saves context when not in use.

Trust nothing past the 70% context-fill mark without a review. If you start seeing the model invent things — that's the signal. `/compact` or `/clear` and start fresh.

---

## Step 3 — Agent vs chatbot — what tool-use changes

You've used ChatGPT. You typed a question, it typed an answer. That's a chatbot loop. One in, one out. The model is a brain in a jar — it can produce text but it can't *do* anything in your world.

An **agent** is the same model with **hands**. Specifically: it's been given a set of *tools* (read a file, write a file, run a shell command, fetch a URL, query a database…) and it's wrapped in a loop that lets it decide which tool to call, call it, read the output, decide again, and continue — until it thinks the task is done or you stop it.

What changes when you flip from chatbot to agent:

- **Errors compound visibly.** A chatbot's mistake is a paragraph you can ignore. An agent's mistake is a deleted file. Always review changes before accepting.
- **The model now has a stake in being right.** Chatbots can be hand-wavy. Agents discover the hand-waving the moment they try to compile the code.
- **Iteration is automatic.** You don't need to copy/paste an error message back — the agent already saw it, already tried again, already (usually) fixed it.
- **You delegate the boring parts AND own the consequences.** "Make all those tests pass" is now a single sentence. So is "delete every file in this folder," which is why the supervision matters.

Karpathy has a memorable framing: think of the agent as a new kind of operating system, with the LLM as the kernel orchestrating tools, files, and processes. We're not all the way there yet, but Claude Code is one of the products closest to that pattern.

---

## Step 4 — What is Claude Code?

One sentence: **Claude Code is a terminal-based AI assistant that lives next to your files and can read them, edit them, and run commands — with your permission.**

It is the *agent* (Step 3) wrapping the *LLM* (Step 1) — specifically, Anthropic's Claude family of models — and running locally on your machine.

Four moving parts:

- **It is a CLI.** Install once, open a terminal in your project folder, type `claude`, you're in a session. No website to log into, no browser tab. It runs locally on your machine.
- **It is *not* a chat product.** There is no `claude.com/code` page. ChatGPT is a website. Claude.ai is a website. Claude Code is software that runs on your computer.
- **It sees your project.** When you start Claude Code in a folder, it knows what's in that folder — code, docs, config files. You don't paste files into it; you ask questions and it reads the files itself. *"Where is our login logic?"* → it goes and finds it.
- **It can act.** Not just answer — *act*. It will edit files, run tests, create git commits, install packages. With your permission, at every step. You see what it's about to do, you approve, it does it.

That last part is the whole game. Chat assistants make you the bottleneck — you paste in, you copy out, you apply changes by hand. Claude Code removes the copy-paste loop entirely.

**The mental shift from ChatGPT:**

- *ChatGPT flow:* you paste your code in, it gives you an answer, you copy out, you paste into your editor, you test, you tell ChatGPT what went wrong, it forgets your project next time you open the tab. You are the integrator.
- *Claude Code flow:* you tell it what you want, it reads the relevant files itself, it edits them directly, it remembers project context through a file called `CLAUDE.md`, and it integrates. You supervise.

**From operator to supervisor.** That is the shift.

You stay in control: you approve risky actions, you read the diff before committing, you tell it to back off when it goes sideways.

---

## Step 5 — Claude Code vs Claude.ai vs the API vs ChatGPT

This is the question almost every newcomer asks within the first day, and the names don't help. Here's the disambiguation.

**Hold this distinction first:** every AI vendor — Anthropic, OpenAI, Google — sells *two different things*.

1. **The model.** The underlying AI. Accessed through an API, used by developers to build software on top of.
2. **The chat product.** A website with a chat box — Claude.ai, ChatGPT, Gemini. What most people mean when they say "I use ChatGPT."

Same engine, completely different vehicle. Once you internalise the model-versus-product distinction, the rest of this step is just naming.

**Claude** is the *model* — the actual AI. It's what answers the question, regardless of which interface you use. Anthropic ships several variants: Opus (most powerful), Sonnet (the daily driver), Haiku (fastest). When someone says "Claude said X," they mean a Claude model produced X — but they may have reached it through any of three different surfaces.

| Surface | What it is | When to reach for it | What you pay |
|---------|------------|----------------------|--------------|
| **Claude.ai** | The chatbot at claude.ai (and the desktop/mobile apps). A web tab with a text box. | Quick questions. Drafting text. Brainstorming. "Explain this concept." Doesn't touch your files. | Free tier, then ~$20/month (Pro), ~$100-200/month (Max) |
| **Claude Code** | A CLI tool. Runs in your terminal. Has filesystem access, runs commands, edits code. | Anything that needs to *change* files in a project. Refactors. New features. Debugging. CI/CD. | Included in Claude.ai Pro+. Or pay-per-token via the API |
| **Anthropic API** | Raw programmatic access — your code calls Claude over HTTP. | You're *building* something that uses Claude inside it. Custom tools, internal agents. | Pay-per-token. |
| **Claude Cowork** | A GUI variant of Claude Code aimed at non-developers. Research preview. | Non-technical folks who still want hands-on capability. | Same Claude.ai subscriptions. |

**Compared to other vendors:**
- **ChatGPT** (OpenAI) — chatbot, similar to Claude.ai. Different underlying model (GPT family).
- **Gemini** (Google) — chatbot, similar shape. Google's models.
- **Grok** (xAI) — chatbot, edgier tone, X integration.
- **GitHub Copilot** — code completion inside your editor, not a full agent.
- **Cursor** — an IDE (a VS Code fork) with an AI agent baked in. Visual workflow.
- **Cline / Aider / Codex CLI** — other coding agents, different trade-offs (covered in Step 6).

If you want the short version: **Claude.ai is the browser tab; Claude Code is the terminal agent; the API is for programmers building tools.** They all talk to the same models.

---

## Step 6 — Why Claude Code, specifically?

Honest answer: there isn't a single "best" coding agent. There's a constellation of tools with overlapping capabilities, and we picked Claude Code because it's the strongest fit for what we do. Some context.

| Tool | What it is | Why you might pick it | Why you might not |
|------|------------|----------------------|-------------------|
| **Claude Code** | Anthropic's CLI agent, Claude models. | Deepest reasoning. 200K context delivered reliably. Strong autonomous multi-step. Terminal-first composes with any editor. | Locked to Claude (no GPT/Gemini switching). Subscription cost can climb on heavy use. |
| **Cursor** | VS Code fork with built-in agent. | Visual IDE feel. Can switch between models. Fast inline edits. | Reports of context truncation under hood. IDE lock-in if you preferred your existing setup. |
| **Cline** | VS Code extension, full agent loop. | Lives inside your existing VS Code. Step-by-step approval mode. Open source. | Pay your own model bills. Less "deeply integrated" feel. |
| **Aider** | Terminal pair-programmer. Model-agnostic. | Git-native (every edit is a commit). Token-efficient. Works with any model. | No visual interface. Smaller blast radius — less autonomous than Claude Code on big tasks. |
| **GitHub Copilot** | Inline completion + a separate chat. | Already on most dev machines. Tight VS Code integration. | Completion-shaped, not agent-shaped. Less suited to multi-file refactors. |

**Why we picked Anthropic and Claude (not OpenAI or Google):**

1. **Claude leads on code and reasoning benchmarks.** That matches most of the work in this room.
2. **Anthropic's safety posture is the most conservative of the three.** In a bank context, that matters — fewer surprises, more refusal of clearly bad asks, more transparent reasoning.
3. **Claude has the longest practical context window.** More of your codebase, more of your documents, more of your meeting transcript fits in one conversation before the glass overflows.

**Why we landed on Claude Code at NBG specifically:**
1. The strongest results we've seen on hard, multi-file work — refactors that touch 10+ files, complex debug sessions, "build me this feature end-to-end."
2. Terminal-first means it doesn't dictate your editor. You can use VS Code, Neovim, JetBrains, whatever.
3. Skills + plugin marketplace mean we can ship team-specific capabilities (deploy scripts, internal tools) without forking the tool itself.
4. The single-model lock-in is *also* a feature — fewer knobs to tune, more focus on the actual workflow.

Many teams end up running two tools side-by-side: Claude Code for hard problems, Cursor or Copilot for fast inline edits. That's a sensible end state. The hub is opinionated about Claude Code as the *primary* tool here, not the only one allowed to exist.

---

You're now equipped with the mental models. Move on to **Day 1** when you're ready to actually install Claude Code and run your first session — five concrete steps, about thirty minutes, you'll be productive by the end of it.
