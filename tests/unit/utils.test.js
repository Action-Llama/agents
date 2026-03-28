import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock child_process before importing the module under test
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'child_process';
import { getRepoInfo, checkGitHubToken } from '../../scripts/utils.js';

describe('getRepoInfo()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses HTTPS URL with .git suffix', () => {
    execSync.mockReturnValue('https://github.com/owner/repo.git\n');
    expect(getRepoInfo()).toBe('owner/repo');
  });

  it('parses HTTPS URL without .git suffix', () => {
    execSync.mockReturnValue('https://github.com/owner/repo\n');
    expect(getRepoInfo()).toBe('owner/repo');
  });

  it('parses SSH URL', () => {
    execSync.mockReturnValue('git@github.com:owner/repo.git\n');
    expect(getRepoInfo()).toBe('owner/repo');
  });

  it('throws for non-GitHub URL', () => {
    execSync.mockReturnValue('https://gitlab.com/foo/bar\n');
    expect(() => getRepoInfo()).toThrow('Could not parse repository from git remote');
  });

  it('throws when execSync throws (no git remote)', () => {
    execSync.mockImplementation(() => {
      throw new Error('fatal: No remote "origin" configured');
    });
    expect(() => getRepoInfo()).toThrow('fatal: No remote "origin" configured');
  });
});

describe('checkGitHubToken()', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clean env before each test
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore env
    process.env.GITHUB_TOKEN = originalEnv.GITHUB_TOKEN;
    process.env.GH_TOKEN = originalEnv.GH_TOKEN;
    if (!originalEnv.GITHUB_TOKEN) delete process.env.GITHUB_TOKEN;
    if (!originalEnv.GH_TOKEN) delete process.env.GH_TOKEN;
  });

  it('returns GITHUB_TOKEN when set', () => {
    process.env.GITHUB_TOKEN = 'ghp_test123';
    expect(checkGitHubToken()).toBe('ghp_test123');
  });

  it('returns GH_TOKEN when set and GITHUB_TOKEN is not', () => {
    process.env.GH_TOKEN = 'ghp_gh456';
    expect(checkGitHubToken()).toBe('ghp_gh456');
  });

  it('returns GITHUB_TOKEN when both are set (GITHUB_TOKEN takes precedence)', () => {
    process.env.GITHUB_TOKEN = 'ghp_primary';
    process.env.GH_TOKEN = 'ghp_secondary';
    expect(checkGitHubToken()).toBe('ghp_primary');
  });

  it('calls process.exit(1) when neither token is set and exitOnMissing is true', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    expect(() => checkGitHubToken({ exitOnMissing: true })).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('calls process.exit(1) when no token and exitOnMissing defaults to true', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    expect(() => checkGitHubToken()).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('returns null when neither token is set and exitOnMissing is false', () => {
    expect(checkGitHubToken({ exitOnMissing: false })).toBeNull();
  });
});
