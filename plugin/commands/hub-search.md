---
description: Full-text search across all NbgAiHub pillars
argument-hint: <query>
---

Present the ranked results below verbatim. Preserve the order — the plugin already ranked them by relevance (title × 5, topics × 3, body × 1). Do not re-rank, re-summarize, or hide low-score matches.

!`node "${CLAUDE_PLUGIN_ROOT}/dist/hub-search.mjs" $ARGUMENTS`
