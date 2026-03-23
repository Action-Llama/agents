#!/usr/bin/env node

/**
 * Targeted ANTHROPIC_API_KEY CI Failure Fix
 * 
 * This tool is specifically designed for the most common CI deployment failure:
 * when ANTHROPIC_API_KEY is the only missing secret blocking deployment,
 * while DEPLOY_SSH_KEY and DEPLOY_ENV_TOML are already configured.
 * 
 * This provides a streamlined 2-3 minute resolution path for this specific
 * failure pattern, avoiding the need to run general setup tools.
 * 
 * Usage: npm run ci-anthropic-key-fix
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
  link: '🔗',
  timer: '⏱️',
  target: '🎯',
  lightning: '⚡'
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
    console.error('   Run this script from within the repository directory.');
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

async function detectSpecificPattern(repo, token) {
  if (!token) return null;

  const secrets = {
    ANTHROPIC_API_KEY: await validateSecret(repo, token, 'ANTHROPIC_API_KEY'),
    DEPLOY_SSH_KEY: await validateSecret(repo, token, 'DEPLOY_SSH_KEY'),
    DEPLOY_ENV_TOML: await validateSecret(repo, token, 'DEPLOY_ENV_TOML')
  };

  // Check if this matches the specific pattern: only ANTHROPIC_API_KEY missing
  const anthropicMissing = secrets.ANTHROPIC_API_KEY === false;
  const deployConfigured = secrets.DEPLOY_SSH_KEY === true && secrets.DEPLOY_ENV_TOML === true;
  
  return {
    isSpecificPattern: anthropicMissing && deployConfigured,
    secrets: secrets
  };
}

function printHeader() {
  console.log(`${EMOJI.target} CI ANTHROPIC_API_KEY Fix Tool`);
  console.log('='.repeat(45));
  console.log(`${EMOJI.lightning} Fast resolution for the most common CI deployment failure`);
  console.log(`${EMOJI.timer} Estimated resolution time: 2-3 minutes`);
  console.log('');
}

function printDiagnostics(repo, pattern) {
  console.log(`${EMOJI.gear} Diagnostics`);
  console.log('━'.repeat(20));
  console.log(`Repository: ${repo}`);
  console.log('');
  
  if (!pattern) {
    console.log(`${EMOJI.warning} Could not verify current secret configuration (GITHUB_TOKEN required)`);
    console.log(`${EMOJI.info} Proceeding with guided fix assuming ANTHROPIC_API_KEY is missing...`);
    console.log('');
    return;
  }

  console.log('🔍 Secret Configuration Status:');
  Object.entries(pattern.secrets).forEach(([name, status]) => {
    const statusText = status === true ? `${EMOJI.check} Configured` :
                      status === false ? `${EMOJI.cross} Missing` :
                      `${EMOJI.warning} Cannot verify`;
    console.log(`   ${name}: ${statusText}`);
  });
  console.log('');

  if (pattern.isSpecificPattern) {
    console.log(`${EMOJI.check} Perfect match! This tool is designed for your exact situation:`);
    console.log(`   • DEPLOY_SSH_KEY and DEPLOY_ENV_TOML are already configured`);
    console.log(`   • Only ANTHROPIC_API_KEY needs to be added`);
    console.log(`   • This is the fastest fix possible!`);
  } else if (pattern.secrets.ANTHROPIC_API_KEY === true) {
    console.log(`${EMOJI.check} ANTHROPIC_API_KEY is already configured!`);
    console.log(`${EMOJI.info} Your CI failure might be resolved. Try re-running your workflow.`);
  } else {
    const missingCount = Object.values(pattern.secrets).filter(s => s === false).length;
    if (missingCount > 1) {
      console.log(`${EMOJI.warning} Multiple secrets are missing (${missingCount} total).`);
      console.log(`${EMOJI.info} For comprehensive setup, consider: npm run quick-setup`);
      console.log(`${EMOJI.info} Or continue here for ANTHROPIC_API_KEY-focused fix.`);
    } else {
      console.log(`${EMOJI.target} Focusing on ANTHROPIC_API_KEY configuration...`);
    }
  }
  console.log('');
}

function printSolution(repo) {
  console.log(`${EMOJI.rocket} SOLUTION: Add ANTHROPIC_API_KEY`);
  console.log('═'.repeat(40));
  console.log('');

  console.log(`${EMOJI.timer} Quick Steps (2-3 minutes):`);
  console.log('');

  console.log('1️⃣ GET YOUR API KEY:');
  console.log(`   ${EMOJI.link} Go to: https://console.anthropic.com/account/keys`);
  console.log('   • Sign in to your Anthropic account');
  console.log('   • Click "Create Key" button');
  console.log('   • Copy the generated key (starts with "sk-ant-")');
  console.log('');

  console.log('2️⃣ ADD TO REPOSITORY SECRETS:');
  console.log(`   ${EMOJI.link} Go to: https://github.com/${repo}/settings/secrets/actions`);
  console.log('   • Click "New repository secret"');
  console.log('   • Name: ANTHROPIC_API_KEY');
  console.log('   • Value: [paste your API key]');
  console.log('   • Click "Add secret"');
  console.log('');

  console.log('3️⃣ VERIFY AND DEPLOY:');
  console.log(`   ${EMOJI.link} Re-run your workflow: https://github.com/${repo}/actions`);
  console.log('   • Find your failed workflow run');
  console.log('   • Click "Re-run all jobs"');
  console.log('   • Deployment should start automatically!');
  console.log('');
}

function printImportantNotes() {
  console.log(`${EMOJI.warning} Important Notes`);
  console.log('━'.repeat(25));
  console.log(`   ${EMOJI.gear} Repository admin permissions required to add secrets`);
  console.log(`   ${EMOJI.key} Never commit API keys to code - only use repository secrets`);
  console.log(`   ${EMOJI.lightning} This fix targets the most common CI failure pattern`);
  console.log(`   ${EMOJI.rocket} Deployment starts automatically once secret is added`);
  console.log('');
}

function printValidationSteps() {
  console.log(`${EMOJI.target} Validation (Optional)`);
  console.log('━'.repeat(25));
  console.log('After adding the secret, you can verify it worked:');
  console.log('');
  console.log('```bash');
  console.log('# Set your GitHub token');
  console.log('export GITHUB_TOKEN=your_github_token_here');
  console.log('');
  console.log('# Verify the secret was added');
  console.log('npm run validate-secrets');
  console.log('```');
  console.log('');
}

function printAlternatives() {
  console.log(`${EMOJI.info} Other Options`);
  console.log('━'.repeat(20));
  console.log('If you need more comprehensive setup:');
  console.log('   npm run quick-setup        # Interactive full setup');
  console.log('   npm run setup              # Detailed setup assistant');
  console.log('   npm run resolve-ci-failure # General CI issue resolver');
  console.log('   npm run status             # Check overall setup status');
  console.log('');
}

function printFooter() {
  console.log('━'.repeat(50));
  console.log(`${EMOJI.lightning} This tool is optimized for speed when only ANTHROPIC_API_KEY is missing`);
  console.log(`${EMOJI.timer} Resolution time: ~2-3 minutes with repository admin access`);
  console.log(`${EMOJI.target} Designed specifically for the most common CI deployment failure`);
  console.log('');
  console.log(`${EMOJI.rocket} Once the secret is added, your next push or workflow re-run will deploy successfully!`);
}

async function main() {
  printHeader();

  const repo = getRepoInfo();
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  // Quick diagnostics
  const pattern = await detectSpecificPattern(repo, token);
  printDiagnostics(repo, pattern);

  // If ANTHROPIC_API_KEY is already configured, we're done
  if (pattern?.secrets?.ANTHROPIC_API_KEY === true) {
    console.log(`${EMOJI.check} ANTHROPIC_API_KEY is already configured!`);
    console.log('');
    console.log(`${EMOJI.rocket} Next steps:`);
    console.log('   1. Re-run your failed workflow');
    console.log(`   2. Or push a new commit to trigger deployment`);
    console.log(`   3. Check workflow status: https://github.com/${repo}/actions`);
    console.log('');
    return;
  }

  // Provide the targeted solution
  printSolution(repo);
  printImportantNotes();
  printValidationSteps();
  printAlternatives();
  printFooter();
}

main().catch(error => {
  console.error(`${EMOJI.cross} Error:`, error.message);
  process.exit(1);
});