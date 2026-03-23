#!/usr/bin/env node

/**
 * Git Hooks Installer
 * 
 * Installs optional Git hooks to help prevent CI failures by running
 * pre-commit checks before commits that might trigger deployment.
 * 
 * Usage:
 *   node scripts/install-git-hooks.js
 */

import { writeFileSync, existsSync, mkdirSync, chmodSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const hooksDir = join(rootDir, '.git', 'hooks');

const preCommitHook = `#!/bin/sh
# Pre-commit hook to check deployment readiness
# Installed by: npm run install-hooks

echo "🔍 Running pre-commit deployment check..."
npm run pre-commit

# Always allow commit to proceed (we warn but don't block)
exit 0
`;

function installHooks() {
  try {
    if (!existsSync(hooksDir)) {
      console.log('❌ Git hooks directory not found. Make sure you\'re in a Git repository.');
      return false;
    }

    const preCommitPath = join(hooksDir, 'pre-commit');
    
    if (existsSync(preCommitPath)) {
      console.log('⚠️  Pre-commit hook already exists.');
      console.log('   To replace it, delete .git/hooks/pre-commit and run this script again.');
      return false;
    }

    writeFileSync(preCommitPath, preCommitHook);
    chmodSync(preCommitPath, 0o755);

    console.log('✅ Git hooks installed successfully!');
    console.log('');
    console.log('🔍 The pre-commit hook will now run automatically before commits to check deployment readiness.');
    console.log('   It warns about missing secrets but won\'t block commits.');
    console.log('');
    console.log('To uninstall: rm .git/hooks/pre-commit');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to install Git hooks:', error.message);
    return false;
  }
}

console.log('🪝 Git Hooks Installer');
console.log('=====================');
console.log('');
console.log('This will install a pre-commit hook that checks deployment readiness.');
console.log('The hook warns about missing secrets but won\'t prevent commits.');
console.log('');

installHooks();