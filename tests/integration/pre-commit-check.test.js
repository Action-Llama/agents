/**
 * Integration tests for scripts/pre-commit-check.js
 *
 * Tests the main() function with injected dependencies so no real
 * git state or network access is needed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { main, EMOJI } from '../../scripts/pre-commit-check.js';

// Helper: capture log output from main()
function captureLog() {
  const messages = [];
  const log = (...args) => messages.push(args.join(' '));
  return { messages, log };
}

// Helper: build a simple mock fetch that responds immediately
function mockFetch(status) {
  return async (_url, _opts) => ({ status });
}

// Helper: build a mock fetch that delays but respects AbortSignal (simulates slow network)
function hangingFetch(delayMs) {
  return (_url, opts) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve({ status: 200 }), delayMs);
      // Respect the AbortSignal so AbortSignal.timeout() can cancel this fetch
      if (opts && opts.signal) {
        opts.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(opts.signal.reason);
        });
      }
    });
}

// Helper: build a mock fetch that throws a network error
function errorFetch(message = 'Network error') {
  return async (_url, _opts) => {
    throw new Error(message);
  };
}

describe('pre-commit-check', () => {
  describe('feature branch', () => {
    test('exits early without making any API call on a feature branch', async () => {
      let fetchCalled = false;
      const fetchFn = async () => { fetchCalled = true; return { status: 200 }; };
      const { messages, log } = captureLog();

      await main({
        getBranch: () => 'feature/foo',
        getRepo: () => 'owner/repo',
        fetchFn,
        env: { GITHUB_TOKEN: 'token123' },
        log,
      });

      assert.ok(!fetchCalled, 'fetch should NOT be called for feature branches');
      const output = messages.join('\n');
      assert.ok(
        output.includes("Feature branch commit - deployment won't trigger"),
        'should log feature branch message'
      );
      assert.ok(output.includes('Pre-commit check completed'), 'should log completion');
    });

    test('treats various feature branch name formats as non-main', async () => {
      const branches = ['feature/auth', 'fix/bug-123', 'chore/update-deps', 'develop', 'release/1.0'];
      for (const branch of branches) {
        let fetchCalled = false;
        const { log } = captureLog();

        await main({
          getBranch: () => branch,
          getRepo: () => 'owner/repo',
          fetchFn: async () => { fetchCalled = true; return { status: 200 }; },
          env: { GITHUB_TOKEN: 'token123' },
          log,
        });

        assert.ok(!fetchCalled, `fetch should NOT be called for branch "${branch}"`);
      }
    });
  });

  describe('main branch — secret present (200)', () => {
    test('logs success when API returns 200', async () => {
      const { messages, log } = captureLog();

      await main({
        getBranch: () => 'main',
        getRepo: () => 'owner/repo',
        fetchFn: mockFetch(200),
        env: { GITHUB_TOKEN: 'token123' },
        log,
      });

      const output = messages.join('\n');
      assert.ok(output.includes("You're committing to the main branch"), 'should warn about main');
      assert.ok(
        output.includes('Essential secrets appear to be configured'),
        'should log secret present message'
      );
      assert.ok(output.includes('Pre-commit check completed'), 'should complete');
    });
  });

  describe('main branch — secret missing (404)', () => {
    test('logs warning about missing ANTHROPIC_API_KEY when API returns 404', async () => {
      const { messages, log } = captureLog();

      await main({
        getBranch: () => 'main',
        getRepo: () => 'owner/repo',
        fetchFn: mockFetch(404),
        env: { GITHUB_TOKEN: 'token123' },
        log,
      });

      const output = messages.join('\n');
      assert.ok(
        output.includes('ANTHROPIC_API_KEY is not configured'),
        'should warn about missing ANTHROPIC_API_KEY'
      );
      assert.ok(
        output.includes('Deployment will fail'),
        'should warn that deployment will fail'
      );
      // Script must NOT block commits — it only warns
      assert.ok(
        output.includes('Proceeding with commit'),
        'should proceed despite missing secret'
      );
      assert.ok(output.includes('Pre-commit check completed'), 'should complete');
    });
  });

  describe('main branch — no token', () => {
    test('skips API check and logs info when GITHUB_TOKEN is not set', async () => {
      let fetchCalled = false;
      const { messages, log } = captureLog();

      await main({
        getBranch: () => 'main',
        getRepo: () => 'owner/repo',
        fetchFn: async () => { fetchCalled = true; return { status: 200 }; },
        env: {},  // no token
        log,
      });

      assert.ok(!fetchCalled, 'fetch should NOT be called when no token is available');
      const output = messages.join('\n');
      assert.ok(
        output.includes('To verify deployment readiness'),
        'should suggest how to verify deployment readiness'
      );
      assert.ok(output.includes('Pre-commit check completed'), 'should complete');
    });

    test('also skips when GH_TOKEN is not set', async () => {
      let fetchCalled = false;
      const { log } = captureLog();

      await main({
        getBranch: () => 'main',
        getRepo: () => 'owner/repo',
        fetchFn: async () => { fetchCalled = true; return { status: 200 }; },
        env: { UNRELATED_VAR: 'value' },
        log,
      });

      assert.ok(!fetchCalled, 'fetch should NOT be called when GH_TOKEN is also absent');
    });

    test('uses GH_TOKEN as fallback when GITHUB_TOKEN is not set', async () => {
      let fetchCalled = false;
      const { log } = captureLog();

      await main({
        getBranch: () => 'main',
        getRepo: () => 'owner/repo',
        fetchFn: async () => { fetchCalled = true; return { status: 200 }; },
        env: { GH_TOKEN: 'gh-fallback-token' },
        log,
      });

      assert.ok(fetchCalled, 'fetch SHOULD be called when GH_TOKEN is available');
    });
  });

  describe('main branch — API timeout', () => {
    test('completes within a reasonable time when API hangs beyond timeout', async () => {
      const { messages, log } = captureLog();

      const START = Date.now();
      // Use a very short timeout (100ms) and a fetch that hangs for 2 seconds
      await main({
        getBranch: () => 'main',
        getRepo: () => 'owner/repo',
        fetchFn: hangingFetch(2000),
        env: { GITHUB_TOKEN: 'token123' },
        timeoutMs: 100,
        log,
      });
      const elapsed = Date.now() - START;

      // Should complete well within 2 seconds because of the abort
      assert.ok(elapsed < 1500, `Should finish in <1500ms, took ${elapsed}ms`);

      // Script should continue silently (logs "could not verify" or completion)
      const output = messages.join('\n');
      assert.ok(output.includes('Pre-commit check completed'), 'should still complete after timeout');
    });

    test('timeout aborts and script reports it could not verify secrets', async () => {
      const { messages, log } = captureLog();

      await main({
        getBranch: () => 'main',
        getRepo: () => 'owner/repo',
        fetchFn: hangingFetch(5000),
        env: { GITHUB_TOKEN: 'token123' },
        timeoutMs: 50,
        log,
      });

      const output = messages.join('\n');
      // Network error / timeout path → null return → "Could not verify" message
      assert.ok(
        output.includes('Could not verify secrets'),
        'should log that secrets could not be verified after timeout'
      );
    });
  });

  describe('main branch — network error', () => {
    test('continues without blocking when fetch throws an error', async () => {
      const { messages, log } = captureLog();

      // Should not throw — main() catches errors internally
      await assert.doesNotReject(
        main({
          getBranch: () => 'main',
          getRepo: () => 'owner/repo',
          fetchFn: errorFetch('ECONNREFUSED'),
          env: { GITHUB_TOKEN: 'token123' },
          log,
        })
      );

      const output = messages.join('\n');
      assert.ok(output.includes('Pre-commit check completed'), 'should complete after network error');
    });

    test('logs that secrets could not be verified on network error', async () => {
      const { messages, log } = captureLog();

      await main({
        getBranch: () => 'main',
        getRepo: () => 'owner/repo',
        fetchFn: errorFetch('DNS lookup failed'),
        env: { GITHUB_TOKEN: 'token123' },
        log,
      });

      const output = messages.join('\n');
      assert.ok(
        output.includes('Could not verify secrets'),
        'should log that secrets could not be verified'
      );
    });
  });
});
