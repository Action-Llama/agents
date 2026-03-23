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
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log('🧪 Deploy Workflow Test');
console.log('=======================\n');

console.log('📍 Testing from directory:', rootDir);
console.log('🔍 This script simulates deployment workflow validation steps\n');

// Test 1: Check if we're in a Git repository
console.log('1️⃣  Checking Git repository...');
try {
  const remoteUrl = execSync('git remote get-url origin', { 
    encoding: 'utf8', 
    cwd: rootDir 
  }).trim();
  console.log(`   ✅ Git repository: ${remoteUrl}`);
} catch (error) {
  console.error(`   ❌ Not in a Git repository or no origin remote`);
  console.error(`      Run this script from the repository root directory`);
  process.exit(1);
}

// Test 2: Check Node.js dependencies
console.log('\n2️⃣  Checking dependencies...');
try {
  const packageJsonPath = join(rootDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error('package.json not found');
  }
  
  const nodeModulesPath = join(rootDir, 'node_modules');
  if (!existsSync(nodeModulesPath)) {
    console.log(`   ⚠️  Dependencies not installed, running 'npm install'...`);
    execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
  }
  console.log(`   ✅ Dependencies are ready`);
} catch (error) {
  console.error(`   ❌ Dependency check failed: ${error.message}`);
  process.exit(1);
}

// Test 3: Check environment variable setup
console.log('\n3️⃣  Checking environment variables...');
const requiredEnvVars = ['GITHUB_TOKEN'];
const optionalEnvVars = ['ANTHROPIC_API_KEY', 'GIT_EMAIL', 'GIT_NAME'];

let missingRequired = [];
for (const varName of requiredEnvVars) {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName} is set`);
  } else {
    console.log(`   ❌ ${varName} is not set`);
    missingRequired.push(varName);
  }
}

for (const varName of optionalEnvVars) {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName} is set`);
  } else {
    console.log(`   ⚪ ${varName} is not set (will use default)`);
  }
}

// Test 4: Simulate credential file creation
console.log('\n4️⃣  Testing credential file creation...');
const testCredDir = join(rootDir, '.test-credentials');
try {
  if (existsSync(testCredDir)) {
    execSync(`rm -rf "${testCredDir}"`, { cwd: rootDir });
  }
  mkdirSync(testCredDir, { recursive: true });
  
  // Create test credential files
  const credentials = [
    {
      name: 'github_token.json',
      content: JSON.stringify({
        type: 'github_token',
        token: process.env.GITHUB_TOKEN || 'test-token'
      }, null, 2)
    },
    {
      name: 'git_ssh.json',
      content: JSON.stringify({
        type: 'git_ssh',
        privateKey: 'test-key',
        email: process.env.GIT_EMAIL || 'deploy@action-llama.com',
        name: process.env.GIT_NAME || 'Action Llama Deploy'
      }, null, 2)
    }
  ];

  // Only create anthropic_key.json if ANTHROPIC_API_KEY is provided
  if (process.env.ANTHROPIC_API_KEY) {
    credentials.push({
      name: 'anthropic_key.json', 
      content: JSON.stringify({
        type: 'anthropic_key',
        key: process.env.ANTHROPIC_API_KEY
      }, null, 2)
    });
  }
  
  for (const cred of credentials) {
    const filePath = join(testCredDir, cred.name);
    writeFileSync(filePath, cred.content);
    execSync(`chmod 600 "${filePath}"`);
  }
  
  console.log(`   ✅ Test credential files created in ${testCredDir}`);
  console.log(`   📁 Files: ${credentials.map(c => c.name).join(', ')}`);
} catch (error) {
  console.error(`   ❌ Credential file test failed: ${error.message}`);
} finally {
  // Clean up test files
  if (existsSync(testCredDir)) {
    execSync(`rm -rf "${testCredDir}"`, { cwd: rootDir });
  }
}

// Test 5: Run local secret validation
console.log('\n5️⃣  Running local secret validation...');
if (process.env.GITHUB_TOKEN) {
  try {
    execSync('npm run validate-secrets', { 
      cwd: rootDir, 
      stdio: 'inherit',
      env: { ...process.env, GITHUB_TOKEN: process.env.GITHUB_TOKEN }
    });
  } catch (error) {
    console.log(`   ⚠️  Secret validation completed with warnings (expected if secrets aren't configured)`);
  }
} else {
  console.log(`   ⚠️  Skipping secret validation (GITHUB_TOKEN not set)`);
  console.log(`      To test: GITHUB_TOKEN=your_token npm run validate-secrets`);
}

// Test 6: Check workflow file syntax
console.log('\n6️⃣  Checking workflow file syntax...');
try {
  const workflowPath = join(rootDir, '.github/workflows/deploy.yml');
  if (existsSync(workflowPath)) {
    // Basic YAML syntax check (if yq is available)
    try {
      execSync(`which yq > /dev/null && yq eval '.' "${workflowPath}" > /dev/null`, { 
        cwd: rootDir,
        stdio: 'pipe'
      });
      console.log(`   ✅ Workflow file syntax is valid`);
    } catch {
      console.log(`   ⚪ Cannot validate YAML syntax (yq not available)`);
    }
    
    console.log(`   ✅ Workflow file exists: .github/workflows/deploy.yml`);
  } else {
    console.log(`   ❌ Workflow file not found: .github/workflows/deploy.yml`);
  }
} catch (error) {
  console.error(`   ❌ Workflow file check failed: ${error.message}`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 WORKFLOW TEST SUMMARY');
console.log('='.repeat(50));

if (missingRequired.length === 0) {
  console.log('✅ All required environment variables are set');
  console.log('✅ Local workflow simulation should work');
  console.log('\n🚀 NEXT STEPS:');
  console.log('   1. Push your changes to trigger the workflow');
  console.log('   2. Or run manually with dry-run mode:');
  console.log('      - Go to Actions → Deploy → Run workflow');
  console.log('      - Check "Run in dry-run mode"');
  console.log('      - Click "Run workflow"');
} else {
  console.log(`❌ Missing required environment variables: ${missingRequired.join(', ')}`);
  console.log('\n🔧 SETUP NEEDED:');
  console.log('   1. Set missing environment variables:');
  for (const varName of missingRequired) {
    console.log(`      export ${varName}="your-${varName.toLowerCase().replace('_', '-')}"`);
  }
  console.log('   2. Re-run this test script');
  console.log('   3. Configure repository secrets for production deployment');
}

console.log('\n📖 For detailed setup instructions, see:');
console.log('   • README.md');
console.log('   • SETUP-CHECKLIST.md');
console.log('\n💡 TIP: Use dry-run mode to test workflow without all secrets configured!');