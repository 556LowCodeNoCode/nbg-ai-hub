---
phase: 8
scope: hub-plugin
validator: inline (npm install + npm audit)
validated_at: 2026-05-19
mode: report-only
status: clean
deprecations_found: 0
vulnerabilities_found: 0
iterations: 1
---

# Dependency validation — `/hub` plugin

## Target

`/Users/suzy/ClaudeCode/Projects/NbgAiHub/plugin/`

## Install result

```
npm install
added 210 packages, and audited 211 packages in 29s
86 packages are looking for funding
found 0 vulnerabilities
```

No deprecation warnings from npm install.

## Audit result

```
npm audit --omit=dev
found 0 vulnerabilities
```

## Dependencies declared

### Runtime

| Package | Version | Status | Notes |
|---|---|---|---|
| `gray-matter` | ^4.0.3 | active | Matches `pipeline/` version. Configured with `js-yaml` JSON_SCHEMA engine to avoid YAML 1.1 date auto-conversion bug. |
| `js-yaml` | ^4.1.0 | active | Configured with `JSON_SCHEMA` to prevent YAML deserialization risks (no custom tags, no code exec). |
| `open` | ^10.1.0 | active | Cross-platform browser launch for `/hub-open`. Handles macOS `open`, Linux `xdg-open`, Windows `start` transparently. |

### Dev

| Package | Version | Status | Notes |
|---|---|---|---|
| `typescript` | ^5.5.0 | active | Strict mode, NodeNext modules. |
| `vitest` | ^4.1.6 | active | Matches `pipeline/` version per DECISIONS.md 2026-05-18. |
| `eslint` | ^9.0.0 | active | Flat config (`eslint.config.js`). |
| `typescript-eslint` | ^8.0.0 | active | Recommended config + `no-unused-vars` + `no-explicit-any` warn. |
| `@types/node` | ^22.0.0 | active | Node 22 type definitions. |
| `@types/js-yaml` | ^4.0.9 | active | Types for js-yaml configuration. |
| `esbuild` | ^0.25.0 | active | Bundles `src/<command>.ts` → `dist/<command>.mjs` with `packages: "external"` so CJS deps resolve at runtime. |
| `memfs` | ^4.11.0 | active | Available for tests; not currently used (tests use `os.tmpdir()` + real fs). Retained for parity with `pipeline/`. |

## Outcome

`clean` — no deprecated modules, no security advisories, no manual review items. Dependencies mirror the `pipeline/` workspace which has been stable since 2026-05-18.
