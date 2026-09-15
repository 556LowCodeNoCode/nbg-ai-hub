// site/src/lib/api-fetch.ts
//
// Centralised fetch wrapper for every call against api.github.com.
//
// Responsibilities (per project-design.md §P.4.1):
//   - Asserts that the Authorization header is only attached to requests whose
//     URL hostname is exactly `api.github.com` (AC23). Other hosts get no
//     Authorization regardless of init.token.
//   - Sets the canonical Accept + X-GitHub-Api-Version headers.
//   - Maps HTTP failure modes onto named error classes so callers can do
//     `catch (err) { if (err instanceof TokenInvalidError) ... }` flow control.
//   - Wraps low-level fetch rejections (DNS, offline, abort) in NetworkError.
//
// No localStorage, no module-level mutable state. Pure function with a fetch
// side-effect; tests stub `globalThis.fetch` via vi.stubGlobal.

/** Network-layer failure (fetch threw): DNS, offline, CORS pre-flight, abort. */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/** GitHub returned 404 Not Found. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** GitHub returned 403 with rate-limit headers, or 429. `resetAt` is epoch ms. */
export class RateLimitedError extends Error {
  resetAt: number | null;
  constructor(message: string, resetAt: number | null) {
    super(message);
    this.name = 'RateLimitedError';
    this.resetAt = resetAt;
  }
}

/** GitHub returned 401 — PAT is missing/invalid/revoked/lacks-scope. */
export class TokenInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenInvalidError';
  }
}

/** Generic non-2xx surface (4xx other than the named ones, 5xx). */
export class GitHubApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
  }
}

export interface ApiFetchInit extends RequestInit {
  /** GitHub Personal Access Token. Attached as `Authorization: token <token>`
   *  ONLY when the request URL hostname is exactly `api.github.com`. */
  token?: string;
}

const GITHUB_HOST = 'api.github.com';

function isGitHubApiUrl(url: string): boolean {
  try {
    return new URL(url).hostname === GITHUB_HOST;
  } catch {
    return false;
  }
}

function buildHeaders(init: ApiFetchInit | undefined): Headers {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/vnd.github+json');
  }
  if (!headers.has('X-GitHub-Api-Version')) {
    headers.set('X-GitHub-Api-Version', '2022-11-28');
  }
  if (init?.body !== undefined && init.body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

/**
 * Fire a request against the GitHub REST API and map outcomes to named errors.
 *
 * Behaviour matrix:
 *   fetch throws                -> NetworkError
 *   2xx + empty body            -> resolve(undefined as T)
 *   2xx + body                  -> resolve(JSON.parse(body) as T)
 *   401                         -> throw TokenInvalidError
 *   403 + x-ratelimit-remaining=0 -> throw RateLimitedError(resetAt = x-ratelimit-reset*1000)
 *   429                         -> throw RateLimitedError(resetAt = retry-after-derived | null)
 *   403 (other)                 -> throw GitHubApiError(403, ...)
 *   404                         -> throw NotFoundError
 *   other non-2xx               -> throw GitHubApiError(status, ...)
 */
export async function apiFetch<T = unknown>(
  url: string,
  init?: ApiFetchInit,
): Promise<T> {
  const headers = buildHeaders(init);
  if (init?.token !== undefined && isGitHubApiUrl(url)) {
    headers.set('Authorization', `token ${init.token}`);
  }

  // Strip `token` before forwarding init to fetch — RequestInit doesn't know it.
  const forwarded: RequestInit = { ...init, headers };
  delete (forwarded as ApiFetchInit).token;

  let response: Response;
  try {
    response = await fetch(url, forwarded);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new NetworkError(`fetch failed: ${msg}`);
  }

  if (response.ok) {
    // 2xx — attempt to parse JSON; treat empty body as undefined.
    const text = await response.text();
    if (text.length === 0) {
      return undefined as unknown as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new GitHubApiError(
        response.status,
        `Failed to parse JSON response: ${msg}`,
      );
    }
  }

  // Failure path — read body once for diagnostics.
  let bodyText = '';
  try {
    bodyText = await response.text();
  } catch {
    /* swallow — body unreadable. */
  }

  if (response.status === 401) {
    throw new TokenInvalidError(
      `GitHub rejected the token (401): ${bodyText || 'no body'}`,
    );
  }
  if (response.status === 404) {
    throw new NotFoundError(
      `GitHub resource not found (404): ${bodyText || url}`,
    );
  }
  if (response.status === 403) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      const resetHeader = response.headers.get('x-ratelimit-reset');
      const resetSeconds = resetHeader !== null ? Number(resetHeader) : NaN;
      const resetAt = Number.isFinite(resetSeconds) ? resetSeconds * 1000 : null;
      throw new RateLimitedError(
        `GitHub rate limit exceeded (403): ${bodyText || 'no body'}`,
        resetAt,
      );
    }
    throw new GitHubApiError(403, `GitHub forbidden (403): ${bodyText || 'no body'}`);
  }
  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    const seconds = retryAfter !== null ? Number(retryAfter) : NaN;
    const resetAt = Number.isFinite(seconds) ? Date.now() + seconds * 1000 : null;
    throw new RateLimitedError(
      `GitHub rate limit exceeded (429): ${bodyText || 'no body'}`,
      resetAt,
    );
  }

  throw new GitHubApiError(
    response.status,
    `GitHub API error ${response.status}: ${bodyText || 'no body'}`,
  );
}
