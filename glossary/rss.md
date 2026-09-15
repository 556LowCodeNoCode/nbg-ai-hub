---
type: glossary
title: RSS (Really Simple Syndication)
audience: beginner
topics: [foundations, news, content-pipeline]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: "https://en.wikipedia.org/wiki/RSS"
deeper_link: null
ai_summary: RSS is an old XML format every blog and news site publishes — a machine-readable list of recent posts you can subscribe to without opening the page. NbgAiHub's daily news pipeline ingests five RSS feeds, runs each item through Azure OpenAI triage, and writes the survivors into a curated news collection. Atom is the sibling format — different XML, same idea.
tldr: "An old but reliable way to subscribe to a site's updates without checking it manually. NbgAiHub uses RSS to pull in daily news from five tech sources."
aliases: ["RSS feed", "RSS feeds"]
---

**RSS** stands for *Really Simple Syndication*. It's the boring, two-decades-old XML format that every blog, news site, podcast host, and project release page quietly publishes alongside its human-readable HTML. Point a reader at the feed URL and you get a machine-readable list of recent items — title, link, body, timestamp — without scraping the page.

It has been "about to die" approximately every year since 2010 and is somehow still the best signal-to-noise content distribution channel on the open web. No algorithm. No login. No ads in your face. Just a list.

NbgAiHub uses RSS as the input to its news pipeline. A GitHub Action runs daily, fetches five feeds, and runs every new item through Azure OpenAI triage to decide what's worth keeping:

- **r/ClaudeAI** and **r/ClaudeCode** — community signal from Reddit
- **Hacker News frontpage** — broader tech zeitgeist
- **Wired AI** and **The Verge** — editorial tech press

The site's News surface is currently routed externally to a colleague's site (see SCOPE 2026-05-25), but the pipeline still runs and the published items still land in `news/published/` for the hub plugin to read.

**Atom** is RSS's slightly younger sibling — different XML, same idea. The parser library NbgAiHub uses handles both without caring which one a feed actually serves.
