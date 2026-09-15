---
type: glossary
title: YAML
audience: beginner
topics: [config, formats]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: "https://yaml.org/"
deeper_link: null
ai_summary: YAML is a human-readable configuration format that uses indentation rather than braces to express nested structure. It's the lingua franca of CI workflows, Kubernetes manifests, and markdown frontmatter. In this repo it shows up in every glossary/tip/skill frontmatter block and in the GitHub Actions workflows.
tldr: "A simple way to write settings using indentation and colons, like name: Alice. Easier to read than JSON. Used in lots of config files."
aliases: ["YAML"]
---

**YAML** ("YAML Ain't Markup Language") is a config file format optimised for humans to read and write. It supports the same shapes as JSON — scalars, lists, nested objects — but uses indentation and dashes instead of braces and commas:

```yaml
name: nbg-ai-hub
audience: beginner
topics:
  - foundations
  - tools
maintainers:
  primary: suzy
  backup: null
```

Where you'll see it in this repo:

- **`.github/workflows/*.yml`** — every GitHub Actions workflow is YAML.
- **Frontmatter blocks** in every `.md` under `glossary/`, `tips/`, `skills/`, `journeys/`, `news/published/`.
- **`docs/archive/refined-requests/`** and a few other doc fragments where structured fields are easier than prose.

Not YAML, despite the similar feel:

- **`config/rss-sources.json`** — JSON (braces, commas).
- **`site/astro.config.mjs`** — JavaScript (an ES module that exports an object).

YAML vs JSON: YAML is friendlier to read and supports comments; JSON is stricter and universal across languages. We use YAML where humans edit it daily (frontmatter, workflows) and JSON where machines pass it around.

**Common gotchas:**

- **Indentation matters.** Two spaces per level, never tabs. A single rogue space breaks the file.
- **Quote your dates.** `authored: 2026-05-25` parses as a date object in some parsers; `authored: "2026-05-25"` parses as a string everywhere. We use strings.
- **`null`, `~`, and empty** are all the same thing. Pick one (we use `null`) and stay consistent.
