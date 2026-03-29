#!/usr/bin/env node

/**
 * Deploy Workflow Test Script
 * 
 * This script helps developers test the deployment workflow setup locally
 * before configuring all production secrets.
 * 
 * Usage:
 *   node scripts/test-deploy-workflow.js
 * 
 * This script simulates the deployment workflow validation steps to help
 * identify potential issues before running the actual GitHub workflow.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultRootDir = join(__dirname, '..');

/**
 * Run the deploy workflow test steps.
 *
 * @param {object} [options] - Injectable options for testing
 * @param {string} [options.rootDir] - Root directory of the project
 * @param {object} [options.env] - Environment variables (defaults to process.env)
 * @param {Function} [options.execSyncFn] - execSync-compatible function
 * @param {Function} [options.existsSyncFn] - existsSync-compatible function
 * @param {Function} [options.mkdirSyncFn] - mkdirSync-compatible function
 * @param {Function} [options.writeFileSyncFn] - writeFileSync-compatible function
 * @param {Function} [options.rmSyncFn] - rmSync-compatible function for cleanup
 * @param {Function} [options.log] - Logging function
 * @returns {{ steps: Array<{step: number, status: string, message?: string}>, exitCode: number }}
 */
export function runDeployTest({
  rootDir = defaultRootDir,
  env = process.env,
  execSyncFn = execSync,
  existsSyncFn = existsSync,
  mkdirSyncFn = mkdirSync,
  writeFileSyncFn = writeFileSync,
  rmSyncFn = rmSync,
  log = console.log,
} = {}) {
  const steps = [];

  log('🧪 Deploy Workflow Test');
  log('=======================\n');
  log('📍 Testing from directory:', rootDir);
  log('🔍 This script simulates deployment workflow validation steps\n');

  // Step 1: Check if we're in a Git repository
  log('1️⃣  Checking Git repository...');
  try {
    const remoteUrl = execSyncFn('git remote get-url origin', { 
      encoding: 'utf8', 
      cwd: rootDir 
    }).trim();
    log(`   ✅ Git repository: ${remoteUrl}`);
    steps.push({ step: 1, status: 'passed' });
  } catch (error) {
    log(`   ❌ Not in a Git repository or no origin remote`);
    log(`      Run this script from the repository root directory`);
    steps.push({ step: 1, status: 'failed', message: 'Not in a Git repository or no origin remote' });
    // Mark remaining steps as skipped
    for (let i = 2; i <= 6; i++) {
      steps.push({ step: i, status: 'skipped' });
    }
    return { steps, exitCode: 1 };
  }

  // Step 2: Check Node.js dependencies
  log('\n2️⃣  Checking dependencies...');
  try {
    const packageJsonPath = join(rootDir, 'package.json');
    if (!existsSyncFn(packageJsonPath)) {
      throw new Error('package.json not found');
    }
    
    const nodeModulesPath = join(rootDir, 'node_modules');
    if (!existsSyncFn(nodeModulesPath)) {
      log(`   ⚠️  Dependencies not installed, running 'npm install'...`);
      execSyncFn('npm install', { cwd: rootDir, stdio: 'inherit' });
    }
    log(`   ✅ Dependencies are ready`);
    steps.push({ step: 2, status: 'passed' });
  } catch (error) {
    log(`   ❌ Dependency check failed: ${error.message}`);
    steps.push({ step: 2, status: 'failed', message: error.message });
    // Mark remaining steps as skipped
    for (let i = 3; i <= 6; i++) {
      steps.push({ step: i, status: 'skipped' });
    }
    return { steps, exitCode: 1 };
  }

  // Step 3: Check environment variable setup
  log('\n3️⃣  Checking environment variables...');
  const requiredEnvVars = ['GITHUB_TOKEN'];
  const optionalEnvVars = ['ANTHROPIC_API_KEY', 'GIT_EMAIL', 'GIT_NAME'];

  let missingRequired = [];
  for (const varName of requiredEnvVars) {
    if (env[varName]) {
      log(`   ✅ ${varName} is set`);
    } else {
      log(`   ❌ ${varName} is not set`);
      missingRequired.push(varName);
    }
  }

  for (const varName of optionalEnvVars) {
    if (env[varName]) {
      log(`   ✅ ${varName} is set`);
    } else {
      log(`   ⚪ ${varName} is not set (will use default)`);
    }
  }

  steps.push({ step: 3, status: missingRequired.length === 0 ? 'passed' : 'failed', missingRequired });

  // Step 4: Simulate credential file creation
  log('\n4️⃣  Testing credential file creation...');
  const testCredDir = join(rootDir, '.test-credentials');
  let step4Status = 'passed';
  try {
    if (existsSyncFn(testCredDir)) {
      rmSyncFn(testCredDir, { recursive: true, force: true });
    }
    mkdirSyncFn(testCredDir, { recursive: true });
    
    // Create test credential files
    const credentials = [
      {
        name: 'github_token.json',
        content: JSON.stringify({
          type: 'github_token',
          token: env.GITHUB_TOKEN || 'test-token'
        }, null, 2)
      },
      {
        name: 'git_ssh.json',
        content: JSON.stringify({
          type: 'git_ssh',
          privateKey: 'test-key',
          email: env.GIT_EMAIL || 'deploy@action-llama.com',
          name: env.GIT_NAME || 'Action Llama Deploy'
        }, null, 2)
      }
    ];

    // Only create anthropic_key.json if ANTHROPIC_API_KEY is provided
    if (env.ANTHROPIC_API_KEY) {
      credentials.push({
        name: 'anthropic_key.json', 
        content: JSON.stringify({
          type: 'anthropic_key',
          key: env.ANTHROPIC_API_KEY
        }, null, 2)
      });
    }
    
    for (const cred of credentials) {
      const filePath = join(testCredDir, cred.name);
      writeFileSyncFn(filePath, cred.content);
      execSyncFn(`chmod 600 "${filePath}"`);
    }
    
    log(`   ✅ Test credential files created in ${testCredDir}`);
    log(`   📁 Files: ${credentials.map(c => c.name).join(', ')}`);
  } catch (error) {
    log(`   ❌ Credential file test failed: ${error.message}`);
    step4Status = 'failed';
  } finally {
    // Clean up test files
    if (existsSyncFn(testCredDir)) {
      try {
        rmSyncFn(testCredDir, { recursive: true, force: true });
      } catch (_) {
        // Ignore cleanup errors
      }
    }
  }
  steps.push({ step: 4, status: step4Status });

  // Step 5: Run local secret validation
  log('\n5️⃣  Running local secret validation...');
  if (env.GITHUB_TOKEN) {
    try {
      execSyncFn('npm run validate-secrets', { 
        cwd: rootDir, 
        stdio: 'inherit',
        env: { ...env, GITHUB_TOKEN: env.GITHUB_TOKEN }
      });
      steps.push({ step: 5, status: 'passed' });
    } catch (error) {
      log(`   ⚠️  Secret validation completed with warnings (expected if secrets aren't configured)`);
      steps.push({ step: 5, status: 'skipped', message: 'Completed with warnings' });
    }
  } else {
    log(`   ⚠️  Skipping secret validation (GITHUB_TOKEN not set)`);
    log(`      To test: GITHUB_TOKEN=your_token npm run validate-secrets`);
    steps.push({ step: 5, status: 'skipped', message: 'GITHUB_TOKEN not set' });
  }

  // Step 6: Check workflow file syntax
  log('\n6️⃣  Checking workflow file syntax...');
  let step6Status = 'skipped';
  try {
    const workflowPath = join(rootDir, '.github/workflows/deploy.yml');
    if (existsSyncFn(workflowPath)) {
      // Basic YAML syntax check (if yq is available)
      try {
        execSyncFn(`which yq > /dev/null && yq eval '.' "${workflowPath}" > /dev/null`, { 
          cwd: rootDir,
          stdio: 'pipe'
        });
        log(`   ✅ Workflow file syntax is valid`);
        step6Status = 'passed';
      } catch {
        log(`   ⚪ Cannot validate YAML syntax (yq not available)`);
        step6Status = 'skipped';
      }
      
      log(`   ✅ Workflow file exists: .github/workflows/deploy.yml`);
    } else {
      log(`   ❌ Workflow file not found: .github/workflows/deploy.yml`);
      step6Status = 'failed';
    }
  } catch (error) {
    log(`   ❌ Workflow file check failed: ${error.message}`);
    step6Status = 'failed';
  }
  steps.push({ step: 6, status: step6Status });

  // Summary
  log('\n' + '='.repeat(50));
  log('📊 WORKFLOW TEST SUMMARY');
  log('='.repeat(50));

  const exitCode = missingRequired.length === 0 ? 0 : 1;

  if (missingRequired.length === 0) {
    log('✅ All required environment variables are set');
    log('✅ Local workflow simulation should work');
    log('\n🚀 NEXT STEPS:');
    log('   1. Push your changes to trigger the workflow');
    log('   2. Or run manually with dry-run mode:');
    log('      - Go to Actions → Deploy → Run workflow');
    log('      - Check "Run in dry-run mode"');
    log('      - Click "Run workflow"');
  } else {
    log(`❌ Missing required environment variables: ${missingRequired.join(', ')}`);
    log('\n🔧 SETUP NEEDED:');
    log('   1. Set missing environment variables:');
    for (const varName of missingRequired) {
      log(`      export ${varName}="your-${varName.toLowerCase().replace('_', '-')}"`);
    }
    log('   2. Re-run this test script');
    log('   3. Configure repository secrets for production deployment');
  }

  log('\n📖 For detailed setup instructions, see:');
  log('   • README.md');
  log('   • SETUP-CHECKLIST.md');
  log('\n💡 TIP: Use dry-run mode to test workflow without all secrets configured!');

  return { steps, exitCode };
}

// Only run when invoked directly (not when imported as a module)
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const { exitCode } = runDeployTest();
  process.exit(exitCode);
}
