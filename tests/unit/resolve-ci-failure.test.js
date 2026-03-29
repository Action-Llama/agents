/**
 * Unit tests for resolve-ci-failure.js
 *
 * Tests pattern matching, solution printing, and secret validation logic.
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  matchFailurePattern,
  CI_FAILURE_PATTERNS,
  SECRET_SOLUTIONS,
  printSolution,
  validateSecretExists,
  validateAllSecrets,
} from '../../scripts/resolve-ci-failure.js';

// ---------------------------------------------------------------------------
// Pattern matching tests
// ---------------------------------------------------------------------------

describe('matchFailurePattern()', () => {
  test('matches MISSING_ANTHROPIC_KEY when "ANTHROPIC_API_KEY not set"', () => {
    const result = matchFailurePattern('ANTHROPIC_API_KEY not set');
    assert.ok(result, 'Expected a match');
    assert.equal(result, CI_FAILURE_PATTERNS.MISSING_ANTHROPIC_KEY);
  });

  test('matches MISSING_ANTHROPIC_KEY when "ANTHROPIC_API_KEY is not configured"', () => {
    const result = matchFailurePattern('ANTHROPIC_API_KEY is not configured');
    assert.ok(result, 'Expected a match');
    assert.equal(result, CI_FAILURE_PATTERNS.MISSING_ANTHROPIC_KEY);
  });

  test('matches ONLY_ANTHROPIC_KEY_MISSING when only anthropic key is absent', () => {
    const result = matchFailurePattern(
      'ANTHROPIC_API_KEY not set, DEPLOY_SSH_KEY is set, DEPLOY_ENV_TOML is set'
    );
    assert.ok(result, 'Expected a match');
    assert.equal(result, CI_FAILURE_PATTERNS.ONLY_ANTHROPIC_KEY_MISSING);
  });

  test('matches MISSING_DEPLOY_SSH when "DEPLOY_SSH_KEY not set"', () => {
    const result = matchFailurePattern('DEPLOY_SSH_KEY not set');
    assert.ok(result, 'Expected a match');
    assert.equal(result, CI_FAILURE_PATTERNS.MISSING_DEPLOY_SSH);
  });

  test('matches MISSING_DEPLOY_SSH when "SSH authentication failed"', () => {
    const result = matchFailurePattern('SSH authentication failed');
    assert.ok(result, 'Expected a match');
    assert.equal(result, CI_FAILURE_PATTERNS.MISSING_DEPLOY_SSH);
  });

  test('matches MISSING_DEPLOY_ENV when "DEPLOY_ENV_TOML not set"', () => {
    const result = matchFailurePattern('DEPLOY_ENV_TOML not set');
    assert.ok(result, 'Expected a match');
    assert.equal(result, CI_FAILURE_PATTERNS.MISSING_DEPLOY_ENV);
  });

  test('matches GENERAL_SECRET_MISSING when "repository secret not set"', () => {
    const result = matchFailurePattern('repository secret not set');
    assert.ok(result, 'Expected a match');
    assert.equal(result, CI_FAILURE_PATTERNS.GENERAL_SECRET_MISSING);
  });

  test('returns null for "Build succeeded"', () => {
    const result = matchFailurePattern('Build succeeded');
    assert.equal(result, null);
  });

  test('returns null for empty string', () => {
    const result = matchFailurePattern('');
    assert.equal(result, null);
  });

  test('priority ordering: MISSING_ANTHROPIC_KEY wins over GENERAL_SECRET_MISSING', () => {
    // Text that could match both MISSING_ANTHROPIC_KEY and GENERAL_SECRET_MISSING
    const text = 'ANTHROPIC_API_KEY not set, repository secret not set';
    const result = matchFailurePattern(text);
    assert.ok(result, 'Expected a match');
    // MISSING_ANTHROPIC_KEY is listed first in CI_FAILURE_PATTERNS, so it wins
    assert.equal(result, CI_FAILURE_PATTERNS.MISSING_ANTHROPIC_KEY);
  });
});

// ---------------------------------------------------------------------------
// CI_FAILURE_PATTERNS structure
// ---------------------------------------------------------------------------

describe('CI_FAILURE_PATTERNS structure', () => {
  test('has expected keys', () => {
    const keys = Object.keys(CI_FAILURE_PATTERNS);
    assert.ok(keys.includes('MISSING_ANTHROPIC_KEY'));
    assert.ok(keys.includes('ONLY_ANTHROPIC_KEY_MISSING'));
    assert.ok(keys.includes('MISSING_DEPLOY_SSH'));
    assert.ok(keys.includes('MISSING_DEPLOY_ENV'));
    assert.ok(keys.includes('GENERAL_SECRET_MISSING'));
  });

  test('each pattern entry has required fields', () => {
    for (const [key, entry] of Object.entries(CI_FAILURE_PATTERNS)) {
      assert.ok(entry.pattern instanceof RegExp, `${key} should have a RegExp pattern`);
      assert.ok(typeof entry.title === 'string', `${key} should have a title`);
      assert.ok(typeof entry.solution === 'string', `${key} should have a solution key`);
      assert.ok(typeof entry.priority === 'string', `${key} should have a priority`);
    }
  });
});

// ---------------------------------------------------------------------------
// printSolution() tests
// ---------------------------------------------------------------------------

describe('printSolution()', () => {
  let logs;
  let originalLog;

  beforeEach(() => {
    logs = [];
    originalLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test('ALL_SECRETS prints all secret names', () => {
    printSolution('ALL_SECRETS', 'Action-Llama/agents');
    const output = logs.join('\n');
    assert.ok(output.includes('ANTHROPIC_API_KEY'), 'Should mention ANTHROPIC_API_KEY');
    assert.ok(output.includes('DEPLOY_SSH_KEY'), 'Should mention DEPLOY_SSH_KEY');
    assert.ok(output.includes('DEPLOY_ENV_TOML'), 'Should mention DEPLOY_ENV_TOML');
  });

  test('ANTHROPIC_API_KEY prints Anthropic-specific steps', () => {
    printSolution('ANTHROPIC_API_KEY', 'Action-Llama/agents');
    const output = logs.join('\n');
    assert.ok(output.includes('ANTHROPIC_API_KEY'), 'Should mention ANTHROPIC_API_KEY');
    assert.ok(output.includes('console.anthropic.com'), 'Should include Anthropic console URL');
  });

  test('ANTHROPIC_API_KEY_ONLY includes npm run fix-anthropic-key shortcut', () => {
    printSolution('ANTHROPIC_API_KEY_ONLY', 'Action-Llama/agents');
    const output = logs.join('\n');
    assert.ok(output.includes('fix-anthropic-key'), 'Should include fix-anthropic-key shortcut');
  });

  test('{repo_url} is replaced with actual repo URL', () => {
    const repo = 'Action-Llama/agents';
    printSolution('ANTHROPIC_API_KEY', repo);
    const output = logs.join('\n');
    assert.ok(
      output.includes(`https://github.com/${repo}`),
      'Should contain expanded repo URL'
    );
    assert.ok(!output.includes('{repo_url}'), 'Should not contain un-replaced template token');
  });

  test('unknown solution key prints a warning', () => {
    printSolution('UNKNOWN_KEY_XYZ', 'Action-Llama/agents');
    const output = logs.join('\n');
    assert.ok(
      output.toLowerCase().includes('no specific solution') ||
        output.toLowerCase().includes('warning') ||
        output.includes('UNKNOWN_KEY_XYZ'),
      'Should print a warning for unknown solution key'
    );
  });
});

// ---------------------------------------------------------------------------
// validateSecretExists() tests
// ---------------------------------------------------------------------------

describe('validateSecretExists()', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns true when API responds with 200', async () => {
    global.fetch = async () => ({ status: 200 });
    const result = await validateSecretExists('Action-Llama/agents', 'fake-token', 'ANTHROPIC_API_KEY');
    assert.equal(result, true);
  });

  test('returns false when API responds with 404', async () => {
    global.fetch = async () => ({ status: 404 });
    const result = await validateSecretExists('Action-Llama/agents', 'fake-token', 'ANTHROPIC_API_KEY');
    assert.equal(result, false);
  });

  test('returns null on network error', async () => {
    global.fetch = async () => { throw new Error('Network error'); };
    const result = await validateSecretExists('Action-Llama/agents', 'fake-token', 'ANTHROPIC_API_KEY');
    assert.equal(result, null);
  });

  test('returns null without making an API call when no token provided', async () => {
    let called = false;
    global.fetch = async () => { called = true; return { status: 200 }; };
    const result = await validateSecretExists('Action-Llama/agents', null, 'ANTHROPIC_API_KEY');
    assert.equal(result, null);
    assert.equal(called, false, 'fetch should not be called when token is absent');
  });

  test('returns null without making an API call when token is empty string', async () => {
    let called = false;
    global.fetch = async () => { called = true; return { status: 200 }; };
    const result = await validateSecretExists('Action-Llama/agents', '', 'ANTHROPIC_API_KEY');
    assert.equal(result, null);
    assert.equal(called, false, 'fetch should not be called when token is empty');
  });
});

// ---------------------------------------------------------------------------
// validateAllSecrets() tests
// ---------------------------------------------------------------------------

describe('validateAllSecrets()', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns true for all 3 secrets when all exist', async () => {
    global.fetch = async () => ({ status: 200 });
    const result = await validateAllSecrets('Action-Llama/agents', 'fake-token');
    assert.deepEqual(result, {
      ANTHROPIC_API_KEY: true,
      DEPLOY_SSH_KEY: true,
      DEPLOY_ENV_TOML: true,
    });
  });

  test('returns correct per-secret status with mixed results', async () => {
    // ANTHROPIC_API_KEY → 200, DEPLOY_SSH_KEY → 404, DEPLOY_ENV_TOML → 200
    const responses = {
      ANTHROPIC_API_KEY: 200,
      DEPLOY_SSH_KEY: 404,
      DEPLOY_ENV_TOML: 200,
    };
    global.fetch = async (url) => {
      for (const [name, status] of Object.entries(responses)) {
        if (url.includes(name)) return { status };
      }
      return { status: 404 };
    };

    const result = await validateAllSecrets('Action-Llama/agents', 'fake-token');
    assert.equal(result.ANTHROPIC_API_KEY, true);
    assert.equal(result.DEPLOY_SSH_KEY, false);
    assert.equal(result.DEPLOY_ENV_TOML, true);
  });

  test('returns object with 3 keys', async () => {
    global.fetch = async () => ({ status: 200 });
    const result = await validateAllSecrets('Action-Llama/agents', 'fake-token');
    const keys = Object.keys(result);
    assert.equal(keys.length, 3);
    assert.ok(keys.includes('ANTHROPIC_API_KEY'));
    assert.ok(keys.includes('DEPLOY_SSH_KEY'));
    assert.ok(keys.includes('DEPLOY_ENV_TOML'));
  });
});
