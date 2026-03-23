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

const EMOJI = {
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

async function quickSecretCheck(repo, token) {
  if (!repo || !token) {
    return null;
  }

  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/ANTHROPIC_API_KEY`, { 
      headers,
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    return response.status === 200;
  } catch (error) {
    return null; // Network error or timeout
  }
}

async function main() {
  const repo = getRepoInfo();
  const branch = checkBranch();
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  console.log(`${EMOJI.gear} Pre-commit Setup Check`);
  console.log('');

  // Quick branch check
  if (branch === 'main') {
    console.log(`${EMOJI.warning} You're committing to the main branch.`);
    console.log(`${EMOJI.info} This will trigger the deployment workflow.`);
    console.log('');

    // Only do detailed checking for main branch commits
    if (repo && token) {
      console.log(`${EMOJI.gear} Checking deployment readiness...`);
      
      const hasAnthropicKey = await quickSecretCheck(repo, token);
      
      if (hasAnthropicKey === false) {
        console.log(`${EMOJI.cross} WARNING: ANTHROPIC_API_KEY is not configured.`);
        console.log(`${EMOJI.warning} Deployment will fail until this secret is added.`);
        console.log('');
        console.log(`${EMOJI.gear} To fix this before committing:`);
        console.log('   npm run quick-setup');
        console.log('');
        console.log(`${EMOJI.info} Or commit with "dry-run" in message to test workflow:`);
        console.log('   git commit -m "test: dry-run workflow validation"');
        console.log('');
        
        // Don't fail pre-commit, but warn user
        console.log(`${EMOJI.warning} Proceeding with commit (deployment will need setup)`);
      } else if (hasAnthropicKey === true) {
        console.log(`${EMOJI.check} Essential secrets appear to be configured.`);
      } else {
        console.log(`${EMOJI.info} Could not verify secrets (network/permissions).`);
        console.log(`${EMOJI.info} Run 'npm run quick-setup' to verify setup.`);
      }
    } else {
      console.log(`${EMOJI.info} To verify deployment readiness:`);
      console.log('   GITHUB_TOKEN=your_token npm run quick-setup');
    }
  } else {
    console.log(`${EMOJI.check} Feature branch commit - deployment won't trigger.`);
  }

  console.log('');
  console.log(`${EMOJI.check} Pre-commit check completed.`);
}

main().catch(error => {
  console.error(`${EMOJI.cross} Pre-commit check failed:`, error.message);
  // Don't fail the commit for check errors
  exit(0);
});