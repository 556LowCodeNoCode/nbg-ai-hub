---
description: Pull the latest content snapshot from the NbgAiHub repo
---

This command performs git operations against the user's local cache (`~/.cache/nbg-ai-hub/snapshot/`) — read-only against the remote, write to the local cache only. Pass the output to the user verbatim. If the command exits non-zero, surface the error code and the stderr line clearly.

!`node "${CLAUDE_PLUGIN_ROOT}/dist/hub-refresh.mjs"`
