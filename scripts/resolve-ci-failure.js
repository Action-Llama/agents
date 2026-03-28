#!/usr/bin/env node

/**
 * CI Failure Resolution Assistant
 * 
 * Helps repository administrators quickly resolve common CI failures
 * by providing targeted guidance and validation.
 * 
 * Usage:
 *   node scripts/resolve-ci-failure.js [workflow-url]
 * 
 * The script can:
 * - Analyze CI failure patterns and provide specific solutions
 * - Validate that fixes will work before re-running workflows
 * - Guide users through the fastest resolution path
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
  rocket: '🚀',
  link: '🔗',
  wrench: '🔧',
  key: '🔑',
  magnify: '🔍'
};

const CI_FAILURE_PATTERNS = {
  MISSING_ANTHROPIC_KEY: {
    pattern: /ANTHROPIC_API_KEY.*not set|not configured/i,
    title: 'Missing ANTHROPIC_API_KEY Secret',
    description: 'The deployment workflow requires an Anthropic API key to access Claude AI models.',
    solution: 'ANTHROPIC_API_KEY',
    priority: 'CRITICAL'
  },
  ONLY_ANTHROPIC_KEY_MISSING: {
    pattern: /ANTHROPIC_API_KEY.*not set.*DEPLOY_SSH_KEY.*is set.*DEPLOY_ENV_TOML.*is set/i,
    title: 'Only ANTHROPIC_API_KEY Missing (Quick Fix Available)',
    description: 'Most configuration is complete - only the ANTHROPIC_API_KEY needs to be added.',
    solution: 'ANTHROPIC_API_KEY_ONLY',
    priority: 'HIGH'
  },
  MISSING_DEPLOY_SSH: {
    pattern: /DEPLOY_SSH_KEY.*not set|SSH.*authentication.*failed/i,
    title: 'Missing or Invalid DEPLOY_SSH_KEY',
    description: 'The deployment workflow requires a valid SSH key for deployment access.',
    solution: 'DEPLOY_SSH_KEY', 
    priority: 'CRITICAL'
  },
  MISSING_DEPLOY_ENV: {
    pattern: /DEPLOY_ENV_TOML.*not set|environment.*configuration.*invalid/i,
    title: 'Missing DEPLOY_ENV_TOML Configuration',
    description: 'The deployment workflow requires production environment configuration.',
    solution: 'DEPLOY_ENV_TOML',
    priority: 'CRITICAL'
  },
  GENERAL_SECRET_MISSING: {
    pattern: /repository secret.*not set|secrets.*not configured/i,
    title: 'Repository Secrets Not Configured',
    description: 'One or more required repository secrets are missing or misconfigured.',
    solution: 'ALL_SECRETS',
    priority: 'HIGH'
  }
};

const SECRET_SOLUTIONS = {
  'ANTHROPIC_API_KEY': {
    name: 'ANTHROPIC_API_KEY',
    description: 'Anthropic API key for Claude AI access',
    steps: [
      '1. Get API key from: https://console.anthropic.com/account/keys',
      '2. Click "Create Key" and copy the generated key (starts with sk-ant-)',
      '3. Go to repository secrets: {repo_url}/settings/secrets/actions',
      '4. Click "New repository secret"',
      '5. Name: ANTHROPIC_API_KEY',
      '6. Value: [paste your API key]',
      '7. Click "Add secret"'
    ],
    validation: 'ANTHROPIC_API_KEY'
  },
  'ANTHROPIC_API_KEY_ONLY': {
    name: 'ANTHROPIC_API_KEY (Quick Fix)',
    description: 'Only the Anthropic API key is missing - this is a quick 2-minute fix!',
    steps: [
      '🚀 FASTEST OPTION: Use the dedicated fix tool',
      '   npm run fix-anthropic-key',
      '',
      '📝 OR MANUAL STEPS:',
      '1. Get API key: https://console.anthropic.com/account/keys',
      '2. Go to: {repo_url}/settings/secrets/actions', 
      '3. Add secret: ANTHROPIC_API_KEY with your key value',
      '4. Re-run the workflow - deployment will start automatically!'
    ],
    validation: 'ANTHROPIC_API_KEY'
  },
  'DEPLOY_SSH_KEY': {
    name: 'DEPLOY_SSH_KEY', 
    description: 'SSH private key for deployment access',
    steps: [
      '1. Generate SSH key: ssh-keygen -t rsa -b 4096 -C "deploy@action-llama.com"',
      '2. Copy the PRIVATE key content (id_rsa file, not id_rsa.pub)',
      '3. Go to repository secrets: {repo_url}/settings/secrets/actions',
      '4. Click "New repository secret"',
      '5. Name: DEPLOY_SSH_KEY',
      '6. Value: [paste private key content including -----BEGIN OPENSSH PRIVATE KEY-----]',
      '7. Click "Add secret"'
    ],
    validation: 'DEPLOY_SSH_KEY'
  },
  'DEPLOY_ENV_TOML': {
    name: 'DEPLOY_ENV_TOML',
    description: 'Production environment configuration',
    steps: [
      '1. Create production environment configuration (TOML format)',
      '2. Ensure all required environment settings are included',
      '3. Go to repository secrets: {repo_url}/settings/secrets/actions', 
      '4. Click "New repository secret"',
      '5. Name: DEPLOY_ENV_TOML',
      '6. Value: [paste TOML configuration content]',
      '7. Click "Add secret"'
    ],
    validation: 'DEPLOY_ENV_TOML'
  }
};

function getRepoInfo() {
  try {
    return _getRepoInfo();
  } catch (error) {
    console.error(`${EMOJI.cross} Error: Could not determine repository.`);
    console.error(`   Run this script from within the repository directory.`);
    exit(1);
  }
}

function checkGitHubToken() {
  return _checkGitHubToken({ exitOnMissing: false });
}

async function analyzeFailure(workflowUrl, repo, token) {
  console.log(`${EMOJI.magnify} Analyzing CI failure...\n`);

  let failureText = '';
  let detectedPattern = null;

  // If workflow URL provided, try to fetch logs
  if (workflowUrl && token) {
    try {
      // Extract run ID from URL
      const runIdMatch = workflowUrl.match(/\/runs\/(\d+)/);
      if (runIdMatch) {
        const runId = runIdMatch[1];
        const response = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${runId}/logs`, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (response.ok) {
          failureText = await response.text();
          console.log(`${EMOJI.check} Downloaded workflow logs for analysis`);
        }
      }
    } catch (error) {
      console.log(`${EMOJI.warning} Could not fetch workflow logs: ${error.message}`);
    }
  }

  // If no logs available, check recent workflow runs
  if (!failureText && token) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/deploy.yml/runs?status=failure&per_page=3`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.workflow_runs.length > 0) {
          const latestFailure = data.workflow_runs[0];
          console.log(`${EMOJI.info} Found recent failure: ${latestFailure.html_url}`);
          
          // Try to get logs from the latest failure
          try {
            const logsResponse = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${latestFailure.id}/logs`, {
              headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            });
            if (logsResponse.ok) {
              failureText = await logsResponse.text();
            }
          } catch (error) {
            // Ignore log fetch errors
          }
        }
      }
    } catch (error) {
      console.log(`${EMOJI.warning} Could not check recent workflow runs`);
    }
  }

  // Analyze the failure text for known patterns
  for (const [key, pattern] of Object.entries(CI_FAILURE_PATTERNS)) {
    if (pattern.pattern.test(failureText)) {
      detectedPattern = pattern;
      break;
    }
  }

  return { detectedPattern, failureText };
}

async function validateSecretExists(repo, token, secretName) {
  if (!token) {
    return null; // Cannot validate without token
  }

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

async function validateAllSecrets(repo, token) {
  const requiredSecrets = ['ANTHROPIC_API_KEY', 'DEPLOY_SSH_KEY', 'DEPLOY_ENV_TOML'];
  const results = {};

  for (const secret of requiredSecrets) {
    results[secret] = await validateSecretExists(repo, token, secret);
  }

  return results;
}

function printFailureAnalysis(detectedPattern) {
  if (!detectedPattern) {
    console.log(`${EMOJI.warning} Could not automatically detect the specific CI failure type.`);
    console.log(`${EMOJI.info} Running general diagnosis...\n`);
    return;
  }

  console.log(`${EMOJI.cross} Detected Issue: ${detectedPattern.title}`);
  console.log(`Priority: ${detectedPattern.priority}`);
  console.log(`\nDescription: ${detectedPattern.description}`);
  console.log('');
}

function printSolution(solutionKey, repo) {
  if (solutionKey === 'ALL_SECRETS') {
    console.log(`${EMOJI.wrench} SOLUTION: Configure All Missing Secrets`);
    console.log('='.repeat(50));
    console.log('\n📋 Required secrets for deployment:');
    
    Object.values(SECRET_SOLUTIONS).forEach(solution => {
      console.log(`\n${EMOJI.key} ${solution.name}:`);
      console.log(`   ${solution.description}`);
    });
    
    console.log(`\n🚀 Quick setup options:`);
    console.log('   npm run quick-setup     # Interactive guided setup');
    console.log('   npm run setup           # Detailed setup assistant');
    console.log('');
    console.log(`📍 Manual setup: https://github.com/${repo}/settings/secrets/actions`);
    return;
  }

  const solution = SECRET_SOLUTIONS[solutionKey];
  if (!solution) {
    console.log(`${EMOJI.warning} No specific solution available for: ${solutionKey}`);
    return;
  }

  console.log(`${EMOJI.wrench} SOLUTION: Configure ${solution.name}`);
  console.log('='.repeat(50));
  console.log(`\n📝 ${solution.description}\n`);
  
  console.log('🔧 Steps to resolve:');
  solution.steps.forEach(step => {
    console.log(`   ${step.replace('{repo_url}', `https://github.com/${repo}`)}`);
  });
  console.log('');
}

async function printValidation(repo, token, solutionKey) {
  if (!token) {
    console.log(`${EMOJI.info} To validate your fix, set GITHUB_TOKEN and re-run this script.`);
    return;
  }

  console.log(`${EMOJI.magnify} Validating current configuration...\n`);

  if (solutionKey === 'ALL_SECRETS') {
    const secretStatus = await validateAllSecrets(repo, token);
    let allConfigured = true;
    
    Object.entries(secretStatus).forEach(([name, configured]) => {
      const status = configured === true ? `${EMOJI.check} Configured` :
                     configured === false ? `${EMOJI.cross} Missing` :
                     `${EMOJI.warning} Cannot verify`;
      console.log(`   ${name}: ${status}`);
      if (configured !== true) allConfigured = false;
    });

    if (allConfigured) {
      console.log(`\n${EMOJI.check} All required secrets are now configured!`);
    } else {
      console.log(`\n${EMOJI.cross} Some secrets still need to be configured.`);
    }
  } else {
    const solution = SECRET_SOLUTIONS[solutionKey];
    if (solution) {
      const configured = await validateSecretExists(repo, token, solution.validation);
      if (configured === true) {
        console.log(`${EMOJI.check} ${solution.name} is now configured!`);
      } else if (configured === false) {
        console.log(`${EMOJI.cross} ${solution.name} is still not configured.`);
      } else {
        console.log(`${EMOJI.warning} Could not verify ${solution.name} configuration.`);
      }
    }
  }
  console.log('');
}

function printNextSteps(repo, workflowUrl) {
  console.log(`${EMOJI.rocket} Next Steps`);
  console.log('='.repeat(30));
  console.log('1. Configure the missing secrets following the steps above');
  console.log('2. Validate your configuration:');
  console.log('   GITHUB_TOKEN=your_token npm run status');
  console.log('3. Re-run the failed workflow:');
  
  if (workflowUrl) {
    console.log(`   ${EMOJI.link} ${workflowUrl}`);
    console.log('   Click "Re-run all jobs"');
  } else {
    console.log(`   Go to: https://github.com/${repo}/actions`);
    console.log('   Find the failed workflow and click "Re-run all jobs"');
  }
  
  console.log('4. Or trigger a new deployment:');
  console.log('   git push origin main');
  console.log('');

  console.log(`${EMOJI.gear} Alternative - Test Before Re-running:`);
  console.log('   npm run test-workflow   # Test locally first');
  console.log('');

  console.log(`${EMOJI.link} Useful Links:`);
  console.log(`   Secrets: https://github.com/${repo}/settings/secrets/actions`);
  console.log(`   Actions: https://github.com/${repo}/actions`);
  console.log('');
}

async function main() {
  const workflowUrl = process.argv[2];

  console.log(`${EMOJI.wrench} CI Failure Resolution Assistant`);
  console.log('='.repeat(50));
  console.log('');

  const repo = getRepoInfo();
  const token = checkGitHubToken();

  console.log(`${EMOJI.info} Repository: ${repo}`);
  if (workflowUrl) {
    console.log(`${EMOJI.link} Workflow: ${workflowUrl}`);
  }
  console.log('');

  // Analyze the failure
  const { detectedPattern, failureText } = await analyzeFailure(workflowUrl, repo, token);
  
  printFailureAnalysis(detectedPattern);

  // Show specific solution or general guidance
  const solutionKey = detectedPattern?.solution || 'ALL_SECRETS';
  printSolution(solutionKey, repo);

  // Validate current state
  await printValidation(repo, token, solutionKey);

  // Show next steps
  printNextSteps(repo, workflowUrl);

  console.log(`${EMOJI.check} Need more help? Run: npm run setup`);
}

main().catch(error => {
  console.error(`${EMOJI.cross} CI resolution failed:`, error.message);
  exit(1);
});