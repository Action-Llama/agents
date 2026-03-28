#!/usr/bin/env node

/**
 * Setup Status Dashboard
 * 
 * Provides a comprehensive overview of the repository setup status,
 * including secrets, variables, workflow status, and next steps.
 * 
 * Usage:
 *   node scripts/setup-status.js
 */

import { execSync } from 'child_process';
import { exit } from 'process';
import { getRepoInfo as _getRepoInfo, checkGitHubToken as _checkGitHubToken } from './utils.js';

const EMOJI = {
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  gear: '⚙️',
  chart: '📊',
  rocket: '🚀',
  link: '🔗',
  clock: '⏰'
};

function getRepoInfo() {
  try {
    return _getRepoInfo();
  } catch (error) {
    console.error(`${EMOJI.cross} Error: Could not determine repository.`);
    exit(1);
  }
}

function checkGitHubToken() {
  return _checkGitHubToken({ exitOnMissing: false });
}

async function getSetupStatus(repo, token) {
  const status = {
    secrets: {},
    variables: {},
    lastWorkflowRun: null,
    canCheck: !!token
  };

  if (!token) {
    return status;
  }

  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  // Check secrets
  const requiredSecrets = ['ANTHROPIC_API_KEY', 'DEPLOY_SSH_KEY', 'DEPLOY_ENV_TOML'];
  for (const secret of requiredSecrets) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${secret}`, { headers });
      status.secrets[secret] = response.status === 200;
    } catch (error) {
      status.secrets[secret] = null; // Error checking
    }
  }

  // Check variables
  const optionalVars = ['GIT_EMAIL', 'GIT_NAME'];
  for (const variable of optionalVars) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/actions/variables/${variable}`, { headers });
      status.variables[variable] = response.status === 200;
    } catch (error) {
      status.variables[variable] = null;
    }
  }

  // Check latest workflow runs
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/deploy.yml/runs?per_page=3`, { headers });
    if (response.ok) {
      const data = await response.json();
      status.lastWorkflowRun = data.workflow_runs[0] || null;
    }
  } catch (error) {
    // Ignore workflow run errors
  }

  return status;
}

function printHeader(repo) {
  console.log(`${EMOJI.chart} Setup Status Dashboard`);
  console.log('='.repeat(60));
  console.log(`Repository: ${repo}`);
  console.log('');
}

function printSecretStatus(secrets, canCheck) {
  console.log(`${EMOJI.gear} Required Secrets`);
  console.log('-'.repeat(30));

  if (!canCheck) {
    console.log(`${EMOJI.warning} Cannot check secrets (no GitHub token)`);
    console.log(`${EMOJI.info} Set GITHUB_TOKEN to see detailed status`);
    console.log('');
    return;
  }

  const secretDescriptions = {
    'ANTHROPIC_API_KEY': 'API key for Claude models',
    'DEPLOY_SSH_KEY': 'SSH key for deployment access',
    'DEPLOY_ENV_TOML': 'Environment configuration'
  };

  let configuredCount = 0;
  let totalCount = 0;

  Object.entries(secrets).forEach(([name, configured]) => {
    totalCount++;
    const status = configured === true ? `${EMOJI.check} Configured` :
                   configured === false ? `${EMOJI.cross} Missing` :
                   `${EMOJI.warning} Error checking`;
    
    if (configured === true) configuredCount++;

    console.log(`${name}:`);
    console.log(`  Status: ${status}`);
    console.log(`  Purpose: ${secretDescriptions[name]}`);
    console.log('');
  });

  console.log(`Summary: ${configuredCount}/${totalCount} secrets configured`);
  console.log('');
}

function printVariableStatus(variables, canCheck) {
  console.log(`${EMOJI.gear} Optional Variables`);
  console.log('-'.repeat(30));

  if (!canCheck) {
    console.log(`${EMOJI.info} Cannot check variables (no GitHub token)`);
    console.log('');
    return;
  }

  const variableDescriptions = {
    'GIT_EMAIL': 'Email for deployment commits',
    'GIT_NAME': 'Name for deployment commits'
  };

  const defaults = {
    'GIT_EMAIL': 'deploy@action-llama.com',
    'GIT_NAME': 'Action Llama Deploy'
  };

  Object.entries(variables).forEach(([name, configured]) => {
    const status = configured === true ? `${EMOJI.check} Custom` :
                   `${EMOJI.info} Default (${defaults[name]})`;

    console.log(`${name}: ${status}`);
  });
  console.log('');
}

function printWorkflowStatus(workflowRun) {
  console.log(`${EMOJI.rocket} Recent Workflow Activity`);
  console.log('-'.repeat(30));

  if (!workflowRun) {
    console.log(`${EMOJI.info} No recent workflow runs found`);
    console.log('');
    return;
  }

  const statusEmoji = workflowRun.conclusion === 'success' ? EMOJI.check :
                      workflowRun.conclusion === 'failure' ? EMOJI.cross :
                      workflowRun.status === 'in_progress' ? EMOJI.clock :
                      EMOJI.warning;

  console.log(`Latest run: ${statusEmoji} ${workflowRun.conclusion || workflowRun.status}`);
  console.log(`Branch: ${workflowRun.head_branch}`);
  console.log(`Created: ${new Date(workflowRun.created_at).toLocaleString()}`);
  console.log(`${EMOJI.link} View: ${workflowRun.html_url}`);
  console.log('');
}

function printNextSteps(secrets, canCheck, repo) {
  console.log(`${EMOJI.rocket} Next Steps`);
  console.log('-'.repeat(30));

  if (!canCheck) {
    console.log('1. Set GitHub token to check current status:');
    console.log('   export GITHUB_TOKEN="your_token_here"');
    console.log('   npm run status');
    console.log('');
    return;
  }

  const missingSecrets = Object.entries(secrets)
    .filter(([, configured]) => configured === false)
    .map(([name]) => name);

  if (missingSecrets.length === 0) {
    console.log(`${EMOJI.check} All secrets configured! Ready to deploy.`);
    console.log('');
    console.log('Test your setup:');
    console.log('   npm run test-workflow');
    console.log('');
    console.log('Deploy by pushing to main:');
    console.log('   git push origin main');
  } else {
    console.log('1. Configure missing secrets:');
    console.log('   npm run quick-setup');
    console.log('');
    console.log('2. Or add secrets manually:');
    console.log(`   ${EMOJI.link} https://github.com/${repo}/settings/secrets/actions`);
    console.log('');
    console.log('3. Test after configuration:');
    console.log('   npm run test-workflow');
  }
  console.log('');
}

function printQuickCommands() {
  console.log(`${EMOJI.gear} Quick Commands`);
  console.log('-'.repeat(30));
  console.log('npm run quick-setup    - Fast setup guide');
  console.log('npm run setup          - Interactive setup');
  console.log('npm run test-workflow  - Test deployment workflow');
  console.log('npm run status         - Show this dashboard');
  console.log('');
}

async function main() {
  const repo = getRepoInfo();
  const token = checkGitHubToken();

  printHeader(repo);

  const status = await getSetupStatus(repo, token);

  printSecretStatus(status.secrets, status.canCheck);
  printVariableStatus(status.variables, status.canCheck);
  printWorkflowStatus(status.lastWorkflowRun);
  printNextSteps(status.secrets, status.canCheck, repo);
  printQuickCommands();
}

main().catch(error => {
  console.error(`${EMOJI.cross} Status check failed:`, error.message);
  exit(1);
});