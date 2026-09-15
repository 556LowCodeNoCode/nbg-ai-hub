---
description: Open the NbgAiHub website in the user's browser (supports deep-linking)
argument-hint: "[section] [subsection]"
---

The plugin opens the user's default browser at the resolved URL. Examples: `/hub-open`, `/hub-open news`, `/hub-open glossary mcp`, `/hub-open day-1`. While the site is in dev mode (configured default), the plugin probes `http://localhost:4321` first and instructs the user to start the site dev server if not running.

!`node "${CLAUDE_PLUGIN_ROOT}/dist/hub-open.mjs" $ARGUMENTS`
