import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkSecrets,
  printSetupInstructions,
  REQUIRED_SECRETS,
  OPTIONAL_SECRETS,
  OPTIONAL_VARIABLES,
} from '../../scripts/validate-secrets.js';

const REPO = 'owner/repo';
const TOKEN = 'test-token';

/**
 * Build a minimal fetch mock that returns the given status for each URL.
 * urlStatusMap: { [url]: statusCode }
 * Any URL not in the map defaults to 200.
 */
function makeFetchFn(urlStatusMap = {}, throwFor = []) {
  return vi.fn(async (url) => {
    if (throwFor.some((pattern) => url.includes(pattern))) {
      throw new Error('Network error');
    }
    const status = urlStatusMap[url] ?? 200;
    return { status };
  });
}

/** Helpers to build canonical API URLs */
function secretUrl(name) {
  return `https://api.github.com/repos/${REPO}/actions/secrets/${name}`;
}
function variableUrl(name) {
  return `https://api.github.com/repos/${REPO}/actions/variables/${name}`;
}

// ── Exports ─────────────────────────────────────────────────────────────────

describe('exported constants', () => {
  it('REQUIRED_SECRETS contains DEPLOY_SSH_KEY and DEPLOY_ENV_TOML', () => {
    const names = REQUIRED_SECRETS.map((s) => s.name);
    expect(names).toContain('DEPLOY_SSH_KEY');
    expect(names).toContain('DEPLOY_ENV_TOML');
  });

  it('OPTIONAL_SECRETS contains ANTHROPIC_API_KEY', () => {
    const names = OPTIONAL_SECRETS.map((s) => s.name);
    expect(names).toContain('ANTHROPIC_API_KEY');
  });

  it('OPTIONAL_VARIABLES contains GIT_EMAIL and GIT_NAME', () => {
    const names = OPTIONAL_VARIABLES.map((v) => v.name);
    expect(names).toContain('GIT_EMAIL');
    expect(names).toContain('GIT_NAME');
  });
});

// ── Return value tests ───────────────────────────────────────────────────────

describe('checkSecrets() return value', () => {
  beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('returns true when all secrets are configured (all 200)', async () => {
    const fetchFn = makeFetchFn();
    const result = await checkSecrets(REPO, TOKEN, { fetchFn });
    expect(result).toBe(true);
  });

  it('returns false when one required secret is missing (404)', async () => {
    const fetchFn = makeFetchFn({ [secretUrl('DEPLOY_SSH_KEY')]: 404 });
    const result = await checkSecrets(REPO, TOKEN, { fetchFn });
    expect(result).toBe(false);
  });

  it('returns false when both required secrets are missing', async () => {
    const fetchFn = makeFetchFn({
      [secretUrl('DEPLOY_SSH_KEY')]: 404,
      [secretUrl('DEPLOY_ENV_TOML')]: 404,
    });
    const result = await checkSecrets(REPO, TOKEN, { fetchFn });
    expect(result).toBe(false);
  });

  it('returns true when only the optional secret is missing (404)', async () => {
    const fetchFn = makeFetchFn({ [secretUrl('ANTHROPIC_API_KEY')]: 404 });
    const result = await checkSecrets(REPO, TOKEN, { fetchFn });
    expect(result).toBe(true);
  });

  it('returns false when all secrets are missing', async () => {
    const fetchFn = makeFetchFn({
      [secretUrl('DEPLOY_SSH_KEY')]: 404,
      [secretUrl('DEPLOY_ENV_TOML')]: 404,
      [secretUrl('ANTHROPIC_API_KEY')]: 404,
    });
    const result = await checkSecrets(REPO, TOKEN, { fetchFn });
    expect(result).toBe(false);
  });
});

// ── Console output tests ─────────────────────────────────────────────────────

describe('checkSecrets() console output', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('logs ✅ configured for 200 response', async () => {
    const fetchFn = makeFetchFn();
    await checkSecrets(REPO, TOKEN, { fetchFn });

    const logs = logSpy.mock.calls.flat().join('\n');
    expect(logs).toContain('✅ DEPLOY_SSH_KEY - configured');
    expect(logs).toContain('✅ DEPLOY_ENV_TOML - configured');
    expect(logs).toContain('✅ ANTHROPIC_API_KEY - configured');
  });

  it('logs ❌ NOT CONFIGURED for required secret 404', async () => {
    const fetchFn = makeFetchFn({ [secretUrl('DEPLOY_SSH_KEY')]: 404 });
    await checkSecrets(REPO, TOKEN, { fetchFn });

    const logs = logSpy.mock.calls.flat().join('\n');
    expect(logs).toContain('❌ DEPLOY_SSH_KEY - NOT CONFIGURED');
  });

  it('logs ⚪ not configured (optional) for optional secret 404', async () => {
    const fetchFn = makeFetchFn({ [secretUrl('ANTHROPIC_API_KEY')]: 404 });
    await checkSecrets(REPO, TOKEN, { fetchFn });

    const logs = logSpy.mock.calls.flat().join('\n');
    expect(logs).toContain('⚪ ANTHROPIC_API_KEY - not configured (optional)');
  });

  it('logs ⚪ using default for optional variable 404', async () => {
    const fetchFn = makeFetchFn({
      [variableUrl('GIT_EMAIL')]: 404,
      [variableUrl('GIT_NAME')]: 404,
    });
    await checkSecrets(REPO, TOKEN, { fetchFn });

    const logs = logSpy.mock.calls.flat().join('\n');
    expect(logs).toContain('⚪ GIT_EMAIL - using default');
    expect(logs).toContain('⚪ GIT_NAME - using default');
  });

  it('logs permission warning on 403 response', async () => {
    const fetchFn = makeFetchFn({ [secretUrl('DEPLOY_SSH_KEY')]: 403 });
    await checkSecrets(REPO, TOKEN, { fetchFn });

    const logs = logSpy.mock.calls.flat().join('\n');
    expect(logs).toContain('Your GitHub token may not have the required permissions.');
  });

  it('logs ⚠️ could not verify for unexpected status', async () => {
    const fetchFn = makeFetchFn({ [secretUrl('DEPLOY_SSH_KEY')]: 500 });
    await checkSecrets(REPO, TOKEN, { fetchFn });

    const logs = logSpy.mock.calls.flat().join('\n');
    expect(logs).toContain('could not verify');
    expect(logs).toContain('500');
  });

  it('logs error message on network error and does not crash', async () => {
    const fetchFn = makeFetchFn({}, ['DEPLOY_SSH_KEY']);
    await expect(checkSecrets(REPO, TOKEN, { fetchFn })).resolves.not.toThrow();

    const logs = logSpy.mock.calls.flat().join('\n');
    expect(logs).toContain('Network error');
  });
});

// ── API call tests ───────────────────────────────────────────────────────────

describe('checkSecrets() API calls', () => {
  beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('calls correct URL for required secrets', async () => {
    const fetchFn = makeFetchFn();
    await checkSecrets(REPO, TOKEN, { fetchFn });

    const urls = fetchFn.mock.calls.map(([url]) => url);
    expect(urls).toContain(secretUrl('DEPLOY_SSH_KEY'));
    expect(urls).toContain(secretUrl('DEPLOY_ENV_TOML'));
  });

  it('calls correct URL for optional secrets', async () => {
    const fetchFn = makeFetchFn();
    await checkSecrets(REPO, TOKEN, { fetchFn });

    const urls = fetchFn.mock.calls.map(([url]) => url);
    expect(urls).toContain(secretUrl('ANTHROPIC_API_KEY'));
  });

  it('calls correct URL for optional variables', async () => {
    const fetchFn = makeFetchFn();
    await checkSecrets(REPO, TOKEN, { fetchFn });

    const urls = fetchFn.mock.calls.map(([url]) => url);
    expect(urls).toContain(variableUrl('GIT_EMAIL'));
    expect(urls).toContain(variableUrl('GIT_NAME'));
  });

  it('includes Authorization header with token', async () => {
    const fetchFn = makeFetchFn();
    await checkSecrets(REPO, TOKEN, { fetchFn });

    for (const [, options] of fetchFn.mock.calls) {
      expect(options.headers['Authorization']).toBe(`token ${TOKEN}`);
    }
  });

  it('makes calls for all 5 items (2 required + 1 optional secret + 2 variables)', async () => {
    const fetchFn = makeFetchFn();
    await checkSecrets(REPO, TOKEN, { fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(5);
  });
});

// ── printSetupInstructions tests ─────────────────────────────────────────────

describe('printSetupInstructions()', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('includes repo-specific secrets URL', () => {
    printSetupInstructions(REPO);

    const logs = logSpy.mock.calls.flat().join('\n');
    expect(logs).toContain(`https://github.com/${REPO}/settings/secrets/actions`);
  });

  it('includes repo-specific variables URL', () => {
    printSetupInstructions(REPO);

    const logs = logSpy.mock.calls.flat().join('\n');
    expect(logs).toContain(`https://github.com/${REPO}/settings/variables/actions`);
  });
});
