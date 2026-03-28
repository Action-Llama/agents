#!/usr/bin/env node

/**
 * Repository Secret Validation Script
 * 
 * This script helps repository administrators validate that all required
 * secrets are properly configured for the deployment workflow.
 * 
 * Usage:
 *   node scripts/validate-secrets.js
 * 
 * This script uses the GitHub API to check if secrets are configured.
 * You need a GitHub token with 'repo' scope to run this validation.
 */

import { execSync } from 'child_process';
import { exit } from 'process';
import { getRepoInfo as _getRepoInfo, checkGitHubToken } from './utils.js';

const REQUIRED_SECRETS = [
  {
    name: 'DEPLOY_SSH_KEY', 
    description: 'SSH private key for deployment access',
    required: true
  },
  {
    name: 'DEPLOY_ENV_TOML',
    description: 'Production environment configuration',
    required: true
  }
];

const OPTIONAL_SECRETS = [
  {
    name: 'ANTHROPIC_API_KEY',
    description: 'Valid Anthropic API key for Claude models (optional for headless deployments)',
    required: false
  }
];

const OPTIONAL_VARIABLES = [
  {
    name: 'GIT_EMAIL',
    description: 'Email for Git commits (defaults to deploy@action-llama.com)',
    required: false
  },
  {
    name: 'GIT_NAME', 
    description: 'Name for Git commits (defaults to Action Llama Deploy)',
    required: false
  }
];

function getRepoInfo() {
  try {
    return _getRepoInfo();
  } catch (error) {
    console.error('❌ Error: Could not determine repository. Run this script from within the repository.');
    console.error(`   Details: ${error.message}`);
    exit(1);
  }
}

async function checkSecrets(repo, token) {
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'secret-validation-script'
  };

  console.log(`🔍 Checking repository secrets for ${repo}...\n`);

  let allRequiredConfigured = true;
  
  // Check required secrets
  console.log('📋 Required Secrets:');
  for (const secret of REQUIRED_SECRETS) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${secret.name}`, {
        headers
      });
      
      if (response.status === 200) {
        console.log(`   ✅ ${secret.name} - configured`);
      } else if (response.status === 404) {
        console.log(`   ❌ ${secret.name} - NOT CONFIGURED`);
        console.log(`      ${secret.description}`);
        allRequiredConfigured = false;
      } else {
        console.log(`   ⚠️  ${secret.name} - could not verify (status: ${response.status})`);
        if (response.status === 403) {
          console.log(`      Your GitHub token may not have the required permissions.`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  ${secret.name} - error checking: ${error.message}`);
    }
  }

  // Check optional secrets
  console.log('\n📋 Optional Secrets:');
  for (const secret of OPTIONAL_SECRETS) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${secret.name}`, {
        headers
      });
      
      if (response.status === 200) {
        console.log(`   ✅ ${secret.name} - configured`);
      } else if (response.status === 404) {
        console.log(`   ⚪ ${secret.name} - not configured (optional)`);
        console.log(`      ${secret.description}`);
      } else {
        console.log(`   ⚠️  ${secret.name} - could not verify (status: ${response.status})`);
        if (response.status === 403) {
          console.log(`      Your GitHub token may not have the required permissions.`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  ${secret.name} - error checking: ${error.message}`);
    }
  }

  // Check optional variables
  console.log('\n🔧 Optional Repository Variables:');
  for (const variable of OPTIONAL_VARIABLES) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/actions/variables/${variable.name}`, {
        headers
      });
      
      if (response.status === 200) {
        console.log(`   ✅ ${variable.name} - configured`);
      } else if (response.status === 404) {
        console.log(`   ⚪ ${variable.name} - using default`);
        console.log(`      ${variable.description}`);
      } else {
        console.log(`   ⚠️  ${variable.name} - could not verify (status: ${response.status})`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${variable.name} - error checking: ${error.message}`);
    }
  }

  return allRequiredConfigured;
}

function printSetupInstructions(repo) {
  console.log('\n🔧 SETUP INSTRUCTIONS:');
  console.log('\nTo configure missing secrets:');
  console.log(`   1. Go to: https://github.com/${repo}/settings/secrets/actions`);
  console.log('   2. Click "New repository secret"');
  console.log('   3. Add each missing secret listed above');
  console.log('   4. Re-run this validation script to verify');
  console.log('   5. Re-run the deployment workflow');

  console.log('\nTo configure optional variables:');
  console.log(`   1. Go to: https://github.com/${repo}/settings/variables/actions`);
  console.log('   2. Click "New repository variable"');
  console.log('   3. Add any desired optional variables');

  console.log('\n📖 For more details, see the repository README.md');
}

async function main() {
  console.log('🚀 Repository Secret Validation\n');
  
  const repo = getRepoInfo();
  const token = checkGitHubToken();
  
  console.log(`📍 Repository: ${repo}`);
  console.log(`🔑 Token: ${token.substring(0, 8)}...\n`);

  const allConfigured = await checkSecrets(repo, token);

  console.log('\n' + '='.repeat(60));
  
  if (allConfigured) {
    console.log('✅ SUCCESS: All required secrets are configured!');
    console.log('   The deployment workflow should work correctly.');
  } else {
    console.log('❌ CONFIGURATION INCOMPLETE: Some required secrets are missing.');
    printSetupInstructions(repo);
    exit(1);
  }
}

main().catch(error => {
  console.error('❌ Validation failed:', error.message);
  exit(1);
});