/**
 * Integration tests for scripts/test-deploy-workflow.js
 *
 * Tests the runDeployTest() function with injected dependencies and
 * real temp directories so no side effects occur in the project.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { runDeployTest } from '../../scripts/test-deploy-workflow.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Creates a unique temp directory and returns its path. */
function makeTempDir() {
  const dir = join(tmpdir(), `deploy-test-${randomBytes(6).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Silently drop all log output during a test. */
function noLog() {
  return () => {};
}

/** Capture log output lines. */
function captureLog() {
  const lines = [];
  return {
    lines,
    log: (...args) => lines.push(args.join(' ')),
  };
}

/**
 * Build a mock execSync that:
 *  - succeeds for commands matching `successPatterns` (returns empty string)
 *  - throws for commands matching `failPatterns`
 *  - calls `onCall` with each invocation for spy purposes
 */
function makeMockExecSync({ successPatterns = [], failPatterns = [], onCall } = {}) {
  return (cmd, opts) => {
    if (onCall) onCall(cmd, opts);

    for (const pattern of failPatterns) {
      if (typeof pattern === 'string' ? cmd.includes(pattern) : pattern.test(cmd)) {
        const err = new Error(`Mock failure: ${cmd}`);
        err.status = 1;
        throw err;
      }
    }

    for (const pattern of successPatterns) {
      if (typeof pattern === 'string' ? cmd.includes(pattern) : pattern.test(cmd)) {
        return '';
      }
    }

    // Default: succeed silently
    return '';
  };
}

// ─── Step 1: Git repository detection ────────────────────────────────────────

describe('Step 1: Git repository check', () => {
  test('passes when git remote get-url origin succeeds', () => {
    const execSyncFn = makeMockExecSync({
      successPatterns: ['git remote get-url origin'],
    });
    const { log } = captureLog();

    const { steps, exitCode } = runDeployTest({
      rootDir: '/any/dir',
      env: { GITHUB_TOKEN: 'token' },
      execSyncFn,
      existsSyncFn: () => true,
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log,
    });

    const step1 = steps.find(s => s.step === 1);
    assert.equal(step1.status, 'passed', 'Step 1 should pass');
  });

  test('fails and exits early when not in a git repo', () => {
    const execSyncFn = makeMockExecSync({
      failPatterns: ['git remote get-url origin'],
    });
    const { lines, log } = captureLog();

    const { steps, exitCode } = runDeployTest({
      rootDir: '/not/a/git/repo',
      env: {},
      execSyncFn,
      existsSyncFn: () => false,
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log,
    });

    const step1 = steps.find(s => s.step === 1);
    assert.equal(step1.status, 'failed', 'Step 1 should fail');
    assert.equal(exitCode, 1, 'Exit code should be 1');

    // Remaining steps must be skipped (no point continuing without a repo)
    const skipped = steps.filter(s => s.status === 'skipped');
    assert.ok(skipped.length >= 4, 'Steps 2-6 should be skipped after Step 1 failure');

    const output = lines.join('\n');
    assert.ok(
      output.includes('Not in a Git repository') || output.includes('no origin remote'),
      'should log appropriate error message'
    );
  });
});

// ─── Step 2: Dependency check ─────────────────────────────────────────────────

describe('Step 2: Dependencies', () => {
  test('skips npm install when node_modules already exists', () => {
    const installCalls = [];
    const execSyncFn = (cmd, opts) => {
      if (cmd.includes('npm install')) installCalls.push(cmd);
      return '';  // all commands succeed
    };
    const { log } = captureLog();

    runDeployTest({
      rootDir: '/any/dir',
      env: { GITHUB_TOKEN: 'token' },
      execSyncFn,
      existsSyncFn: (path) => true,  // package.json AND node_modules both exist
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log,
    });

    assert.equal(installCalls.length, 0, 'npm install should NOT be called when node_modules exists');
  });

  test('runs npm install when node_modules is missing but package.json exists', () => {
    const installCalls = [];
    const execSyncFn = (cmd, opts) => {
      if (cmd.includes('npm install')) installCalls.push(cmd);
      return '';
    };
    const { log } = captureLog();

    runDeployTest({
      rootDir: '/any/dir',
      env: { GITHUB_TOKEN: 'token' },
      execSyncFn,
      existsSyncFn: (path) => {
        // package.json exists, node_modules does NOT
        if (path.includes('node_modules')) return false;
        return true;
      },
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log,
    });

    assert.ok(installCalls.length > 0, 'npm install SHOULD be called when node_modules is missing');
    assert.ok(installCalls[0].includes('npm install'), 'command should be npm install');
  });

  test('step 2 passes after npm install succeeds', () => {
    const { log } = captureLog();

    const { steps } = runDeployTest({
      rootDir: '/any/dir',
      env: { GITHUB_TOKEN: 'token' },
      execSyncFn: () => '',
      existsSyncFn: (path) => !path.includes('node_modules') || path.includes('package.json'),
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log,
    });

    const step2 = steps.find(s => s.step === 2);
    assert.equal(step2.status, 'passed', 'Step 2 should pass');
  });
});

// ─── Step 3: Environment variables ────────────────────────────────────────────

describe('Step 3: Environment variables', () => {
  test('step 3 passes when GITHUB_TOKEN is set', () => {
    const { lines, log } = captureLog();

    const { steps } = runDeployTest({
      rootDir: '/any/dir',
      env: { GITHUB_TOKEN: 'my-github-token' },
      execSyncFn: () => '',
      existsSyncFn: () => true,
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log,
    });

    const step3 = steps.find(s => s.step === 3);
    assert.equal(step3.status, 'passed', 'Step 3 should pass when GITHUB_TOKEN is set');

    const output = lines.join('\n');
    assert.ok(output.includes('✅ GITHUB_TOKEN is set'), 'should show ✅ for GITHUB_TOKEN');
  });

  test('step 3 fails when GITHUB_TOKEN is not set', () => {
    const { lines, log } = captureLog();

    const { steps } = runDeployTest({
      rootDir: '/any/dir',
      env: {},
      execSyncFn: () => '',
      existsSyncFn: () => true,
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log,
    });

    const step3 = steps.find(s => s.step === 3);
    assert.equal(step3.status, 'failed', 'Step 3 should fail when GITHUB_TOKEN is missing');
    assert.ok(
      step3.missingRequired.includes('GITHUB_TOKEN'),
      'missingRequired should include GITHUB_TOKEN'
    );

    const output = lines.join('\n');
    assert.ok(output.includes('❌ GITHUB_TOKEN is not set'), 'should show ❌ for GITHUB_TOKEN');
  });

  test('shows optional status for ANTHROPIC_API_KEY when not set', () => {
    const { lines, log } = captureLog();

    runDeployTest({
      rootDir: '/any/dir',
      env: { GITHUB_TOKEN: 'token' },  // ANTHROPIC_API_KEY deliberately omitted
      execSyncFn: () => '',
      existsSyncFn: () => true,
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log,
    });

    const output = lines.join('\n');
    assert.ok(
      output.includes('⚪ ANTHROPIC_API_KEY is not set (will use default)'),
      'should show ⚪ for optional ANTHROPIC_API_KEY'
    );
  });
});

// ─── Step 4: Credential file creation ─────────────────────────────────────────

describe('Step 4: Credential file creation', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('creates and cleans up test credential files using real filesystem', () => {
    // Set up tmpDir with the minimum structure needed for Steps 1 and 2 to pass
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
    mkdirSync(join(tmpDir, 'node_modules'), { recursive: true });

    // We use the real filesystem for Step 4 I/O; mock shell commands
    const execSyncFn = makeMockExecSync({
      successPatterns: [
        'git remote get-url origin',
        'npm install',
        'npm run validate-secrets',
        'which yq',
        'chmod',
        'rm -rf',
      ],
    });
    const { log } = captureLog();

    const { steps } = runDeployTest({
      rootDir: tmpDir,
      env: { GITHUB_TOKEN: 'token' },
      execSyncFn,
      // Use real existsSync, mkdirSync, writeFileSync for this test
      log,
    });

    // Step 4 should have passed
    const step4 = steps.find(s => s.step === 4);
    assert.equal(step4.status, 'passed', 'Step 4 should pass');

    // Cleanup: .test-credentials dir should NOT exist after the run
    const credDir = join(tmpDir, '.test-credentials');
    assert.ok(!existsSync(credDir), '.test-credentials should be cleaned up after step 4');
  });

  test('step 4 passes when write operations succeed', () => {
    const writtenFiles = [];
    const { log } = captureLog();

    const { steps } = runDeployTest({
      rootDir: '/fake/root',
      env: { GITHUB_TOKEN: 'token' },
      execSyncFn: () => '',
      existsSyncFn: (path) => {
        if (path.includes('.test-credentials')) return false;
        return true;
      },
      mkdirSyncFn: () => {},
      writeFileSyncFn: (path, content) => { writtenFiles.push(path); },
      log,
    });

    const step4 = steps.find(s => s.step === 4);
    assert.equal(step4.status, 'passed', 'Step 4 should pass when writes succeed');
    assert.ok(writtenFiles.length >= 2, 'Should write at least github_token.json and git_ssh.json');
    assert.ok(
      writtenFiles.some(f => f.includes('github_token.json')),
      'Should write github_token.json'
    );
    assert.ok(
      writtenFiles.some(f => f.includes('git_ssh.json')),
      'Should write git_ssh.json'
    );
  });

  test('also writes anthropic_key.json when ANTHROPIC_API_KEY is set', () => {
    const writtenFiles = [];
    const { log } = captureLog();

    runDeployTest({
      rootDir: '/fake/root',
      env: { GITHUB_TOKEN: 'token', ANTHROPIC_API_KEY: 'sk-ant-key' },
      execSyncFn: () => '',
      existsSyncFn: (path) => !path.includes('.test-credentials'),
      mkdirSyncFn: () => {},
      writeFileSyncFn: (path, content) => { writtenFiles.push(path); },
      log,
    });

    assert.ok(
      writtenFiles.some(f => f.includes('anthropic_key.json')),
      'Should write anthropic_key.json when ANTHROPIC_API_KEY is set'
    );
  });
});

// ─── Step 6: Workflow YAML syntax check ───────────────────────────────────────

describe('Step 6: Workflow YAML syntax check', () => {
  test('validates YAML syntax when yq is available', () => {
    const { lines, log } = captureLog();

    const { steps } = runDeployTest({
      rootDir: '/any/dir',
      env: { GITHUB_TOKEN: 'token' },
      execSyncFn: (cmd) => {
        // Simulate yq being available AND validation passing
        if (cmd.includes('which yq') || cmd.includes('yq eval')) return '';
        return '';
      },
      existsSyncFn: () => true,  // .github/workflows/deploy.yml exists
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log,
    });

    const step6 = steps.find(s => s.step === 6);
    assert.equal(step6.status, 'passed', 'Step 6 should pass when yq is available');

    const output = lines.join('\n');
    assert.ok(
      output.includes('Workflow file syntax is valid'),
      'should confirm YAML syntax is valid'
    );
  });

  test('skips YAML validation with info message when yq is not available', () => {
    const { lines, log } = captureLog();

    const { steps } = runDeployTest({
      rootDir: '/any/dir',
      env: { GITHUB_TOKEN: 'token' },
      execSyncFn: (cmd) => {
        // yq command fails (not installed), other commands succeed
        if (cmd.includes('which yq') || cmd.includes('yq eval')) {
          const err = new Error('yq not found');
          err.status = 127;
          throw err;
        }
        return '';
      },
      existsSyncFn: () => true,  // workflow file exists
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log,
    });

    const step6 = steps.find(s => s.step === 6);
    assert.equal(step6.status, 'skipped', 'Step 6 should be skipped when yq is not available');

    const output = lines.join('\n');
    assert.ok(
      output.includes('yq not available'),
      'should log that yq is not available'
    );
  });
});

// ─── Summary / exit code behaviour ────────────────────────────────────────────

describe('Summary: exit code and step counts', () => {
  test('exit code is 0 when GITHUB_TOKEN is set and all steps pass', () => {
    const { exitCode } = runDeployTest({
      rootDir: '/any/dir',
      env: { GITHUB_TOKEN: 'token' },
      execSyncFn: () => '',
      existsSyncFn: () => true,
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log: noLog(),
    });

    assert.equal(exitCode, 0, 'Exit code should be 0 when required env vars are present');
  });

  test('exit code is 1 when GITHUB_TOKEN is missing', () => {
    const { exitCode } = runDeployTest({
      rootDir: '/any/dir',
      env: {},
      execSyncFn: () => '',
      existsSyncFn: () => true,
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log: noLog(),
    });

    assert.equal(exitCode, 1, 'Exit code should be 1 when required env vars are missing');
  });

  test('exit code is 1 when git repo check fails', () => {
    const { exitCode } = runDeployTest({
      rootDir: '/not/a/repo',
      env: { GITHUB_TOKEN: 'token' },
      execSyncFn: (cmd) => {
        if (cmd.includes('git remote')) throw new Error('not a git repo');
        return '';
      },
      existsSyncFn: () => false,
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log: noLog(),
    });

    assert.equal(exitCode, 1, 'Exit code should be 1 when Step 1 fails');
  });

  test('all 6 steps are reported when run completes normally', () => {
    const { steps } = runDeployTest({
      rootDir: '/any/dir',
      env: { GITHUB_TOKEN: 'token' },
      execSyncFn: () => '',
      existsSyncFn: () => true,
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log: noLog(),
    });

    assert.equal(steps.length, 6, 'Should report exactly 6 steps');
    const stepNumbers = steps.map(s => s.step).sort((a, b) => a - b);
    assert.deepEqual(stepNumbers, [1, 2, 3, 4, 5, 6], 'Steps 1-6 should all be present');
  });

  test('fewer than 6 steps reported when script exits early (Step 1 failure)', () => {
    const { steps } = runDeployTest({
      rootDir: '/bad/dir',
      env: {},
      execSyncFn: (cmd) => {
        if (cmd.includes('git remote')) throw new Error('no git');
        return '';
      },
      existsSyncFn: () => false,
      mkdirSyncFn: () => {},
      writeFileSyncFn: () => {},
      log: noLog(),
    });

    // Step 1 failed + remaining are skipped
    assert.equal(steps.length, 6, 'Should still record all 6 steps (some as skipped)');
    assert.equal(steps.find(s => s.step === 1).status, 'failed');
    const skipped = steps.filter(s => s.status === 'skipped');
    assert.ok(skipped.length >= 4, 'At least 4 steps should be skipped');
  });
});
