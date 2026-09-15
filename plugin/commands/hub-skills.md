---
description: List skills in the NbgAiHub catalog (filter by optional topic)
argument-hint: "[topic]"
---

Present the skill catalog below verbatim. Each entry shows name, badge, status, category, maintainer, install command, and a one-line summary. If a user wants to install one, suggest they run `/hub-install <skill-id>` (the IDs are in each entry's `id:` field).

!`node "${CLAUDE_PLUGIN_ROOT}/dist/hub-skills.mjs" $ARGUMENTS`
