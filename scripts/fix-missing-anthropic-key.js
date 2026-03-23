#!/usr/bin/env node

/**
 * Quick Fix for Missing ANTHROPIC_API_KEY
 * 
 * This script specifically addresses the most common CI failure:
 * when ANTHROPIC_API_KEY is the only missing secret blocking deployment.
 * 
 * Usage: npm run fix-anthropic-key
 */

import { execSync } from 'child_process';

const EMOJI = {
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  gear: '⚙️',
  rocket: '🚀',
  key: '🔑',
  link: '🔗'
};

function getRepoInfo() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
    if (!match) {
      throw new Error('Could not parse repository from git remote');
    }
    return `${match[1]}/${match[2]}`;
  } catch (error) {
    console.error(`${EMOJI.cross} Error: Could not determine repository.`);
    process.exit(1);
  }
}

async function validateSecret(repo, token, secretName) {
  if (!token) return null;
  
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${secretName}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return response.status === 200;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log(`${EMOJI.key} Missing ANTHROPIC_API_KEY - Quick Fix Guide`);
  console.log('='.repeat(55));
  console.log('');

  const repo = getRepoInfo();
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  console.log(`${EMOJI.info} Repository: ${repo}`);
  console.log('');

  // Check current status
  if (token) {
    console.log(`${EMOJI.gear} Checking current secret status...`);
    
    const secrets = ['ANTHROPIC_API_KEY', 'DEPLOY_SSH_KEY', 'DEPLOY_ENV_TOML'];
    const status = {};
    
    for (const secret of secrets) {
      status[secret] = await validateSecret(repo, token, secret);
    }
    
    console.log('');
    console.log('📊 Current Configuration:');
    secrets.forEach(secret => {
      const state = status[secret] === true ? `${EMOJI.check} Configured` :
                   status[secret] === false ? `${EMOJI.cross} Missing` :
                   `${EMOJI.warning} Cannot verify`;
      console.log(`   ${secret}: ${state}`);
    });
    console.log('');
    
    // If ANTHROPIC_API_KEY is already configured, we're done
    if (status.ANTHROPIC_API_KEY === true) {
      console.log(`${EMOJI.check} ANTHROPIC_API_KEY is already configured!`);
      console.log('');
      console.log(`${EMOJI.rocket} Next steps:`);
      console.log('   1. Re-run the failed workflow');
      console.log('   2. Or push a new commit to trigger deployment');
      console.log('');
      return;
    }
    
    // If other secrets are missing too, suggest comprehensive setup
    const missingSecrets = secrets.filter(s => status[s] === false);
    if (missingSecrets.length > 1) {
      console.log(`${EMOJI.warning} Multiple secrets are missing. For comprehensive setup, run:`);
      console.log('   npm run quick-setup');
      console.log('');
    }
  }

  // Focused guidance for ANTHROPIC_API_KEY
  console.log(`${EMOJI.key} STEP-BY-STEP: Add ANTHROPIC_API_KEY`);
  console.log('═'.repeat(45));
  console.log('');
  
  console.log('1️⃣ GET YOUR API KEY:');
  console.log(`   ${EMOJI.link} Go to: https://console.anthropic.com/account/keys`);
  console.log('   • Sign in to your Anthropic account');
  console.log('   • Click "Create Key" button');
  console.log('   • Copy the generated key (starts with "sk-ant-")');
  console.log('');
  
  console.log('2️⃣ ADD TO REPOSITORY SECRETS:');
  console.log(`   ${EMOJI.link} Go to: https://github.com/${repo}/settings/secrets/actions`);
  console.log('   • Click "New repository secret" button');
  console.log('   • Name: ANTHROPIC_API_KEY');
  console.log('   • Value: [paste your API key]');
  console.log('   • Click "Add secret"');
  console.log('');
  
  console.log('3️⃣ VERIFY AND DEPLOY:');
  console.log('   • Verify: GITHUB_TOKEN=your_token npm run validate-secrets');
  console.log(`   • Re-run workflow: https://github.com/${repo}/actions`);
  console.log('   • Or push a commit to trigger new deployment');
  console.log('');

  console.log(`${EMOJI.warning} IMPORTANT NOTES:`);
  console.log('━'.repeat(30));
  console.log(`   ${EMOJI.gear} You need repository admin permissions to add secrets`);
  console.log(`   ${EMOJI.key} Never commit API keys to code - only use repository secrets`);
  console.log(`   ${EMOJI.rocket} The deployment will start automatically once the secret is added`);
  console.log('');

  console.log(`${EMOJI.info} ALTERNATIVE OPTIONS:`);
  console.log('━'.repeat(35));
  console.log('   • Full setup guide: npm run setup');
  console.log('   • Test locally first: npm run test-workflow');
  console.log('   • Check status anytime: npm run status');
  console.log('');

  console.log(`${EMOJI.rocket} ESTIMATED TIME: 2-3 minutes`);
  console.log('');
}

main().catch(error => {
  console.error(`${EMOJI.cross} Error:`, error.message);
  process.exit(1);
});