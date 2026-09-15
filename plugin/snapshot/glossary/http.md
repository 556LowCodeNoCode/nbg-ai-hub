---
type: glossary
title: HTTP
audience: beginner
topics: [foundations, web]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: null
deeper_link: null
ai_summary: HTTP is the request-response protocol that runs the web. Every time your browser loads a page, every time a script hits an API endpoint, every time Claude Code's underlying client calls Anthropic's servers — that's HTTP. HTTPS is the same thing with an encrypted transport.
tldr: "The language computers use to talk over the web. Every page you load and every API call uses HTTP. HTTPS is the encrypted version."
aliases: ["HTTPS", "http", "https"]
---

**HTTP** — HyperText Transfer Protocol — is the language two programs use to talk to each other across the internet. One side sends a *request* ("give me this page", "save this data"), the other side sends a *response* ("here you go", "no, that didn't work").

You use HTTP every time you load a webpage. Your browser sends a request to a server, the server sends back HTML, your browser renders it. The "https" you see at the start of a URL is the same thing with an encrypted transport so nobody in the middle can read what you're sending.

For developers, HTTP also runs every [API](/glossary/#api) call. When a script "calls an API", it's sending an HTTP request to a URL and parsing the response. When Claude Code talks to Anthropic's models, it makes HTTP requests in the background to Anthropic's API endpoints. Same protocol, different consumer.

Common HTTP verbs you'll see in documentation:

- `GET` — read something (most page loads)
- `POST` — create something (submit a form, send a message)
- `PUT` / `PATCH` — update something existing
- `DELETE` — remove something

You don't need to remember the spec. You just need to know that "talking to a server over HTTP" means "sending it requests and reading its responses" — and that's what most software does most of the time.
