# Secrets and one-time setup — RSS triage pipeline

This document is the single source of truth for everything an operator must configure **once, manually, outside this repo** before the `rss-triage` GitHub Action can run end-to-end.

The pipeline itself (under `pipeline/`) and the workflow YAML (`.github/workflows/rss-triage.yml`) are committed code — they are NOT secrets. What lives here is the list of credentials, repo-level toggles, and human-process documentation that does not belong in version control.

**Strict no-fallback policy.** Every secret listed below is mandatory. The pipeline reads each one via `process.env` in `pipeline/src/env.ts` and throws an explicit `MissingEnvVarError` naming the missing variable if any value is absent or empty. There are no defaults, no `.env` file lookups, no `||` fallbacks. This is required by the global rule in `~/.claude/CLAUDE.md` and is asserted by tests AC10a–AC10d in `pipeline/tests/azure-client.test.ts`.

---

## 1. Required GitHub Action secrets (AC15)

Add all four under **`Settings → Secrets and variables → Actions → New repository secret`** in this repo's GitHub UI. Use the exact names below — they are referenced literally from `.github/workflows/rss-triage.yml`.

### `AZURE_OPENAI_ENDPOINT`

- **Value:** Full HTTPS URL of your Azure OpenAI resource.
- **Format:** `https://<resource-name>.openai.azure.com` (no trailing slash, no `/openai/...` path suffix — the SDK appends those).
- **Example:** `https://my-aihub-resource.openai.azure.com`
- **Where to find it:** Azure Portal → your Azure OpenAI resource → **Keys and Endpoint** blade → "Endpoint" field.

### `AZURE_OPENAI_DEPLOYMENT`

- **Value:** The **deployment NAME** you created in Azure AI Foundry / Azure OpenAI Studio. This is NOT the underlying model name (e.g., `gpt-4o-mini`) unless you deliberately named the deployment after the model.
- **Format:** Plain string — whatever you typed into the "Deployment name" field when you created the deployment.
- **Examples:** `gpt-4o-mini`, `hub-triage-prod`, `nbg-aihub-default`.
- **Where to find it:** Azure AI Foundry → **Deployments** blade → "Name" column. (NOT the "Model" column.)
- **Foot-gun:** Confusing the deployment name with the model name is the classic Azure OpenAI mistake. The SDK routes by deployment, not by model — but the SDK ALSO requires you to pass `model: <deployment-name>` to `chat.completions.create()` (Reconciliation R-6 in the plan). Both the constructor's `deployment` arg and the call-site's `model` arg must be the same string: this secret's value.

### `AZURE_OPENAI_API_VERSION`

- **Value:** Azure OpenAI REST API version string.
- **Format:** `YYYY-MM-DD` or `YYYY-MM-DD-preview`.
- **Recommended:** `2024-08-01-preview` (or later GA) — supports `response_format: { type: "json_object" }`, which `pipeline/src/triage.ts` relies on.
- **Where to find it:** Microsoft's [Azure OpenAI REST API reference](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference) lists the current GA and preview versions. Pick the newest GA version your deployment SKU supports.
- **Note:** The pipeline pins the API version explicitly rather than using the newer `v1` GA URL pattern. This is deliberate — explicit versioning gives auditability and aligns with the no-fallback-config discipline.

### `AZURE_OPENAI_API_KEY`

- **Value:** API key for your Azure OpenAI resource.
- **Format:** Opaque string from Azure (long hex/base64-looking).
- **Where to find it:** Azure Portal → your Azure OpenAI resource → **Keys and Endpoint** blade → "KEY 1" or "KEY 2".
- **Rotation:** Azure provides two keys so you can rotate without downtime — update the secret in GitHub with KEY 2, regenerate KEY 1 in Azure, then optionally swap back. This pipeline does not cache the key, so the next run picks up the new value automatically.
- **Treat as opaque.** Do not paste into chat, do not commit, do not log. Compromise = rotate immediately via the Azure Portal.

### `REDDIT_CLIENT_ID` (required when any `reddit-json` feed is enabled)

- **Value:** Reddit app's `client_id` from your developer-app registration.
- **Format:** Short opaque string (~16 chars) shown directly below the app name on the apps page.
- **Why required:** Reddit blocks unauthenticated JSON access from cloud IP ranges including GitHub Actions runners (observed 2026-05-21). The pipeline uses Reddit's Application-Only OAuth (client_credentials grant) — see DECISIONS 2026-05-21 OAuth-pivot entry. Required only when at least one feed in `config/rss-sources.json` has `type: "reddit-json"` and `enabled: true`. The orchestrator gates the env-var read on config (see `pipeline/src/index.ts` and `readRedditCreds` in `pipeline/src/env.ts`).
- **Where to find it:** <https://www.reddit.com/prefs/apps> → your `NbgAiHub-RSS-Pipeline` (or similar) script app → short opaque string under "personal use script".
- **Creating the app (one-time):** Sign in to Reddit → scroll to "create another app..." → fill in: name `NbgAiHub-RSS-Pipeline`, type **"script"**, about URL `https://github.com/556LowCodeNoCode/NbgAiHub`, redirect URI `http://localhost:8080` (required field but unused — Application-Only OAuth doesn't redirect). Click "create app". Two values appear on the new app card — `client_id` (under app name) and `client_secret` (the "secret" field).

### `REDDIT_CLIENT_SECRET` (required when any `reddit-json` feed is enabled)

- **Value:** Reddit app's `client_secret` from the same developer-app registration.
- **Format:** Longer opaque string (~27 chars) shown next to the "secret" label on the apps page.
- **Why required:** Same as `REDDIT_CLIENT_ID`. The pair is sent as HTTP Basic auth to `https://www.reddit.com/api/v1/access_token` once per pipeline run to acquire a ~24h bearer token used against `https://oauth.reddit.com/r/<sub>/new`.
- **Where to find it:** Same Reddit-apps page — the "secret" field on the same app.
- **Rotation:** Reddit's apps page has a "edit" → "regenerate secret" button. Update the GitHub secret with the new value, then click regenerate in the Reddit UI. The pipeline does not cache the secret across runs — the next run picks up the new value.
- **Treat as opaque.** Do not paste into chat, do not commit, do not log. Compromise = regenerate immediately via the Reddit apps page.

---

## 2. One-time repo-level toggle (Assumption A15)

In addition to the workflow-level `permissions:` block in `.github/workflows/rss-triage.yml` (which already grants `contents: write` and `pull-requests: write` — AC18), the **repo itself** must allow GitHub Actions to open pull requests. Without this toggle, `gh pr create` fails with:

> `GitHub Actions is not permitted to create or approve pull requests`

…even though the workflow YAML is correct and the four secrets are set.

**How to enable:**

1. Go to **`Settings → Actions → General`** in this repo's GitHub UI.
2. Scroll to the **"Workflow permissions"** section.
3. Tick the checkbox **"Allow GitHub Actions to create and approve pull requests"**.
4. Click **Save**.

This is documented as the canonical failure mode in the investigation: see `docs/reference/investigation-rss-pipeline.md` §3 (the two-layer permission model — workflow YAML `permissions:` block PLUS this repo-level toggle). The investigation cites Microsoft's docs and a third-party guide at codestudy.net confirming this is the standard fix when the failure surfaces.

Verify by triggering the workflow once via **`Actions → rss-triage → Run workflow`** with a small fixture or live feeds; if the PR opens, the toggle is on.

---

## 3. First-time setup checklist

Run through this end-to-end the first time the pipeline ships in a new fork or a freshly cloned repo. Tick each box before triggering the first scheduled run.

- [ ] **Azure OpenAI resource exists.** A deployment (e.g., `gpt-4o-mini`) is provisioned in Azure AI Foundry. Endpoint, deployment name, API version, and API key are noted somewhere safe.
- [ ] **`AZURE_OPENAI_ENDPOINT`** added under `Settings → Secrets and variables → Actions`.
- [ ] **`AZURE_OPENAI_DEPLOYMENT`** added under `Settings → Secrets and variables → Actions`.
- [ ] **`AZURE_OPENAI_API_VERSION`** added under `Settings → Secrets and variables → Actions`.
- [ ] **`AZURE_OPENAI_API_KEY`** added under `Settings → Secrets and variables → Actions`.
- [ ] **Reddit script-type app created** at <https://www.reddit.com/prefs/apps> (only if you intend to keep `reddit-json` feeds enabled in `config/rss-sources.json`). See §1 for the field-by-field walkthrough.
- [ ] **`REDDIT_CLIENT_ID`** added under `Settings → Secrets and variables → Actions` (only if Reddit feeds enabled).
- [ ] **`REDDIT_CLIENT_SECRET`** added under `Settings → Secrets and variables → Actions` (only if Reddit feeds enabled).
- [ ] **Repo-level "Allow GitHub Actions to create and approve pull requests"** toggled ON under `Settings → Actions → General → Workflow permissions` (§2 above).
- [ ] **Default branch is `main`.** The workflow's `gh pr create --base main` and the editorial flow assume this. If you renamed the default branch, edit the YAML accordingly.
- [ ] **`config/rss-sources.json` is in good shape.** At least one entry has `enabled: true` and a reachable HTTPS URL. The orchestrator exits non-zero with a clear message if zero feeds are enabled.
- [ ] **Trigger a manual run** via `Actions → rss-triage → Run workflow → Run workflow`. Watch the run log. On a quiet day (zero new items after dedup + triage) the run exits 0 with `new_items=false` and no PR is opened — that is the correct AC14 no-op behaviour. On a normal day, a PR titled `News triage YYYY-MM-DD` appears in the **Pull requests** tab.

If the workflow fails on the first manual run, the most common causes (in descending order of likelihood) are:

1. **Repo-level PR toggle not enabled** (§2). Symptom: pipeline succeeds, last step fails on `gh pr create` with "not permitted".
2. **One of the four secrets missing or misspelled.** Symptom: pipeline exits 1 with `MissingEnvVarError: Required environment variable AZURE_OPENAI_<X> is missing or empty`.
3. **`AZURE_OPENAI_DEPLOYMENT` set to the model name instead of the deployment name** (foot-gun §1). Symptom: pipeline reaches the Azure call but every item logs a warning along the lines of "deployment not found".
4. **`AZURE_OPENAI_API_VERSION` too old to support JSON mode.** Symptom: Azure returns an error mentioning `response_format`. Bump to `2024-08-01-preview` or newer.

---

## 4. Editorial workflow (F10) — process, not code

The pipeline is **curated, not auto-aggregated** (DECISIONS.md, 2026-05-18 "Curated RSS, not auto-aggregated"). The Action's job ends when the editorial PR is opened. From that point on, humans drive.

### What the editor does, per PR

1. **Open the PR titled `News triage YYYY-MM-DD`** (auto-created by the workflow on each non-empty run, on a branch named `news-triage/<YYYY-MM-DD>-<short-run-id>`).
2. **Scan the PR body.** Items are grouped by source (feed name) and show: title, source, external link, and the AI-generated two-sentence summary. The PR body is the editorial-review-at-a-glance surface.
3. **For each file under `/news/incoming/` in the PR diff, decide:**
   - **Keep as-is** → leave the file untouched in `/news/incoming/`.
   - **Edit** → tweak the frontmatter (typos in `topics`, wrong `audience` tag, sharper `ai_summary`, etc.) or the body. Edit directly in the PR's "Files changed" view, or check out the branch and amend.
   - **Reject** → delete the file from the branch. **Caveat:** because dedup walks the markdown files themselves (no separate "rejected" overlay — Assumption A3), a deleted item can reappear in a future run if the same feed re-publishes the same fingerprint. This is the known trade-off; Open Question OQ3 owns whether to add a `config/rejected-fingerprints.json` overlay if it becomes painful.
   - **Promote** → move the file from `/news/incoming/<filename>.md` to `/news/published/<filename>.md`. Bump `last_reviewed` in the frontmatter to today's date (the AI's `last_reviewed` was the run date — yours is the human-review date).
4. **Merge the PR** when the in-batch decisions are made. Subsequent edits to published items happen as ordinary PRs against `main`.

### What the editor does NOT do

- **Do not push to `main` directly.** All news items reach `/news/published/` via PR.
- **Do not delete from `/news/published/`** without thought — the file's fingerprint disappears from the seen-set and a future run will re-emit the item. If you genuinely want to retract a published item, prefer rewriting it (with a `last_reviewed` bump) over deleting.
- **Do not edit `AZURE_OPENAI_*` secrets** as part of editorial work. Secrets management is a one-time operator task; routine editorial work is purely PR review.

### Recommended cadence

Open Question OQ2 in `SCOPE.md` owns the final answer. The current schedule is **daily cron at 05:00 UTC** (workflow YAML line `- cron: "0 5 * * *"`), which translates to **08:00 Europe/Athens during DST (UTC+3), 07:00 in winter (UTC+2)**. GH Actions cron is UTC-only — no DST handling. Editorial review cadence remains **weekly** for the moment. Result: ~7 PRs per week, reviewed in one sitting. Flip to twice-weekly cron (`0 5 * * 1,4`) if daily volume feels noisy.

---

## 5. Known weak spots and cost notes

These are not blockers — they are facts the team should know.

### Reddit access — Application-Only OAuth (DECISIONS 2026-05-21)

Reddit blocks unauthenticated JSON access from cloud IP ranges including GitHub Actions runners. The pipeline now uses Reddit's Application-Only OAuth flow:

1. Once per run, POST to `https://www.reddit.com/api/v1/access_token` with HTTP Basic auth (`client_id:client_secret`) and body `grant_type=client_credentials`. Reddit returns a `~24h` bearer token.
2. Subsequent feed fetches hit `https://oauth.reddit.com/r/<sub>/new?limit=25` with `Authorization: Bearer <token>`.

If `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` are missing or invalid when a `reddit-json` feed is enabled, the orchestrator logs `reddit_auth_failed` as a `::warning::` and the affected Reddit feeds fail individually with `FeedFetchError 401` — same non-fatal per-feed contract (Assumption A14, AC6) as any other feed failure. HN / Wired / Verge are unaffected and the run still succeeds.

Token acquisition lives in `pipeline/src/reddit-auth.ts`; the env-var read is conditional and lives in `readRedditCreds` (`pipeline/src/env.ts`).

### Azure OpenAI cost estimate

At `gpt-4o-mini` rates as of mid-2026 (~$0.15 per million input tokens, ~$0.60 per million output tokens), a typical daily run looks like:

```
~5 feeds × ~20 items/feed × ~500 input tokens/item ≈ 50,000 input tokens
~5 feeds × ~20 items/feed × ~150 output tokens/item ≈ 15,000 output tokens
Daily cost ≈ 50K × $0.00015/K + 15K × $0.0006/K ≈ $0.0075 + $0.009 ≈ $0.017
```

Round to **~$0.10/day worst case** for headroom and bigger-model runs. Monthly cost ~$3 on `gpt-4o-mini`; ~$15–$30 on `gpt-4o`. Quota is not a concern at daily cadence — well inside any reasonable Azure subscription's free-tier or pay-as-you-go limits.

### Deployment SKU and structured outputs

Open Question OQ5 owns the final pick. The pipeline uses `response_format: { type: "json_object" }` (plain JSON mode) which works on every Azure OpenAI deployment from `2024-02-01` API onward. If your deployment is on `gpt-4o-2024-08-06` or newer, the pipeline could be upgraded to use `response_format: { type: "json_schema", ... }` for strict schema enforcement — but that pins to specific model versions and is not necessary for the MVP. The current Zod-style validation in `pipeline/src/triage.ts` rejects malformed responses anyway (AC8).

### GitHub Actions minutes consumption (NF5)

The pipeline runs on `ubuntu-latest` with `timeout-minutes: 10`. Typical wall-clock is 1–3 minutes per run. Daily cadence consumes ~90 minutes/month, leaving ample headroom against the 2,000 free private-repo minutes/month allowance on the personal tier.

---

## 6. Where these credentials live in the codebase

For traceability, the six secrets are referenced by name in exactly two places each:

| Location | Purpose |
|---|---|
| `.github/workflows/rss-triage.yml` `env:` block of the **Run RSS triage pipeline** step | Passes the secrets from GitHub into the Node child process as environment variables. |
| `pipeline/src/env.ts` `readEnv()` | Reads the four `AZURE_OPENAI_*` env vars; throws `MissingEnvVarError` on the first missing/empty value. |
| `pipeline/src/env.ts` `readRedditCreds()` | Reads `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET`. Called only when a `reddit-json` feed is enabled. |

Anywhere else they appear (test fixtures, mocks, docs) is non-load-bearing. If you grep the codebase and find another reference, that is a bug — please open an issue.
