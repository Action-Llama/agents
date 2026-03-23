#!/usr/bin/env node

/**
 * CI Failure Fix: Missing ANTHROPIC_API_KEY
 * 
 * This script specifically addresses the CI failure pattern where
 * ANTHROPIC_API_KEY is the only missing secret blocking deployment.
 * 
 * It provides automated detection, validation, and guided resolution
 * for this common deployment blocker.
 * 
 * Usage: npm run ci-anthropic-key-fix
 */

import { execSync } from 'child_process';
import { exit } from 'process';

const EMOJI = {
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  gear: '⚙️',
  rocket: '🚀',
  key: '🔑',
  link: '🔗',
  magnify: '🔍',
  wrench: '🔧',
  clock: '⏱️',
  target: '🎯'
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
    exit(1);
  }
}

async function checkSecretStatus(repo, token) {
  if (!token) return null;
  
  try {
    const secrets = ['ANTHROPIC_API_KEY', 'DEPLOY_SSH_KEY', 'DEPLOY_ENV_TOML'];
    const status = {};
    
    for (const secret of secrets) {
      const response = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${secret}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      status[secret] = response.status === 200;
    }
    
    return status;
  } catch (error) {
    return null;
  }
}

async function getLatestWorkflowRun(repo, token) {
  if (!token) return null;
  
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/deploy.yml/runs?per_page=1`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.workflow_runs[0] || null;
    }
  } catch (error) {
    // Ignore errors
  }
  
  return null;
}

function printHeader() {
  console.log(`${EMOJI.target} CI Fix: Missing ANTHROPIC_API_KEY`);
  console.log('═'.repeat(50));
  console.log('');
  console.log(`${EMOJI.info} This tool specifically fixes the common CI failure:`);
  console.log('   "ANTHROPIC_API_KEY repository secret is not set or is empty"');
  console.log('');
}

function printDiagnostics(repo, secretStatus, latestRun) {
  console.log(`${EMOJI.magnify} DIAGNOSTICS`);
  console.log('─'.repeat(20));
  console.log(`Repository: ${repo}`);
  
  if (latestRun) {
    console.log(`Latest workflow: ${latestRun.conclusion} (${latestRun.html_url})`);
    console.log(`Run date: ${new Date(latestRun.created_at).toLocaleString()}`);
  }
  
  if (secretStatus) {
    console.log('\nSecret Status:');
    Object.entries(secretStatus).forEach(([name, configured]) => {
      const icon = configured ? EMOJI.check : EMOJI.cross;
      const status = configured ? 'Configured' : 'Missing';
      console.log(`  ${icon} ${name}: ${status}`);
    });
  } else {
    console.log('Secret Status: Cannot verify (no GitHub token)');
  }
  console.log('');
}

function analyzeIssue(secretStatus) {
  if (!secretStatus) {
    return {
      type: 'UNKNOWN',
      message: 'Cannot determine secret status without GitHub token',
      priority: 'MEDIUM'
    };
  }
  
  const anthropicMissing = !secretStatus.ANTHROPIC_API_KEY;
  const sshMissing = !secretStatus.DEPLOY_SSH_KEY;
  const envMissing = !secretStatus.DEPLOY_ENV_TOML;
  
  if (!anthropicMissing) {
    return {
      type: 'ALREADY_FIXED',
      message: 'ANTHROPIC_API_KEY is already configured!',
      priority: 'INFO'
    };
  }
  
  if (anthropicMissing && !sshMissing && !envMissing) {
    return {
      type: 'ANTHROPIC_ONLY',
      message: 'Only ANTHROPIC_API_KEY is missing - quick 2-minute fix!',
      priority: 'HIGH',
      quickFix: true
    };
  }
  
  if (anthropicMissing && (sshMissing || envMissing)) {
    return {
      type: 'MULTIPLE_MISSING',
      message: 'ANTHROPIC_API_KEY and other secrets are missing',
      priority: 'MEDIUM',
      recommendation: 'Use comprehensive setup: npm run setup'
    };
  }
  
  return {
    type: 'OTHER',
    message: 'Unknown configuration state',
    priority: 'LOW'
  };
}

function printAnalysis(analysis) {
  console.log(`${EMOJI.gear} ANALYSIS`);
  console.log('─'.repeat(15));
  
  const priorityIcon = {
    'HIGH': EMOJI.rocket,
    'MEDIUM': EMOJI.warning,
    'LOW': EMOJI.info,
    'INFO': EMOJI.check
  }[analysis.priority] || EMOJI.info;
  
  console.log(`${priorityIcon} ${analysis.message}`);
  console.log(`Priority: ${analysis.priority}`);
  
  if (analysis.recommendation) {
    console.log(`Recommendation: ${analysis.recommendation}`);
  }
  
  console.log('');
}

function printQuickFix(repo) {
  console.log(`${EMOJI.rocket} QUICK FIX (2-3 minutes)`);
  console.log('═'.repeat(35));
  console.log('');
  
  console.log(`${EMOJI.key} Step 1: Get Your API Key`);
  console.log(`   ${EMOJI.link} Go to: https://console.anthropic.com/account/keys`);
  console.log('   • Sign in to your Anthropic account');
  console.log('   • Click "Create Key" button');
  console.log('   • Copy the key (starts with "sk-ant-")');
  console.log('');
  
  console.log(`${EMOJI.gear} Step 2: Add Repository Secret`);
  console.log(`   ${EMOJI.link} Go to: https://github.com/${repo}/settings/secrets/actions`);
  console.log('   • Click "New repository secret"');
  console.log('   • Name: ANTHROPIC_API_KEY');
  console.log('   • Value: [paste your API key]');
  console.log('   • Click "Add secret"');
  console.log('');
  
  console.log(`${EMOJI.check} Step 3: Verify & Deploy`);
  console.log('   • Re-run failed workflow OR push new commit');
  console.log('   • Deployment will start automatically');
  console.log('   • Verify: GITHUB_TOKEN=your_token npm run status');
  console.log('');
}

function printStandardFix(repo, analysis) {
  console.log(`${EMOJI.wrench} RESOLUTION STEPS`);
  console.log('═'.repeat(25));
  console.log('');
  
  if (analysis.type === 'MULTIPLE_MISSING') {
    console.log(`${EMOJI.warning} Multiple secrets missing - use comprehensive setup:`);
    console.log('   npm run setup           # Interactive setup guide');
    console.log('   npm run quick-setup     # Streamlined setup');
    console.log('');
    console.log('This will help you configure all missing secrets efficiently.');
  } else if (analysis.type === 'ALREADY_FIXED') {
    console.log(`${EMOJI.check} ANTHROPIC_API_KEY is already configured!`);
    console.log('');
    console.log('If you\'re still seeing CI failures:');
    console.log('   1. Check the latest workflow run for other issues');
    console.log(`   2. View logs: https://github.com/${repo}/actions`);
    console.log('   3. Run: npm run resolve-ci-failure');
  } else {
    console.log(`${EMOJI.info} For detailed guidance:`);
    console.log('   npm run fix-anthropic-key    # Focused ANTHROPIC_API_KEY guide');
    console.log('   npm run resolve-ci-failure   # Analyze any CI failure');
  }
  console.log('');
}

function printValidation(repo, token) {
  console.log(`${EMOJI.magnify} VALIDATION`);
  console.log('─'.repeat(15));
  
  if (!token) {
    console.log(`${EMOJI.warning} Set GITHUB_TOKEN to enable validation:`);
    console.log('   export GITHUB_TOKEN=your_token');
    console.log('   npm run ci-anthropic-key-fix');
    console.log('');
    console.log('Or validate manually:');
    console.log('   npm run status');
    console.log('');
    return;
  }
  
  console.log(`${EMOJI.check} GitHub token available - secret status shown above`);
  console.log('');
  console.log('After configuring the secret, validate with:');
  console.log('   npm run ci-anthropic-key-fix    # Re-run this check');
  console.log('   npm run status                  # Full status dashboard');
  console.log('');
}

function printNextSteps(repo, analysis, latestRun) {
  console.log(`${EMOJI.target} NEXT STEPS`);
  console.log('═'.repeat(20));
  console.log('');
  
  if (analysis.type === 'ALREADY_FIXED') {
    console.log(`${EMOJI.check} Configuration looks good! If issues persist:`);
    console.log(`   • Check latest workflow: https://github.com/${repo}/actions`);
    console.log('   • Run diagnostic: npm run resolve-ci-failure');
    console.log('   • Test workflow: npm run test-workflow');
  } else {
    console.log('1. Configure ANTHROPIC_API_KEY following steps above');
    console.log('2. Trigger new deployment:');
    
    if (latestRun && latestRun.conclusion === 'failure') {
      console.log(`   • Re-run failed workflow: ${latestRun.html_url}`);
      console.log('   • OR push new commit: git push origin main');
    } else {
      console.log('   • Push a commit: git push origin main');
      console.log(`   • Or trigger manually: https://github.com/${repo}/actions/workflows/deploy.yml`);
    }
    
    console.log('3. Verify deployment succeeds');
  }
  
  console.log('');
  console.log(`${EMOJI.clock} Estimated time: 2-3 minutes`);
  console.log(`${EMOJI.link} Need help? Run: npm run setup`);
}

async function main() {
  printHeader();
  
  const repo = getRepoInfo();
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  
  // Gather diagnostics
  const [secretStatus, latestRun] = await Promise.all([
    checkSecretStatus(repo, token),
    getLatestWorkflowRun(repo, token)
  ]);
  
  printDiagnostics(repo, secretStatus, latestRun);
  
  // Analyze the issue
  const analysis = analyzeIssue(secretStatus);
  printAnalysis(analysis);
  
  // Provide appropriate solution
  if (analysis.quickFix) {
    printQuickFix(repo);
  } else {
    printStandardFix(repo, analysis);
  }
  
  printValidation(repo, token);
  printNextSteps(repo, analysis, latestRun);
}

main().catch(error => {
  console.error(`${EMOJI.cross} Error:`, error.message);
  exit(1);
});