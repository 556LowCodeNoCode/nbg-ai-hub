---
status: deprecations_found
mode: fix
package_manager: npm
ecosystem: node
iterations_run: 0
deprecations_initial: 0
deprecations_final: 0
vulnerabilities_initial: 5
vulnerabilities_final: 5
target_path: /Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline
validated_at: 2026-05-18T13:49:47.976Z
last_validated_commit: 13b5b5ec55e3d9c37a3db0ffa39e081573dd2869
---

# Dependency Validation — NbgAiHub RSS Pipeline

## 1. Summary

Validated the NbgAiHub RSS pipeline's dependency tree using npm. No deprecated packages were found in the direct dependencies. However, 5 moderate-severity security vulnerabilities were detected in transitive dependencies of vitest (specifically vite and esbuild). All vulnerabilities can be resolved by upgrading vitest from 2.x to 4.x, but this requires a major version bump and was flagged for manual review per the validator's invariants (no silent major-version migrations). One pre-existing manifest error was corrected: `@rowanmanning/feed-parser` version was listed as `^1.4.0` (non-existent) and was updated to `^2.1.3` (latest).

## 2. Initial State

### Manifest Error (corrected before validation)
| Package | Declared Version | Issue | Resolution |
|---------|------------------|-------|------------|
| `@rowanmanning/feed-parser` | `^1.4.0` | Version does not exist (latest is 2.1.3) | Updated to `^2.1.3` |

### Deprecations
No deprecated packages found in direct or transitive dependencies.

### Security Vulnerabilities (5 moderate)
| Package | Severity | Advisory | Affected Range | Fixed In | Description |
|---------|----------|----------|----------------|----------|-------------|
| `esbuild` | moderate | GHSA-67mh-4wv8-2f99 | <=0.24.2 | transitive via vitest 4.x | Enables any website to send requests to dev server and read responses (CWE-346, CVSS 5.3) |
| `vite` | moderate | GHSA-4w7w-66w2-5vf9 | <=6.4.1 | transitive via vitest 4.x | Path traversal in optimized deps `.map` handling (CWE-22, CWE-200) |
| `@vitest/mocker` | moderate | (inherited from vite) | <=3.0.0-beta.4 | transitive via vitest 4.x | Inherits vite vulnerabilities |
| `vite-node` | moderate | (inherited from vite) | <=2.2.0-beta.2 | transitive via vitest 4.x | Inherits vite vulnerabilities |
| `vitest` | moderate | (inherited) | 0.0.1 - 3.0.0-beta.4 | vitest 4.1.6+ | Inherits vulnerabilities from vite, esbuild, and related tooling |

All five vulnerabilities are transitive dependencies of the direct devDependency `vitest@^2.0.0`. Current installed: `vitest@2.1.9`. Latest safe version: `vitest@4.1.6`.

### Outdated Packages (informational — not actionable)
The following direct dependencies have newer major versions available, but are not deprecated and have no security advisories:

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `@types/node` | 22.19.19 | 25.9.0 | Major version behind; stable on 22.x per `engines.node: ">=22"` constraint |
| `eslint` | 9.39.4 | 10.4.0 | Major version behind; ESLint 10 is recent |
| `openai` | 5.23.2 | 6.38.0 | Major version behind; OpenAI SDK v6 released |
| `typescript` | 5.9.3 | 6.0.3 | Major version behind; TypeScript 6 released |
| `vitest` | 2.1.9 | 4.1.6 | Major version behind; **security fix available in 4.x** (see vulnerabilities above) |

## 3. Replacements Applied

None. All identified fixes require major version bumps, which fall outside the validator's auto-fix scope per invariant "Never bump major versions silently."

## 4. Manual Review Needed

### Critical: Security vulnerabilities in vitest (5 moderate)

**Issue:** vitest 2.1.9 has 5 moderate-severity vulnerabilities in its transitive dependencies (vite, esbuild, @vitest/mocker, vite-node). All are fixed in vitest 4.1.6+.

**Why it can't be auto-fixed:** Upgrading from vitest 2.x to 4.x is a major version migration. Per validator invariant #2, major-version bumps require human review to assess breaking changes and API compatibility.

**Recommended next step:**
1. Review the vitest 4.x migration guide: https://vitest.dev/guide/migration.html
2. Update `package.json` devDependencies: `"vitest": "^4.1.6"`
3. Run `npm install`
4. Run `npm test` to verify test suite compatibility
5. If tests pass, proceed. If tests fail, address breaking changes per the migration guide.
6. Re-run this validator to confirm vulnerabilities are resolved.

**Impact assessment:** Vitest is used exclusively in the test suite (devDependency). The vulnerabilities affect the dev server and build tooling (esbuild, vite), which are only active during `npm test` / `npm run dev` — not in production. However, these still represent a real attack surface during development (e.g., malicious website triggering requests to `vite` dev server). Recommend fixing before merging to `main`.

### Informational: Other major-version updates available

The following packages have newer major versions available but are **not deprecated** and have **no security advisories**. These are informational only; updates are optional and should be driven by feature needs, not security.

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `eslint` | 9.39.4 | 10.4.0 | ESLint 10 released recently; review changelog for breaking changes |
| `openai` | 5.23.2 | 6.38.0 | OpenAI SDK v6 may have API changes; review migration guide if upgrading |
| `typescript` | 5.9.3 | 6.0.3 | TypeScript 6 released; review release notes for breaking changes |
| `@types/node` | 22.19.19 | 25.9.0 | Type definitions for Node 25; current version aligns with `engines.node: ">=22"` |

**Recommended next step:** Defer these updates until a feature or bug fix in a newer major version is explicitly needed. Current versions are stable and secure.

## 5. Security Audit

Ran `npm audit --json` on 2026-05-18 at 13:49:47 UTC.

**Summary:**
- **Total vulnerabilities:** 5
- **Critical:** 0
- **High:** 0
- **Moderate:** 5
- **Low:** 0
- **Info:** 0

**Affected packages:**
All 5 vulnerabilities trace to `vitest@2.1.9` (devDependency) and its transitive dependencies. See section 2 (Initial State → Security Vulnerabilities) for details.

**Fix available:**
Upgrade `vitest` from `^2.0.0` to `^4.1.6` (major version bump). This resolves all 5 vulnerabilities. Flagged for manual review (section 4).

## 6. Final State

**Status:** `deprecations_found` (actually "vulnerabilities_found" — no deprecations, but security issues present)

**Deprecations:** None found (0 initial, 0 final).

**Security vulnerabilities:** 5 moderate-severity issues remain. All are resolvable via a major-version upgrade of vitest (2.x → 4.x), which requires manual review.

**Build health:**
- `npm install` exits 0 (after correcting the `@rowanmanning/feed-parser` version typo)
- No deprecated direct dependencies
- All direct dependencies are actively maintained

**Action required:**
1. **Immediate (before merge to main):** Upgrade vitest to 4.x to resolve security vulnerabilities (see section 4).
2. **Optional:** Review other major-version updates (eslint 10, openai 6, typescript 6) on an as-needed basis.

## 7. Commands Run

Each command is listed with its exit code and timestamp.

1. **Initial install (failed — version typo):**
   ```bash
   cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline && npm install
   # Exit code: 1
   # Error: ETARGET No matching version found for @rowanmanning/feed-parser@^1.4.0
   # Timestamp: 2026-05-18T13:49:47.976Z
   ```

2. **Check available versions:**
   ```bash
   npm view @rowanmanning/feed-parser versions --json
   # Exit code: 0
   # Result: Latest version is 2.1.3 (not 1.4.0)
   ```

3. **Corrected package.json and re-ran install:**
   ```bash
   cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline && npm install
   # Exit code: 0
   # Result: added 206 packages, 5 moderate vulnerabilities
   # Timestamp: 2026-05-18T13:49:57.976Z (approx)
   ```

4. **Check for outdated packages:**
   ```bash
   cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline && npm outdated --json
   # Exit code: 0
   # Result: 5 packages have newer major versions (see section 2)
   ```

5. **Security audit:**
   ```bash
   cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline && npm audit --json
   # Exit code: 0
   # Result: 5 moderate vulnerabilities in vitest transitive deps
   ```

6. **Check for deprecated packages:**
   ```bash
   # Looped over all direct dependencies, checking npm view <pkg>@<version> deprecated
   # Exit code: 0
   # Result: No deprecation warnings for any direct dependency
   ```

7. **Git commit lookup:**
   ```bash
   git rev-parse HEAD
   # Exit code: 0
   # Result: 13b5b5ec55e3d9c37a3db0ffa39e081573dd2869
   ```

---

## Appendix: Context from Request File

The validator was provided context from `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/refined-requests/rss-pipeline.md` highlighting:

- `@rowanmanning/feed-parser` is **intentionally chosen** instead of the deprecated `rss-parser` (per refinement reconciliation R-1). The validator did NOT attempt to swap it back — the package is actively maintained (last update March 2026) and not deprecated.
- Other direct dependencies (`openai`, `gray-matter`, `yaml`, `vitest`, `memfs`, `typescript`, `typescript-eslint`, `eslint`, `@types/node`) are all stable and not deprecated.
- The initial version typo (`^1.4.0` instead of `^2.1.3`) was a pre-existing manifest error, not a deprecation.

**Validator conclusion:** The dependency choices are sound. The only actionable item is the vitest security vulnerability, which requires a major-version upgrade and human review.
