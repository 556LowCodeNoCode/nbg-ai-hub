// reddit-auth.ts — Reddit "Application Only OAuth" (client_credentials grant).
//
// Reddit's www.reddit.com/r/<sub>/new.json endpoint blocks unauthenticated
// requests from GitHub Actions IP ranges (observed 2026-05-21). The official
// way through is OAuth: send client_id + client_secret to
// https://www.reddit.com/api/v1/access_token, get a bearer token back, then
// hit https://oauth.reddit.com/r/<sub>/new with that token. The Application-
// Only grant gives a read-only token with no user context — sufficient for
// pulling public subreddit listings on a daily cron. Tokens live ~24h; we
// re-acquire each pipeline run.
//
// Pure-ish: depends only on the injected fetch.

import { FEED_USER_AGENT } from "./fetch.js";

export const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

export class RedditAuthError extends Error {
  public readonly status: number | null;

  constructor(status: number | null, message: string) {
    super(message);
    this.name = "RedditAuthError";
    this.status = status;
  }
}

export type RedditToken = {
  accessToken: string;
  /** Seconds until the token expires (typically 86400 = 24h). */
  expiresInSec: number;
};

/**
 * Acquires an Application-Only access token from Reddit. Throws
 * RedditAuthError on any non-2xx response or malformed payload.
 *
 * Pure: takes credentials + a fetch impl, returns a token. Caller decides
 * scope and lifetime — we don't cache.
 */
export async function getRedditAccessToken(
  clientId: string,
  clientSecret: string,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch,
  options?: { timeoutMs?: number },
): Promise<RedditToken> {
  if (!clientId || !clientSecret) {
    throw new RedditAuthError(null, "client_id and client_secret are required");
  }

  const timeoutMs = options?.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  let response: Response;
  try {
    response = await fetchImpl(REDDIT_TOKEN_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${basic}`,
        "User-Agent": FEED_USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
  } catch (err) {
    throw new RedditAuthError(
      null,
      `network error acquiring Reddit token: ${String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new RedditAuthError(
      response.status,
      `Reddit token endpoint returned ${response.status}`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (err) {
    throw new RedditAuthError(
      response.status,
      `failed to parse Reddit token JSON: ${String(err)}`,
    );
  }

  const obj = payload as Record<string, unknown>;
  const token = obj["access_token"];
  const expires = obj["expires_in"];

  if (typeof token !== "string" || token.length === 0) {
    throw new RedditAuthError(
      response.status,
      'Reddit token payload missing "access_token"',
    );
  }
  if (typeof expires !== "number" || expires <= 0) {
    throw new RedditAuthError(
      response.status,
      'Reddit token payload missing or invalid "expires_in"',
    );
  }

  return { accessToken: token, expiresInSec: expires };
}
