---
type: skill
title: create-sandbox — build a TypeScript API sandbox from C# or Postman, end-to-end
audience: advanced
topics: [typescript, csharp, postman, api, sandbox]
internal: true
authored: "2026-06-02"
last_reviewed: "2026-06-02"
external_link: "https://github.com/NBG-AI/claude-tools/tree/main/plugins/create-sandbox"
deeper_link: null
ai_summary: End-to-end pipeline for building a TypeScript sandbox implementation of an existing API. Translate C# types and controllers to TypeScript (or infer types from a Postman collection), design the sandbox architecture, scaffold the multi-sandbox infrastructure, then implement service methods one at a time with integration + contract tests generated and run automatically.
when_to_use: Use this when you need a working TypeScript sandbox of an existing API — for front-end work against a stable stub, integration testing, or contract validation. Starts from C# source or a Postman collection.
marketplace_command: "/plugin marketplace add NBG-AI/claude-tools"
install_command: "/plugin install create-sandbox@claude-tools"
skill_id: create-sandbox
origin: internal
category: code
status: active
maintainer: "@nbg-ai-team"
time_saved: "~1-2 days of manual scaffolding per API"
worked_scenario: "Backend team needs a TypeScript sandbox of their C# Cards API so the front-end can build against it without blocking on the real backend. Without the skill: a week of hand-translating types, writing service stubs, designing an in-memory data store, and writing tests. With `/create-sandbox`: types translated, controllers turned into service stubs, an architecture doc generated, infrastructure scaffolded, then each method implemented with tests generated and run after every change."
access_request: |
  **TBD** — the AI team is finalising the access-request process for the
  internal `NBG-AI/claude-tools` repo. For now, ping the AI team channel
  on Teams and they'll add you to the repo.
---

`create-sandbox` is the team's end-to-end pipeline for spinning up a **TypeScript sandbox implementation of an existing API**. The sandbox is a working backend stub the front end can develop against, integration tests can hit, and contract checks can validate — without waiting on the real backend to be deployable, stable, or even finished.

Two entry points converge on the same workflow:

- **You have C# source** — Claude reads the types and controllers and translates them
- **You have a Postman collection** — Claude infers types and service stubs from the request/response examples

Either way, the output is a typed TypeScript service layer plus a multi-sandbox infrastructure you can run locally.

## The eight capabilities

The skill ships as an 8-step lifecycle. You can run them in order, jump in at any step, or invoke a single capability standalone.

| # | Capability | Purpose | Output |
|---|---|---|---|
| 1 | Type Translation | C# types → TypeScript | `generated-types.d.ts` |
| 2 | Controller Translation | C# controllers → service stubs | `generated-services/*.service.ts` |
| 3 | Sandbox Design | Architecture design document | `sandbox-design.md` (no code) |
| 4 | Sandbox Infrastructure | Multi-sandbox runtime scaffold | `src/sandbox/` (7 files) |
| 5 | Method Implementation | Implement ONE service method per call | Updated `.service.ts` |
| 6 | Postman Type Inference | Postman collection → TypeScript types | `generated-types.d.ts` |
| 7 | Postman Service Generation | Postman collection → service stubs | `generated-services/*.service.ts` |
| 8 | Endpoint Testing | Generate and run integration + contract tests | `src/tests/endpoints/*.test.ts` |

Typical flow: **1 → 2** (or **6 → 7** from Postman) → **3** (design doc) → **4** (infrastructure) → **5 + 8** repeated per method.

## When you reach for it

Concrete triggers, lifted straight from the skill's usage catalogue:

- *"Translate the C# types in `./src/Models` to TypeScript"* — Capability 1
- *"Generate TypeScript services from my C# controllers"* — Capability 2
- *"Design a sandbox for the services in `./services`"* — Capability 3
- *"Implement the sandbox infrastructure based on `docs/sandbox-design.md`"* — Capability 4
- *"Implement the `GetUserInfo` method"* — Capability 5
- *"Generate types from my Postman collection"* — Capability 6
- *"Generate service stubs from my Postman collection"* — Capability 7
- *"Run the tests for `getUserInfo`"* — Capability 8

If you're not building or extending a sandbox of an existing API, this isn't the skill — try `/team` or plain Claude Code instead.

## Rules the skill enforces

A few non-negotiables baked into the skill that are easy to miss if you skim the docs:

- **Never modify `tsconfig.json` to suppress errors.** No `noUnusedParameters: false`, no `// @ts-ignore`, no `any`-typed escape hatches. Genuine fixes only.
- **Capability 5 implements exactly one method per invocation.** Bulk requests are denied. After each method, Swagger JSDoc is updated and tests are generated + run automatically.
- **Always use absolute paths** (`$PWD/...`) for the script invocations — relative paths resolve incorrectly under `npx tsx`.
- **Capabilities 6 → 7 flag alignment** is critical. If you used `--envelope "payload"` in 6, you must use `--envelope` in 7. If you used `--folders "Account,Cards"` in 6, the same in 7. Mismatched flags produce subtly wrong type names that only surface at build time.

## Required environment variables

Capabilities 4 and 5 require:

```
SANDBOX_APP_ID=<app-name>          # Application identifier
SANDBOX_DATA_DIR=./data/sandboxes  # Base directory for sandbox files
```

**No fallback values.** The application fails at startup if either is missing — by design, per the team's no-silent-defaults rule.

## Limitations to know up front

- Translation covers **type definitions only** — C# method bodies are not translated. Method implementation happens in Capability 5, one method at a time.
- The sandbox is **file-based and single-threaded** — for development and integration testing, not production load.
- **WebSocket and streaming endpoints** are not supported by the test generator.
- Contract validation is **structural** (field presence and types), not semantic — business-rule validation is your responsibility in Capability 5.

## Going deeper

The full SKILL.md and the eight capability-specific guides (`01-type-translation.md` through `08-endpoint-testing.md`) live in the [upstream repo](https://github.com/NBG-AI/claude-tools/tree/main/plugins/create-sandbox/skills/create-sandbox). The eight guides go into detail on naming conventions, generated code structure, entity design, manager patterns, and test scope modes — read them when you hit the capability you're about to invoke.
