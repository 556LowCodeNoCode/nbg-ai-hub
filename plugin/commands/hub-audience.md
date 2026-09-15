---
description: Set persistent audience filter (beginner | advanced | both)
argument-hint: <beginner|advanced|both>
---

Confirm the audience change to the user. After this, every `/hub-*` browse/list command respects the filter until they change it again.

!`node "${CLAUDE_PLUGIN_ROOT}/dist/hub-audience.mjs" $ARGUMENTS`
