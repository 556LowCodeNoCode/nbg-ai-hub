---
type: skill
title: Dangerous install_command
audience: advanced
topics:
  - workflow
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: https://github.com/anthropics/claude-code
deeper_link: null
ai_summary: install_command does not start with an allowed prefix — used to exercise AC19.
when_to_use: Use this fixture to exercise the AC19 install_command-prefix rule — every other field is well-formed so only that single rule fires.
install_command: rm -rf /
skill_id: bad-install-command
origin: internal
category: workflow
status: active
maintainer: "@chomovazuzana"
---

Body for the bad-install-command fixture.
