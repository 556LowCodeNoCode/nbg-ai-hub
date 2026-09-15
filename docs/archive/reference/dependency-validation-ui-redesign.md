---
status: clean
mode: fix
package_manager: npm
ecosystem: node
iterations_run: 1
deprecations_initial: 0
deprecations_final: 0
vulnerabilities_initial: 0
vulnerabilities_final: 0
target_path: /Users/suzy/ClaudeCode/Projects/NbgAiHub/site
validated_at: 2026-05-19T13:04:23Z
last_validated_commit: 5f03bcffadc2acef857bb6f1885f78b1aa22bb1e
---

# Dependency Validation — NbgAiHub site/ workspace

## 1. Summary

The NbgAiHub site workspace dependency tree is **clean**. npm 10.9.4 on Node 22.22.0 found zero deprecated packages, zero security vulnerabilities, and zero deprecation warnings during install. Build exits clean (`npm run build` → exit 0), all 127 tests pass, and no fix iterations were required. Two routine minor version updates are available (tsx 4.22.2→4.22.3, typescript 5.9.3→6.0.3 major) but neither represents a deprecation or security concern.

## 2. Initial State

No deprecations found. The install output was clean:

```
up to date, audited 456 packages in 1s

210 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

## 3. Replacements Applied

None. No fix iterations were required.

## 4. Manual Review Needed

None. The dependency tree is clean.

### Available Updates (informational only)

Two packages have routine updates available but are not deprecated:

| Package | Current | Wanted | Latest | Type | Notes |
|---|---|---|---|---|---|
| tsx | 4.22.2 | 4.22.3 | 4.22.3 | patch | Semver-compatible patch update within ^4.19.0 range |
| typescript | 5.9.3 | 5.9.3 | 6.0.3 | major | Major version 6.x available; current is latest 5.x; project constraint is ^5.5.0 |

Neither update is required for dependency health. The TypeScript major version bump to 6.x is a breaking change and would require evaluation against the Astro/Starlight ecosystem compatibility.

## 5. Security Audit

npm audit reported zero vulnerabilities across all severity levels:

```json
{
  "vulnerabilities": {
    "info": 0,
    "low": 0,
    "moderate": 0,
    "high": 0,
    "critical": 0,
    "total": 0
  },
  "dependencies": {
    "prod": 346,
    "dev": 103,
    "optional": 111,
    "peer": 0,
    "peerOptional": 0,
    "total": 559
  }
}
```

## 6. Final State

**Status: clean**

- Zero deprecated dependencies
- Zero security vulnerabilities
- Build passes: `npm run build` exits with code 0
- Tests pass: `npm test` reports 127/127 passing
- No lockfile drift or integrity warnings

### Direct Dependencies Snapshot

```
site@0.1.0 /Users/suzy/ClaudeCode/Projects/NbgAiHub/site
├── @astrojs/check@0.9.9
├── @astrojs/starlight@0.39.2
├── astro@6.3.5
├── gray-matter@4.0.3
├── sharp@0.34.5
├── tsx@4.22.2
├── typescript@5.9.3
├── vitest@4.1.6
└── yaml@2.9.0 overridden
```

All packages are actively maintained. The UI redesign work introduced no new dependencies (as noted in the launch context: Inter/JetBrains Mono are resolved via Astro Fonts API at build time; motion uses native IntersectionObserver; view transitions use native CSS).

### TypeScript Warnings (not dependency issues)

The build emits TypeScript warnings about Zod 4.x `.url()` deprecations in `src/content.config.ts` and unused `Props` interfaces in primitive components. These are code-level warnings, not dependency-level deprecations. The Zod `.url()` method is deprecated in favor of `z.url()` (cosmetic API change already noted as deferred in SCOPE.md). No action required for dependency validation.

## 7. Commands Run

All commands executed from `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site`:

1. **npm install** (exit 0) — installed 456 packages with no deprecation warnings
2. **npm outdated --json** (exit 1, normal for outdated check) — returned 2 routine updates available
3. **npm audit --json** (exit 0) — zero vulnerabilities
4. **npm run build** (exit 0) — build completed in 7.02s, 27 pages built
5. **npm test** (exit 0) — 127/127 tests passed in 278ms
6. **npm ls --depth=0** (exit 0) — listed 9 direct dependencies

Total validation time: ~8 seconds (excluding build).

## Validation Evidence

- npm version: 10.9.4
- Node version: 22.22.0
- Package manager: npm (detected via package-lock.json)
- Ecosystem: node
- Lockfile: package-lock.json (in sync with package.json)
- Git commit at validation: `5f03bcffadc2acef857bb6f1885f78b1aa22bb1e`
- Validated at: 2026-05-19T13:04:23Z

## Conclusion

The site workspace is dependency-clean and ready for the UI redesign work to proceed. No deprecated packages were found, no security advisories require attention, and the existing test suite (127 tests) remains green. The two available minor updates (tsx patch, typescript major) are routine and optional — neither blocks the redesign work.
