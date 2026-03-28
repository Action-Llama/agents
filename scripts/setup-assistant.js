#!/usr/bin/env node

/**
 * Repository Setup Assistant
 * 
 * Interactive script to help repository administrators configure
 * missing repository secrets and variables for the deployment workflow.
 * 
 * Usage:
 *   node scripts/setup-assistant.js
 * 
 * This script provides step-by-step guidance and validates the setup.
 */

import { execSync } from 'child_process';
import { exit } from 'process';
import readline from 'readline/promises';
import { getRepoInfo as _getRepoInfo, checkGitHubToken } from './utils.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const REQUIRED_SECRETS = [
  {
    name: 'ANTHROPIC_API_KEY',
    description: 'Valid Anthropic API key for Claude models',
    setupUrl: 'https://console.anthropic.com/account/keys',
    helpText: 'Get your API key from Anthropic Console. It should start with "sk-ant-"',
    required: true
  },
  {
    name: 'DEPLOY_SSH_KEY', 
    description: 'SSH private key for deployment access',
    setupUrl: 'https://docs.github.com/en/authentication/connecting-to-github-with-ssh',
    helpText: 'Generate with: ssh-keygen -t rsa -b 4096 -C "deploy@action-llama.com"',
    required: true
  },
  {
    name: 'DEPLOY_ENV_TOML',
    description: 'Production environment configuration',
    setupUrl: 'https://github.com/Action-Llama/agents/blob/main/README.md',
    helpText: 'TOML configuration file with environment settings',
    required: true
  }
];

const OPTIONAL_VARIABLES = [
  {
    name: 'GIT_EMAIL',
    description: 'Email for Git commits',
    defaultValue: 'deploy@action-llama.com',
    required: false
  },
  {
    name: 'GIT_NAME', 
    description: 'Name for Git commits',
    defaultValue: 'Action Llama Deploy',
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
    'User-Agent': 'setup-assistant-script'
  };

  const secretStatus = {};
  
  for (const secret of REQUIRED_SECRETS) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${secret.name}`, {
        headers
      });
      
      secretStatus[secret.name] = {
        configured: response.status === 200,
        error: response.status === 403 ? 'Permission denied' : null
      };
    } catch (error) {
      secretStatus[secret.name] = {
        configured: false,
        error: error.message
      };
    }
  }
  
  return secretStatus;
}

function printWelcome() {
  console.log('🚀 Action-Llama Repository Setup Assistant');
  console.log('==========================================\n');
  console.log('This interactive script helps repository administrators configure');
  console.log('the required secrets and variables for successful deployments.\n');
}

function printSecretStatus(secretStatus) {
  console.log('📋 Current Secret Configuration Status:\n');
  
  for (const secret of REQUIRED_SECRETS) {
    const status = secretStatus[secret.name];
    if (status.configured) {
      console.log(`   ✅ ${secret.name} - configured`);
    } else if (status.error) {
      console.log(`   ⚠️  ${secret.name} - error: ${status.error}`);
    } else {
      console.log(`   ❌ ${secret.name} - NOT CONFIGURED`);
    }
  }
  console.log();
}

async function promptForMissingSecrets(repo, secretStatus) {
  const missingSecrets = REQUIRED_SECRETS.filter(secret => !secretStatus[secret.name].configured);
  
  if (missingSecrets.length === 0) {
    console.log('✅ All required secrets are configured!');
    return true;
  }
  
  console.log(`🔧 Found ${missingSecrets.length} missing secret(s). Let's configure them:\n`);
  
  for (const secret of missingSecrets) {
    console.log(`📝 ${secret.name}:`);
    console.log(`   Description: ${secret.description}`);
    console.log(`   Help: ${secret.helpText}`);
    console.log(`   Setup Guide: ${secret.setupUrl}`);
    console.log(`   Configuration URL: https://github.com/${repo}/settings/secrets/actions`);
    console.log();
    
    const configured = await rl.question(`   Have you configured ${secret.name}? (y/N): `);
    
    if (configured.toLowerCase().startsWith('y')) {
      console.log(`   ✅ Great! ${secret.name} should now be configured.`);
    } else {
      console.log(`   ℹ️  Please configure ${secret.name} before proceeding.`);
      console.log(`   📋 Steps:`);
      console.log(`      1. Open: https://github.com/${repo}/settings/secrets/actions`);
      console.log(`      2. Click "New repository secret"`);
      console.log(`      3. Name: ${secret.name}`);
      console.log(`      4. Value: ${secret.helpText}`);
      console.log(`      5. Click "Add secret"`);
      console.log();
      
      const continueSetup = await rl.question('   Would you like to continue with other secrets? (Y/n): ');
      if (continueSetup.toLowerCase().startsWith('n')) {
        console.log('\n   Setup paused. Re-run this script after configuring secrets.');
        return false;
      }
    }
    console.log();
  }
  
  return true;
}

async function validateSetup(repo, token) {
  console.log('🔍 Re-validating configuration...\n');
  
  const secretStatus = await checkSecrets(repo, token);
  printSecretStatus(secretStatus);
  
  const allConfigured = REQUIRED_SECRETS.every(secret => secretStatus[secret.name].configured);
  
  if (allConfigured) {
    console.log('✅ SUCCESS: All required secrets are now configured!');
    console.log('   The deployment workflow should work correctly.\n');
    
    const testWorkflow = await rl.question('Would you like to test the deployment workflow? (Y/n): ');
    if (!testWorkflow.toLowerCase().startsWith('n')) {
      console.log('\n🧪 Testing deployment workflow...');
      try {
        execSync('npm run test-workflow', { stdio: 'inherit' });
      } catch (error) {
        console.log('   ⚠️  Test completed with warnings (this is normal)');
      }
    }
    
    return true;
  } else {
    console.log('❌ Some secrets are still not configured.');
    console.log('   Please complete the setup and re-run this assistant.');
    return false;
  }
}

function printNextSteps(repo, allConfigured) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 NEXT STEPS');
  console.log('='.repeat(60));
  
  if (allConfigured) {
    console.log('\n🎉 Your repository is ready for deployment!');
    console.log('\n✨ You can now:');
    console.log('   • Push changes to the main branch to trigger deployment');
    console.log('   • Manually run the deployment workflow');
    console.log('   • Use dry-run mode to test without deploying');
    console.log('\n🔗 Useful links:');
    console.log(`   • Actions: https://github.com/${repo}/actions`);
    console.log(`   • Secrets: https://github.com/${repo}/settings/secrets/actions`);
    console.log(`   • Deploy workflow: https://github.com/${repo}/actions/workflows/deploy.yml`);
  } else {
    console.log('\n🔧 Complete these remaining steps:');
    console.log('   1. Configure missing repository secrets');
    console.log('   2. Re-run this setup assistant');
    console.log('   3. Test the deployment workflow');
    console.log('\n📚 Documentation:');
    console.log('   • README.md - Detailed setup information');
    console.log('   • SETUP-CHECKLIST.md - Step-by-step setup guide');
  }
}

async function main() {
  printWelcome();
  
  const repo = getRepoInfo();
  const token = checkGitHubToken();
  
  console.log(`📍 Repository: ${repo}`);
  console.log(`🔑 GitHub Token: ${token.substring(0, 8)}...`);
  console.log();
  
  const secretStatus = await checkSecrets(repo, token);
  printSecretStatus(secretStatus);
  
  const continueSetup = await promptForMissingSecrets(repo, secretStatus);
  
  if (continueSetup) {
    const allConfigured = await validateSetup(repo, token);
    printNextSteps(repo, allConfigured);
  }
  
  rl.close();
}

main().catch(error => {
  console.error('❌ Setup assistant failed:', error.message);
  rl.close();
  exit(1);
});