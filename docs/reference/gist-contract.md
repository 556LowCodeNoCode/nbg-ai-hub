# Gist data contract — `nbgaihub-favorites.json`

**Status:** authoritative (post-2026-05-18 Option C pivot).
**Audience:** maintainers of the NbgAiHub web site AND the future Claude-side `/hub-*` skill.
**Companion docs:** `docs/refined-requests/personalization-and-contributions.md`, `docs/design/plan-003-personalization-and-contributions.md`, `docs/design/project-design.md §P`.

---

## 1. Purpose

This document describes the **shared data store** between the NbgAiHub web hub and the future Claude-side `/hub-*` skill. Both surfaces — the static Astro site running in the user's browser, and the `/hub-*` slash commands running inside Claude Code — read and write the **same** unlisted GitHub gist, owned by the end user. The gist is the only place a user's favourites/pins live; the project repo stores no per-user state.

The contract below is the wire format. The Claude-side `/hub-*` skill **MUST** follow it byte-for-byte so the two surfaces stay synchronised without any coordination logic.

---

## 2. localStorage keys (web side only)

The web site keeps three keys in `window.localStorage`. All keys are namespaced `nbgaihub.*` and contain plain strings (no JSON wrapping).

| Key | Shape | Set when | Cleared when |
|---|---|---|---|
| `nbgaihub.gh_token` | Plain string — the user's GitHub Personal Access Token (PAT, `gist` scope only). | After PAT validates against `GET https://api.github.com/user` with HTTP 200. | On sign-out; on observed `TokenInvalidError` (401). |
| `nbgaihub.gh_user` | Plain string — the GitHub login (e.g. `chomovazuzana`) extracted from the validation response. | Same moment as `gh_token`. | On sign-out. |
| `nbgaihub.gist_id` | Plain string — the 32-char hex gist id once the favourites gist is discovered or lazily created. | On first successful `findOrCreateFavoritesGist()` call. | On sign-out; on observed `GistNotFoundError` (one-shot — see §5). |

Token storage rule: tokens live in `localStorage` only. Never in cookies, never in `sessionStorage`, never POSTed to any origin other than `https://api.github.com`. The Claude-side skill substitutes the host's `gh` CLI auth for this entire mechanism.

---

## 3. Gist filename

The favourites payload lives in a single file inside the gist:

```
nbgaihub-favorites.json
```

Filename is exact, case-sensitive. The gist may contain other files (the user could have added their own); only the file matching this exact name is the favourites store.

---

## 4. Visibility — unlisted (NOT private)

The gist is created with `public: false`. **GitHub's `public: false` means "unlisted", not "private".**

> Unlisted means **anyone with the URL can read** the gist; it doesn't appear in search, public listings, or the user's public profile, and the URL contains a 32-character hex id that is practically unguessable. But there is no auth gate. NbgAiHub never shares the URL — it lives in the user's `localStorage` and in the user's own GitHub gist listing.

This is **NOT** equivalent to private storage. Treat the gist contents as readable by anyone who has the URL. NbgAiHub's privacy posture is: the user's pins are their own data on their own account; if someone gains access to the gist URL, they see those pins. Don't pin secrets.

---

## 5. JSON schema

The full document is a JSON object with exactly two top-level keys: `schema_version` (integer) and `favourites` (array of records). The wrapper exists so future schema changes can ship without breaking older readers.

### 5.1 Document shape

```jsonc
{
  "schema_version": 1,
  "favourites": [
    { "type": "skill",   "slug": "create-api",     "pinned_at": "2026-05-18" },
    { "type": "tip",     "slug": "esc-esc",        "pinned_at": "2026-05-17" },
    { "type": "news",    "slug": "claude-3-5-ships", "pinned_at": "2026-05-15" }
  ]
}
```

### 5.2 Field contracts

| Field | Type | Notes |
|---|---|---|
| `schema_version` | integer | Always emitted as `1` for now. Readers tolerate absence (see §7 below). |
| `favourites` | array | Insertion-ordered list of pin records. Most-recently-pinned items appear **first** (prepended on add). |
| `favourites[].type` | string enum | One of: `skill`, `tip`, `news`, `journey-step`, `glossary`. These are the five hub content types as of plan-003. |
| `favourites[].slug` | string | Non-empty. Matches the content file's basename without `.md`. Validated against the corresponding `public/_data/<type>-index.json`. |
| `favourites[].pinned_at` | string | `YYYY-MM-DD` (UTC date the pin was created). No time component. No timezone. |

No other fields are written. Readers should ignore unknown fields but never re-emit them.

---

## 6. Read-modify-write (RMW) protocol

Every pin/unpin operation MUST use the following 4-step protocol. There is no atomic update primitive on the gists API and no ETag/optimistic-concurrency support, so RMW is the only safe shape.

```
1. GET  https://api.github.com/gists/<id>            (Authorization: token <PAT>)
2. Parse files["nbgaihub-favorites.json"].content as JSON.
3. Mutate the in-memory `favourites` array (add or remove a record).
4. PATCH https://api.github.com/gists/<id>           (body: {files: {"nbgaihub-favorites.json": {content: <updated JSON>}}})
```

**Concurrency policy: last write wins.** If the user has the site open in two tabs and pins two different items, whichever PATCH lands second silently overwrites the first. This is acceptable for the volume of writes a single user generates (a few per session, most of those minutes apart). Cross-tab race ⇒ a single lost pin is the worst outcome; the user re-pins it.

**No ETag.** The gists API doesn't honour `If-Match` on PATCH. Don't try.

**Stale id recovery.** If the cached `nbgaihub.gist_id` returns 404 on the GET, the client re-runs discovery (`GET /gists`, scan `files` for the canonical filename) **exactly once** and retries the operation against the rediscovered id. If the second attempt also fails, surface the error.

---

## 7. Dedup rule

Pin records are unique by the composite key `(type, slug)`. The writer:

1. Before inserting a new record, scans `favourites` for an existing entry with the same `(type, slug)`.
2. If a duplicate exists, the add is a **no-op** (idempotent). The existing `pinned_at` is preserved.
3. If no duplicate exists, the new record is **prepended** to the array.

The reader should not assume `favourites` is duplicate-free (a buggy writer or hand-edited gist may produce duplicates); when rendering, de-duplicate by `(type, slug)` and keep the first occurrence.

---

## 8. Schema versioning tolerance (AC22)

A legacy gist may lack the `schema_version` wrapper entirely (the favourites array sits at the document root, or the document was written by an older client). Readers MUST:

1. On parse, if the root value is an array, treat it as `favourites` of an implicit `schema_version: 1`. Log `console.warn` **once per session** with the gist id.
2. On parse, if `schema_version` is missing but `favourites` is an array, treat it as `schema_version: 1`. Same one-shot warning.
3. The next write upgrades the document in place — the writer always emits the wrapped shape (`{ schema_version: 1, favourites: [...] }`), so a legacy gist transparently migrates on the user's next pin.

Unknown future `schema_version` values (e.g. `2`) are a hard error — refuse to operate and surface `GistSchemaError("unsupported schema_version")` to the UI. This is the upgrade-gate so an old web client doesn't trample a newer document shape.

---

## 9. Error modes (web-side `gist.ts`)

Surfaced as named exception classes from `site/src/lib/gist.ts`:

| Class | Trigger | UI handling |
|---|---|---|
| `TokenInvalidError` | HTTP 401 from any gists endpoint. | Sign user out, surface "your token expired or was revoked — sign in again". Clear `nbgaihub.gh_token`, `nbgaihub.gh_user`, `nbgaihub.gist_id`. |
| `GistNotFoundError` | HTTP 404 from `GET /gists/<id>` where `<id>` is the cached `nbgaihub.gist_id`. | Drop the cached id, re-run discovery (`GET /gists` and scan), retry once. If still 404, surface "couldn't find your favourites — try signing out and back in". |
| `RateLimitedError` | HTTP 429 (with `Retry-After` if present). | Toast "GitHub rate-limited the request — try again in a moment". Don't auto-retry. |
| `GistSchemaError` | Malformed JSON, unrecognised `schema_version`, or wrong record shape. | Surface "your favourites file appears malformed — open it on github.com to inspect". Don't auto-repair. |

Errors are thrown by name, never silently swallowed. UI toasts surface the underlying message.

---

## 10. Privacy posture

Verbatim copy required on both `/my-pins/` page footer and inside any sign-in modal:

> *"Your pins live in an unlisted gist on your own GitHub account — unlisted means anyone with the URL can read it, but the URL is a 32-char hex id and is never shared by NbgAiHub. The site uses your `gist`-scoped token only to read/write that one file. NbgAiHub does not see or store your pins. To fully revoke access, delete the token at github.com/settings/tokens."*

Implications:

- **The gist is owned by the user, not the project.** If the user leaves the org, deletes their token, or revokes the PAT, their pins vanish with them. The project repo has no copy.
- **No aggregation.** NbgAiHub does not aggregate, count, or sample pins across users.
- **No team-wide stats.** "Most-pinned skill across the team" is intentionally not a feature. If it ever becomes desirable, see `Issues - Pending Items.md` for the opt-in aggregation follow-up.

---

## 11. Multiple gists collision (OQ2)

If a user (manually, outside NbgAiHub) creates a second gist that also contains a file named `nbgaihub-favorites.json`, the discovery scan returns the first match from `GET /gists`. GitHub orders that endpoint by `updated_at` descending. **Last-touched gist wins.** This is documented behaviour, not a bug; the user can resolve it by deleting one of the gists.

---

## 12. Claude-side `/hub-*` skill MUST follow this contract

The future Claude-side skill that exposes `/hub-pin`, `/hub-unpin`, `/hub-pins`, etc. **MUST**:

1. Read and write **the same gist** identified by either the user's `gh` CLI auth context + the canonical filename `nbgaihub-favorites.json`, or by an explicit gist id stored in the plugin's `${CLAUDE_PLUGIN_DATA}/state.json`.
2. Emit and accept the **same wrapped JSON shape** (`{schema_version: 1, favourites: [...]}` with `(type, slug, pinned_at)` records).
3. Follow the **same RMW protocol** — GET, modify, PATCH; no ETag; last-write-wins; idempotent on duplicate `(type, slug)`.
4. Honour the **same `schema_version` versioning rules** — accept legacy unwrapped reads with a one-shot warning; refuse unknown future versions.
5. Surface **equivalent named errors** (TokenInvalid / GistNotFound / RateLimited / GistSchemaError) to the slash-command output.

Example of the read step using `gh` CLI from inside the skill:

```bash
# Discover-or-read pattern (mirroring web-side findOrCreateFavoritesGist):
GIST_ID=$(gh api /gists --jq '.[] | select(.files["nbgaihub-favorites.json"]) | .id' | head -n1)
gh api "/gists/${GIST_ID}" --jq '.files["nbgaihub-favorites.json"].content' | jq .
```

Example of the write step (PATCH):

```bash
# After mutating `favourites` locally and serialising to favourites.json:
gh api -X PATCH "/gists/${GIST_ID}" \
  -F "files[nbgaihub-favorites.json][content]=@favourites.json"
```

If the Claude-side skill ever needs to extend the schema (add a new field to a record, add a new content `type`), the project workflow is: (1) bump `schema_version` to `2`; (2) update **this document** in the same PR; (3) update both the web client and the skill to accept v2 with a fallback to v1 for legacy reads.

---

## 13. References

- Refined request §Data store + F-P8/F-P9/F-P10/F-P20/F-P21: `docs/refined-requests/personalization-and-contributions.md`.
- Plan Steps 6, 7, 16: `docs/design/plan-003-personalization-and-contributions.md`.
- Investigation R2 + Topic 2: `docs/reference/investigation-personalization.md`.
- Design contract for `gist.ts`: `docs/design/project-design.md §P.4.3` + `§P.5.1`.
