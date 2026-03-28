#!/usr/bin/env node

/**
 * Pre-commit Setup Check
 * 
 * Lightweight validation that runs before commits to catch potential
 * deployment issues early. This prevents CI failures due to missing secrets.
 * 
 * Usage:
 *   node scripts/pre-commit-check.js
 * 
 * This can be integrated into Git hooks or run manually before committing
 * changes that might trigger deployment workflows.
 */

import { execSync } from 'child_process';
import { exit } from 'process';
import { fileURLToPath } from 'url';

export const EMOJI = {
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  gear: '⚙️'
};

function getRepoInfo() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
    if (!match) {
      return null;
    }
    return `${match[1]}/${match[2]}`;
  } catch (error) {
    return null;
  }
}

function checkBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    return branch;
  } catch (error) {
    return null;
  }
}

async function quickSecretCheck(repo, token, fetchFn, timeoutMs) {
  if (!repo || !token) {
    return null;
  }

  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  try {
    const response = await fetchFn(
      `https://api.github.com/repos/${repo}/actions/secrets/ANTHROPIC_API_KEY`,
      { 
        headers,
        signal: AbortSignal.timeout(timeoutMs)
      }
    );
    return response.status === 200;
  } catch (error) {
    return null; // Network error or timeout
  }
}

/**
 * Main pre-commit check logic.
 *
 * @param {object} [deps] - Injectable dependencies for testing
 * @param {() => string|null} [deps.getBranch] - Returns current git branch
 * @param {() => string|null} [deps.getRepo] - Returns "owner/repo" string
 * @param {Function} [deps.fetchFn] - fetch-compatible function for API calls
 * @param {object} [deps.env] - Environment variables (defaults to process.env)
 * @param {number} [deps.timeoutMs] - Timeout for API calls in milliseconds
 * @param {Function} [deps.log] - Logging function (defaults to console.log)
 */
export async function main({
  getBranch = checkBranch,
  getRepo = getRepoInfo,
  fetchFn = fetch,
  env = process.env,
  timeoutMs = 3000,
  log = console.log,
} = {}) {
  const repo = getRepo();
  const branch = getBranch();
  const token = env.GITHUB_TOKEN || env.GH_TOKEN;

  log(`${EMOJI.gear} Pre-commit Setup Check`);
  log('');

  // Quick branch check
  if (branch === 'main') {
    log(`${EMOJI.warning} You're committing to the main branch.`);
    log(`${EMOJI.info} This will trigger the deployment workflow.`);
    log('');

    // Only do detailed checking for main branch commits
    if (repo && token) {
      log(`${EMOJI.gear} Checking deployment readiness...`);
      
      const hasAnthropicKey = await quickSecretCheck(repo, token, fetchFn, timeoutMs);
      
      if (hasAnthropicKey === false) {
        log(`${EMOJI.cross} WARNING: ANTHROPIC_API_KEY is not configured.`);
        log(`${EMOJI.warning} Deployment will fail until this secret is added.`);
        log('');
        log(`${EMOJI.gear} To fix this before committing:`);
        log('   npm run quick-setup');
        log('');
        log(`${EMOJI.info} Or commit with "dry-run" in message to test workflow:`);
        log('   git commit -m "test: dry-run workflow validation"');
        log('');
        
        // Don't fail pre-commit, but warn user
        log(`${EMOJI.warning} Proceeding with commit (deployment will need setup)`);
      } else if (hasAnthropicKey === true) {
        log(`${EMOJI.check} Essential secrets appear to be configured.`);
      } else {
        log(`${EMOJI.info} Could not verify secrets (network/permissions).`);
        log(`${EMOJI.info} Run 'npm run quick-setup' to verify setup.`);
      }
    } else {
      log(`${EMOJI.info} To verify deployment readiness:`);
      log('   GITHUB_TOKEN=your_token npm run quick-setup');
    }
  } else {
    log(`${EMOJI.check} Feature branch commit - deployment won't trigger.`);
  }

  log('');
  log(`${EMOJI.check} Pre-commit check completed.`);
}

// Only run when invoked directly (not when imported as a module)
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(error => {
    console.error(`${EMOJI.cross} Pre-commit check failed:`, error.message);
    // Don't fail the commit for check errors
    exit(0);
  });
}
