// site/tests/api-fetch.test.ts
//
// Unit tests for the apiFetch wrapper. Stubs globalThis.fetch with vi.fn().
// Covers:
//   - 200 JSON happy path
//   - 401 -> TokenInvalidError
//   - 403 + x-ratelimit-remaining:0 -> RateLimitedError (resetAt populated)
//   - 404 -> NotFoundError
//   - fetch rejection -> NetworkError
//   - init.token attaches Authorization header on api.github.com calls
//   - AC23: cross-origin URL with init.token does NOT attach Authorization

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  apiFetch,
  NetworkError,
  NotFoundError,
  RateLimitedError,
  TokenInvalidError,
  GitHubApiError,
} from '../src/lib/api-fetch.js';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function textResponse(status: number, body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers });
}

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON on 200', async () => {
    const mock = vi.fn().mockResolvedValue(jsonResponse(200, { login: 'alice' }));
    vi.stubGlobal('fetch', mock);

    const data = await apiFetch<{ login: string }>('https://api.github.com/user');
    expect(data).toEqual({ login: 'alice' });
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('returns undefined on 2xx with empty body', async () => {
    // 204 itself is a null-body status (Response constructor rejects bodies on
    // 204); 200 with an empty string suffices to exercise the empty-body branch.
    const mock = vi.fn().mockResolvedValue(textResponse(200, ''));
    vi.stubGlobal('fetch', mock);

    const data = await apiFetch<unknown>('https://api.github.com/something');
    expect(data).toBeUndefined();
  });

  it('throws TokenInvalidError on 401', async () => {
    const mock = vi.fn().mockResolvedValue(textResponse(401, 'Bad credentials'));
    vi.stubGlobal('fetch', mock);

    await expect(apiFetch('https://api.github.com/user', { token: 'bad' })).rejects.toBeInstanceOf(
      TokenInvalidError,
    );
  });

  it('throws RateLimitedError on 403 with x-ratelimit-remaining=0 and populates resetAt', async () => {
    const resetSeconds = 1_900_000_000; // some far-future epoch second
    const mock = vi.fn().mockResolvedValue(
      textResponse(403, 'rate limit', {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(resetSeconds),
      }),
    );
    vi.stubGlobal('fetch', mock);

    try {
      await apiFetch('https://api.github.com/rate_limit', { token: 't' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitedError);
      expect((err as RateLimitedError).resetAt).toBe(resetSeconds * 1000);
    }
  });

  it('throws GitHubApiError(403) when 403 but rate-limit headers absent', async () => {
    const mock = vi.fn().mockResolvedValue(textResponse(403, 'forbidden'));
    vi.stubGlobal('fetch', mock);

    try {
      await apiFetch('https://api.github.com/gists');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GitHubApiError);
      expect((err as GitHubApiError).status).toBe(403);
    }
  });

  it('throws NotFoundError on 404', async () => {
    const mock = vi.fn().mockResolvedValue(textResponse(404, 'Not Found'));
    vi.stubGlobal('fetch', mock);

    await expect(apiFetch('https://api.github.com/gists/x')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('wraps fetch rejection in NetworkError', async () => {
    const mock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    vi.stubGlobal('fetch', mock);

    await expect(apiFetch('https://api.github.com/user')).rejects.toBeInstanceOf(NetworkError);
  });

  it('throws GitHubApiError on 5xx with the status', async () => {
    const mock = vi.fn().mockResolvedValue(textResponse(502, 'bad gateway'));
    vi.stubGlobal('fetch', mock);

    try {
      await apiFetch('https://api.github.com/user');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GitHubApiError);
      expect((err as GitHubApiError).status).toBe(502);
    }
  });

  it('init.token attaches Authorization: token <token> header on api.github.com', async () => {
    const mock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal('fetch', mock);

    await apiFetch('https://api.github.com/user', { token: 'ghp_secret' });
    expect(mock).toHaveBeenCalledTimes(1);
    const callArgs = mock.mock.calls[0];
    expect(callArgs).toBeDefined();
    const init = callArgs![1] as RequestInit;
    expect(init).toBeDefined();
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('token ghp_secret');
    expect(headers.get('Accept')).toBe('application/vnd.github+json');
    expect(headers.get('X-GitHub-Api-Version')).toBe('2022-11-28');
  });

  it('AC23: requests to non-api.github.com origins do NOT receive Authorization even when token provided', async () => {
    const mock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal('fetch', mock);

    await apiFetch('https://example.com/foo', { token: 'ghp_should_not_leak' });
    expect(mock).toHaveBeenCalledTimes(1);
    const callArgs = mock.mock.calls[0];
    const init = callArgs![1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.has('Authorization')).toBe(false);
  });

  it('omits Authorization when no token is provided', async () => {
    const mock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal('fetch', mock);

    await apiFetch('https://api.github.com/user');
    const init = mock.mock.calls[0]![1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.has('Authorization')).toBe(false);
  });
});
