---
type: glossary
title: API (application programming interface)
audience: beginner
topics: [foundations, tools]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: null
deeper_link: null
ai_summary: An API is the published contract one piece of software offers another — a list of URLs you can call, what to send, what you'll get back. Most modern services have one. Anthropic's API is what you call directly when your own code needs to talk to Claude, instead of using a chat window or Claude Code as the intermediary.
tldr: "A door one program opens for another. When an app fetches the weather or sends a message, it's calling an API behind the scenes."
aliases: ["APIs", "api", "apis", "application programming interface"]
---

An **API** — application programming interface — is the contract one program publishes for other programs to use. It's a list of things you can ask for, the exact shape of how to ask, and what comes back.

A concrete example: Anthropic's API. Their servers expose a set of [HTTP](/glossary/#http) endpoints. If your code sends a properly-shaped request to `https://api.anthropic.com/v1/messages` with a prompt and an API key, Claude generates a response and sends it back. That's it — that's the API. Anyone with a key can call it from any language that can make HTTP requests.

APIs are the layer underneath most of the software you use. Your mobile banking app doesn't talk to a database directly — it calls the bank's API, which talks to the database. ChatGPT, the website, calls OpenAI's API in the background. Even Claude Code calls Anthropic's API every time you press enter.

The reason to care about the distinction between "the API" and "Claude" or "Claude Code":

- **Claude** is the model itself — the thing doing the thinking.
- **The Anthropic API** is the raw programmatic access — for when you're building your own software and you want Claude inside it.
- **Claude Code** and the **claude.ai** chat website are *products* that call the API for you and wrap it in a nicer interface.

When someone says "we'll call the API," they mean: our code will send an HTTP request to that service. When you see "API key" or "API token", that's the credential proving you're allowed to make those calls.
