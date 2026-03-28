#!/usr/bin/env node

/**
 * Quick Setup Script
 * 
 * Streamlined setup script that provides the fastest path to get the 
 * deployment workflow working. Focuses on the essential steps.
 * 
 * Usage:
 *   npm run quick-setup
 *   # or
 *   node scripts/quick-setup.js
 */

import { execSync } from 'child_process';
import { exit } from 'process';
import { getRepoInfo as _getRepoInfo, checkGitHubToken as _checkGitHubToken } from './utils.js';

const EMOJI = {
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  rocket: '🚀',
  gear: '⚙️',
  link: '🔗',
  key: '🔑'
};

function getRepoInfo() {
  try {
    return _getRepoInfo();
  } catch (error) {
    console.error(`${EMOJI.cross} Error: Could not determine repository.`);
    console.error(`   Run this script from within the repository.`);
    exit(1);
  }
}

function checkGitHubToken() {
  const token = _checkGitHubToken({ exitOnMissing: false });
  if (!token) {
    console.error(`${EMOJI.cross} GitHub token not found.`);
    console.error('   Set GITHUB_TOKEN environment variable:');
    console.error('   export GITHUB_TOKEN="your_token_here"');
    console.error('');
    console.error(`${EMOJI.link} Create token: https://github.com/settings/tokens/new?scopes=repo`);
    exit(1);
  }
  return token;
}

async function checkSecretStatus(repo, token) {
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  const secrets = ['ANTHROPIC_API_KEY', 'DEPLOY_SSH_KEY', 'DEPLOY_ENV_TOML'];
  const status = {};

  for (const secret of secrets) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${secret}`, { headers });
      status[secret] = response.status === 200;
    } catch (error) {
      status[secret] = false;
    }
  }

  return status;
}

function printQuickLinks(repo) {
  console.log(`${EMOJI.link} Quick Links:`);
  console.log(`   Repository secrets: https://github.com/${repo}/settings/secrets/actions`);
  console.log(`   Anthropic API keys: https://console.anthropic.com/account/keys`);
  console.log(`   SSH key docs: https://docs.github.com/en/authentication/connecting-to-github-with-ssh`);
  console.log('');
}

function printMissingSecrets(missingSecrets, repo) {
  console.log(`${EMOJI.gear} REQUIRED ACTIONS:`);
  console.log('');
  console.log(`${EMOJI.info} Go to: https://github.com/${repo}/settings/secrets/actions`);
  console.log('');

  if (missingSecrets.includes('ANTHROPIC_API_KEY')) {
    console.log(`${EMOJI.key} ANTHROPIC_API_KEY:`);
    console.log('   1. Get API key from: https://console.anthropic.com/account/keys');
    console.log('   2. Click "New repository secret"');
    console.log('   3. Name: ANTHROPIC_API_KEY');
    console.log('   4. Value: sk-ant-... (your API key)');
    console.log('');
  }

  if (missingSecrets.includes('DEPLOY_SSH_KEY')) {
    console.log(`${EMOJI.key} DEPLOY_SSH_KEY:`);
    console.log('   1. Generate SSH key: ssh-keygen -t rsa -b 4096 -C "deploy@action-llama.com"');
    console.log('   2. Copy private key content');
    console.log('   3. Click "New repository secret"');
    console.log('   4. Name: DEPLOY_SSH_KEY');
    console.log('   5. Value: (paste private key content)');
    console.log('');
  }

  if (missingSecrets.includes('DEPLOY_ENV_TOML')) {
    console.log(`${EMOJI.key} DEPLOY_ENV_TOML:`);
    console.log('   1. Create production environment config');
    console.log('   2. Click "New repository secret"');
    console.log('   3. Name: DEPLOY_ENV_TOML');
    console.log('   4. Value: (TOML configuration content)');
    console.log('');
  }
}

async function main() {
  console.log(`${EMOJI.rocket} Quick Setup for Action-Llama Agents`);
  console.log('='.repeat(50));
  console.log('');

  const repo = getRepoInfo();
  const token = checkGitHubToken();

  console.log(`${EMOJI.info} Repository: ${repo}`);
  console.log('');

  console.log(`${EMOJI.gear} Checking current setup...`);
  const secretStatus = await checkSecretStatus(repo, token);

  const missingSecrets = Object.entries(secretStatus)
    .filter(([, configured]) => !configured)
    .map(([name]) => name);

  if (missingSecrets.length === 0) {
    console.log(`${EMOJI.check} All required secrets are configured!`);
    console.log('');
    console.log(`${EMOJI.rocket} Test your setup:`);
    console.log('   npm run test-workflow');
    console.log('');
    console.log(`${EMOJI.info} Trigger deployment by pushing to main branch.`);
    return;
  }

  console.log(`${EMOJI.warning} Missing ${missingSecrets.length} required secrets:`);
  missingSecrets.forEach(secret => {
    console.log(`   ${EMOJI.cross} ${secret}`);
  });
  console.log('');

  printQuickLinks(repo);
  printMissingSecrets(missingSecrets, repo);

  console.log(`${EMOJI.rocket} After adding secrets:`);
  console.log('   1. Re-run this script to verify: npm run quick-setup');
  console.log('   2. Test the workflow: npm run test-workflow');
  console.log('   3. Push to main branch to trigger deployment');
  console.log('');
  console.log(`${EMOJI.warning} Need help? Run: npm run setup`);
}

main().catch(error => {
  console.error(`${EMOJI.cross} Setup check failed:`, error.message);
  exit(1);
});