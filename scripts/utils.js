// scripts/utils.js
import { execSync } from 'child_process';

/**
 * Returns the "owner/repo" string by reading the git remote URL.
 * Throws an error if the remote URL cannot be parsed.
 */
export function getRepoInfo() {
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!match) {
    throw new Error('Could not parse repository from git remote');
  }
  return `${match[1]}/${match[2]}`;
}

/**
 * Returns the GitHub token from the environment.
 * If no token is found and exitOnMissing is true (the default), logs an error and exits.
 * If exitOnMissing is false, returns null instead.
 */
export function checkGitHubToken({ exitOnMissing = true } = {}) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    if (exitOnMissing) {
      console.error('❌ Error: GitHub token not found.');
      process.exit(1);
    }
    return null;
  }
  return token;
}
