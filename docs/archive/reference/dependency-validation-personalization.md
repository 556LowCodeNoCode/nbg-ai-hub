---
status: clean
mode: fix
package_manager: npm
ecosystem: node
iterations_run: 1
deprecations_initial: 0
deprecations_final: 0
vulnerabilities_initial: 5
vulnerabilities_final: 0
target_path: /Users/suzy/ClaudeCode/Projects/NbgAiHub
validated_at: 2026-05-19T02:26:32Z
last_validated_commit: 40ab0ee5bf418fa6e42bde458e77bd567a222162
---

# Dependency Validation — NbgAiHub (Personalization & Contributions)

## 1. Summary

Validated two npm workspaces (`site/` and `pipeline/`) following the personalization and contributions feature implementation. Initial state showed 5 moderate-severity vulnerabilities in the site workspace (all transitive, stemming from a vulnerable `yaml@2.7.1` package nested under `yaml-language-server` in the `@astrojs/check` dependency tree), zero in the pipeline workspace. Applied targeted fixes: bumped direct `yaml` dependency from `^2.5.0` to `^2.8.3` and added an npm override to force `yaml-language-server` to use the patched version. Updated minor versions of `@typescript-eslint/*` packages in the pipeline workspace (8.59.3 → 8.59.4). Final state: both workspaces clean (0 vulnerabilities, 0 deprecations). One iteration completed successfully.

## 2. Initial State

### Site Workspace (`/Users/suzy/ClaudeCode/Projects/NbgAiHub/site`)

**Vulnerabilities (5 moderate):**

| Package | Version Range | Severity | Advisory | Scope | Description |
|---|---|---|---|---|---|
| yaml | 2.0.0 - 2.8.2 | moderate | [GHSA-48c2-rrv3-qjmp](https://github.com/advisories/GHSA-48c2-rrv3-qjmp) | transitive | Stack Overflow via deeply nested YAML collections (CVE CVSS 4.3) |
| yaml-language-server | 1.11.1-08d5f7b.0 - 1.21.1-f1f5a94.0 \|\| 1.22.1-0ae5603.0 - 1.22.1-fc5f874.0 | moderate | via yaml | transitive | Depends on vulnerable yaml |
| volar-service-yaml | <=0.0.70 | moderate | via yaml-language-server | transitive | Depends on vulnerable yaml-language-server |
| @astrojs/language-server | >=2.14.0 | moderate | via volar-service-yaml | transitive | Depends on vulnerable volar-service-yaml |
| @astrojs/check | >=0.9.3 | moderate | via @astrojs/language-server | direct (dev) | Depends on vulnerable @astrojs/language-server |

**Deprecations:** None detected.

**Outdated packages:**
- `typescript`: 5.9.3 (wanted: 5.9.3, latest: 6.0.3) — major version available, not auto-upgraded per policy.

### Pipeline Workspace (`/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline`)

**Vulnerabilities:** 0

**Deprecations:** None detected.

**Outdated packages (minor/patch available):**
- `@typescript-eslint/eslint-plugin`: 8.59.3 → 8.59.4 (patch)
- `@typescript-eslint/parser`: 8.59.3 → 8.59.4 (patch)
- `typescript-eslint`: 8.59.3 → 8.59.4 (patch)
- `@types/node`: 22.19.19 (latest: 25.9.0) — major version available, not upgraded.
- `eslint`: 9.39.4 (latest: 10.4.0) — major version available, not upgraded.
- `openai`: 5.23.2 (latest: 6.38.0) — major version available, not upgraded.
- `typescript`: 5.9.3 (latest: 6.0.3) — major version available, not upgraded.

## 3. Replacements Applied

### Iteration 1

**Site workspace:**

1. **Bumped direct `yaml` dependency** from `^2.5.0` to `^2.8.3` (patch version fixing GHSA-48c2-rrv3-qjmp).
   - File modified: `site/package.json` line 31
   - Rationale: The project already uses `yaml` as a direct devDependency. Bumping to the patched version ensures the top-level installation is secure.

2. **Added npm override** to force `yaml-language-server` to use patched `yaml`:
   ```json
   "overrides": {
     "yaml-language-server": {
       "yaml": "^2.8.3"
     }
   }
   ```
   - File modified: `site/package.json` lines 33-37
   - Rationale: The vulnerability was in a transitive `yaml@2.7.1` nested under `yaml-language-server` (which is itself transitive via `@astrojs/check → @astrojs/language-server → volar-service-yaml`). npm's override mechanism forces all instances of `yaml` under `yaml-language-server` to resolve to the patched version, breaking the vulnerability chain without requiring upstream package updates.

**Pipeline workspace:**

3. **Updated `@typescript-eslint/*` packages** from 8.59.3 to 8.59.4 (patch release):
   - `@typescript-eslint/eslint-plugin`
   - `@typescript-eslint/parser`
   - `typescript-eslint`
   - Command: `npm update @typescript-eslint/eslint-plugin @typescript-eslint/parser typescript-eslint`
   - Rationale: Safe patch-version update within the declared `^8.0.0` semver range; no breaking changes.

**No source code changes required.** All fixes were manifest-level version constraints.

## 4. Manual Review Needed

None. All issues were resolved via automated version bumps and npm overrides.

**Major version updates deferred** (per policy — major version migrations require human review):
- `typescript` 5.9.3 → 6.0.3 (both workspaces)
- `@types/node` 22.19.19 → 25.9.0 (pipeline only)
- `eslint` 9.39.4 → 10.4.0 (pipeline only)
- `openai` 5.23.2 → 6.38.0 (pipeline only)

These are flagged for future consideration but are not security issues and do not block the current work.

## 5. Security Audit

### Advisory GHSA-48c2-rrv3-qjmp (resolved)

- **Package:** `yaml`
- **Affected versions:** 2.0.0 - 2.8.2
- **Severity:** Moderate (CVSS 4.3)
- **CWE:** CWE-674 (Uncontrolled Recursion)
- **Description:** yaml is vulnerable to Stack Overflow via deeply nested YAML collections
- **Fix:** Upgrade to yaml >= 2.8.3
- **Applied:** Direct dependency bumped to `^2.8.3`, npm override applied to transitive instances.
- **Verification:** Post-fix audit shows 0 vulnerabilities in both workspaces.

No other advisories detected.

## 6. Final State

**Site workspace:** 0 vulnerabilities, 0 deprecations, 456 packages audited.

**Pipeline workspace:** 0 vulnerabilities, 0 deprecations, 207 packages audited.

**Status:** Both workspaces are **clean**. All security advisories resolved. No deprecated packages in use. No deprecation warnings emitted during `npm install`.

**Outdated packages remaining:** Only major-version updates remain (TypeScript 6, ESLint 10, OpenAI SDK 6, Node types 25), which are intentionally deferred per the "no major version bumps without human review" policy.

## 7. Commands Run

### Site Workspace

**Iteration 1 — Initial validation:**

```bash
cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site
npm install
# Exit code: 0
# Output: "5 moderate severity vulnerabilities"

npm audit --json > /tmp/site-audit-iter1.json
# Exit code: 1 (vulnerabilities present)

npm outdated --json > /tmp/site-outdated-iter1.json
# Exit code: 0
```

**Iteration 1 — Auto-fix attempts:**

```bash
npm audit fix
# Exit code: 0
# Result: No changes (transitive vulnerability unfixable via auto-fix)

npm audit fix --force
# Exit code: 0
# Result: No changes (same outcome)
```

**Iteration 1 — Manual fix:**

```bash
# Edited site/package.json:
# - Changed yaml from ^2.5.0 to ^2.8.3
# - Added overrides section forcing yaml-language-server to use yaml ^2.8.3

npm install
# Exit code: 0
# Output: "removed 1 package, and audited 456 packages"
# Output: "found 0 vulnerabilities"

npm audit --json > /tmp/site-audit-iter2.json
# Exit code: 0
# Result: 0 vulnerabilities
```

### Pipeline Workspace

**Iteration 1 — Initial validation:**

```bash
cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline
npm install
# Exit code: 0
# Output: "found 0 vulnerabilities"

npm audit --json > /tmp/pipeline-audit-iter1.json
# Exit code: 0

npm outdated --json > /tmp/pipeline-outdated-iter1.json
# Exit code: 0
```

**Iteration 1 — Minor updates:**

```bash
npm update @typescript-eslint/eslint-plugin @typescript-eslint/parser typescript-eslint
# Exit code: 0
# Output: "changed 11 packages, and audited 207 packages"
# Output: "found 0 vulnerabilities"
```

**Final verification (both workspaces):**

```bash
cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site
npm install 2>&1 | grep -i "deprecated\|warn"
# Exit code: 1 (no matches)
# Output: "No deprecation warnings"

npm audit --json 2>&1 | jq '.metadata.vulnerabilities'
# Exit code: 0
# Output: all severity counts = 0

cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline
npm install 2>&1 | grep -i "deprecated\|warn"
# Exit code: 1 (no matches)
# Output: "No deprecation warnings"

npm audit --json 2>&1 | jq '.metadata.vulnerabilities'
# Exit code: 0
# Output: all severity counts = 0
```

## 8. Validation Metadata

- **Request file context:** `docs/refined-requests/personalization-and-contributions.md` — PAT-paste authentication, unlisted-gist-backed favourites, URL-redirect skill submissions, CI validator on skills PRs.
- **New dependencies added by personalization work:**
  - `site/`: `tsx`, `gray-matter`, `vitest`, `yaml` (all installed prior to this validation; no new deprecations introduced).
  - `pipeline/`: No new dependencies (validator reuses existing `gray-matter` + `yaml`).
- **Compliance with NF-P13 ("No new deprecated direct deps"):** Verified. The `yaml` bump from `^2.5.0` to `^2.8.3` is a patch-level security fix within the same major version; no deprecations introduced. The `@typescript-eslint/*` updates are patch-level within `^8.0.0`; no deprecations.
- **Workspace architecture:** Two independent npm workspaces (not linked as a monorepo). Each maintains its own `node_modules` and `package-lock.json`. Validation executed separately per workspace, then combined into this unified report.
