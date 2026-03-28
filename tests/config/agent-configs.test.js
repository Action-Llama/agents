import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import TOML from '@iarna/toml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

// Load root config
const rootConfigPath = join(repoRoot, 'config.toml');
const rootConfigRaw = readFileSync(rootConfigPath, 'utf-8');
const rootConfig = TOML.parse(rootConfigRaw);

// Load all agent configs
const agentsDir = join(repoRoot, 'agents');
const agentNames = readdirSync(agentsDir);

const agentConfigs = agentNames.map((name) => {
  const configPath = join(agentsDir, name, 'config.toml');
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = TOML.parse(raw);
  return { name, configPath, parsed };
});

// -----------------------------------------------------------------------
// Parse correctness
// -----------------------------------------------------------------------
describe('TOML parse correctness', () => {
  it('root config.toml parses without errors', () => {
    expect(() => TOML.parse(rootConfigRaw)).not.toThrow();
  });

  it.each(agentConfigs.map(({ name, configPath }) => [name, configPath]))(
    'agents/%s/config.toml parses without errors',
    (_name, configPath) => {
      const raw = readFileSync(configPath, 'utf-8');
      expect(() => TOML.parse(raw)).not.toThrow();
    }
  );
});

// -----------------------------------------------------------------------
// Root config structure
// -----------------------------------------------------------------------
describe('root config.toml structure', () => {
  it('has a models section', () => {
    expect(rootConfig).toHaveProperty('models');
    expect(typeof rootConfig.models).toBe('object');
  });

  it('defines the sonnet model', () => {
    expect(rootConfig.models).toHaveProperty('sonnet');
  });

  it('defines the opus model', () => {
    expect(rootConfig.models).toHaveProperty('opus');
  });

  it('has a webhooks section', () => {
    expect(rootConfig).toHaveProperty('webhooks');
  });

  it('has a github webhook with type "github"', () => {
    expect(rootConfig.webhooks).toHaveProperty('github');
    expect(rootConfig.webhooks.github.type).toBe('github');
  });
});

// -----------------------------------------------------------------------
// Agent config — model field
// -----------------------------------------------------------------------
describe('agent config model field', () => {
  it.each(agentConfigs.map(({ name, parsed }) => [name, parsed]))(
    'agents/%s has a models field',
    (_name, parsed) => {
      expect(parsed).toHaveProperty('models');
    }
  );

  it.each(agentConfigs.map(({ name, parsed }) => [name, parsed]))(
    'agents/%s models field is a non-empty array',
    (_name, parsed) => {
      expect(Array.isArray(parsed.models)).toBe(true);
      expect(parsed.models.length).toBeGreaterThan(0);
    }
  );

  it.each(agentConfigs.map(({ name, parsed }) => [name, parsed]))(
    'agents/%s model values reference models defined in root config',
    (_name, parsed) => {
      const definedModels = Object.keys(rootConfig.models);
      for (const model of parsed.models) {
        expect(definedModels).toContain(model);
      }
    }
  );
});

// -----------------------------------------------------------------------
// Schedule validation
// -----------------------------------------------------------------------

// Very permissive cron regex: 5 or 6 fields separated by whitespace
const CRON_REGEX = /^(\S+\s+){4}\S+(\s+\S+)?$/;

const AGENTS_WITH_SCHEDULES = [
  'dev',
  'planner',
  'reviewer',
  'gh-actions-responder',
  'e2e-coverage-improver',
  'unit-coverage-improver',
];

const AGENTS_WITHOUT_SCHEDULES = ['mintlify-fixer'];

describe('schedule validation', () => {
  it.each(
    agentConfigs
      .filter(({ name }) => AGENTS_WITH_SCHEDULES.includes(name))
      .map(({ name, parsed }) => [name, parsed])
  )('agents/%s has a schedule field', (_name, parsed) => {
    expect(parsed).toHaveProperty('schedule');
  });

  it.each(
    agentConfigs
      .filter(({ name }) => AGENTS_WITH_SCHEDULES.includes(name))
      .map(({ name, parsed }) => [name, parsed])
  )('agents/%s schedule is a valid cron expression', (_name, parsed) => {
    expect(CRON_REGEX.test(parsed.schedule.trim())).toBe(true);
  });

  it.each(
    agentConfigs
      .filter(({ name }) => AGENTS_WITHOUT_SCHEDULES.includes(name))
      .map(({ name, parsed }) => [name, parsed])
  )('agents/%s does NOT have a schedule field (webhook-only)', (_name, parsed) => {
    expect(parsed).not.toHaveProperty('schedule');
  });
});

// -----------------------------------------------------------------------
// Webhook validation
// -----------------------------------------------------------------------

const VALID_GITHUB_EVENTS = new Set([
  'check_run',
  'check_suite',
  'create',
  'delete',
  'deployment',
  'deployment_status',
  'fork',
  'gollum',
  'issue_comment',
  'issues',
  'label',
  'member',
  'milestone',
  'page_build',
  'project',
  'project_card',
  'project_column',
  'public',
  'pull_request',
  'pull_request_review',
  'pull_request_review_comment',
  'push',
  'release',
  'repository',
  'repository_dispatch',
  'schedule',
  'status',
  'watch',
  'workflow_dispatch',
  'workflow_run',
]);

const VALID_GITHUB_ACTIONS = new Set([
  'assigned',
  'closed',
  'completed',
  'converted_to_draft',
  'created',
  'deleted',
  'demilestoned',
  'dismissed',
  'edited',
  'labeled',
  'locked',
  'milestoned',
  'opened',
  'pinned',
  'ready_for_review',
  'reopened',
  'resolved',
  'review_requested',
  'review_request_removed',
  'submitted',
  'synchronize',
  'transferred',
  'unassigned',
  'unlabeled',
  'unlocked',
  'unpinned',
  'unresolved',
]);

const agentsWithWebhooks = agentConfigs.filter(
  ({ parsed }) => Array.isArray(parsed.webhooks) && parsed.webhooks.length > 0
);

describe('webhook validation', () => {
  it.each(
    agentsWithWebhooks.flatMap(({ name, parsed }) =>
      parsed.webhooks.map((wh, idx) => [name, idx, wh])
    )
  )('agents/%s webhook[%i] has a valid source field', (_name, _idx, wh) => {
    expect(wh).toHaveProperty('source');
    expect(wh.source).toBe('github');
  });

  it.each(
    agentsWithWebhooks.flatMap(({ name, parsed }) =>
      parsed.webhooks.map((wh, idx) => [name, idx, wh])
    )
  )('agents/%s webhook[%i] events are valid GitHub event names', (_name, _idx, wh) => {
    expect(Array.isArray(wh.events)).toBe(true);
    for (const event of wh.events) {
      expect(VALID_GITHUB_EVENTS.has(event)).toBe(true);
    }
  });

  it.each(
    agentsWithWebhooks.flatMap(({ name, parsed }) =>
      parsed.webhooks
        .filter((wh) => Array.isArray(wh.actions))
        .map((wh, idx) => [name, idx, wh])
    )
  )('agents/%s webhook[%i] actions are valid GitHub action values', (_name, _idx, wh) => {
    for (const action of wh.actions) {
      expect(VALID_GITHUB_ACTIONS.has(action)).toBe(true);
    }
  });
});

// -----------------------------------------------------------------------
// Repository references
// -----------------------------------------------------------------------

const ORG_REPO_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

const agentsWithRepo = agentConfigs.filter(
  ({ parsed }) => parsed.params && parsed.params.repo
);

describe('repository reference validation', () => {
  it.each(agentsWithRepo.map(({ name, parsed }) => [name, parsed.params.repo]))(
    'agents/%s repository field uses valid org/repo format',
    (_name, repo) => {
      expect(ORG_REPO_REGEX.test(repo)).toBe(true);
    }
  );

  it('e2e-coverage-improver references Action-Llama/action-llama', () => {
    const agent = agentConfigs.find(({ name }) => name === 'e2e-coverage-improver');
    expect(agent).toBeDefined();
    expect(agent.parsed.params.repo).toBe('Action-Llama/action-llama');
  });

  it('unit-coverage-improver references Action-Llama/action-llama', () => {
    const agent = agentConfigs.find(({ name }) => name === 'unit-coverage-improver');
    expect(agent).toBeDefined();
    expect(agent.parsed.params.repo).toBe('Action-Llama/action-llama');
  });
});

// -----------------------------------------------------------------------
// Cross-config consistency
// -----------------------------------------------------------------------

describe('cross-config consistency', () => {
  it('no two agents have identical webhook triggers', () => {
    const triggers = [];
    for (const { name, parsed } of agentConfigs) {
      if (!Array.isArray(parsed.webhooks)) continue;
      for (const wh of parsed.webhooks) {
        // Build a canonical key for each trigger using source + events + actions
        const key = JSON.stringify({
          source: wh.source,
          events: [...(wh.events || [])].sort(),
          actions: [...(wh.actions || [])].sort(),
          labels: [...(wh.labels || [])].sort(),
        });
        triggers.push({ agent: name, key });
      }
    }

    const seen = new Map();
    for (const { agent, key } of triggers) {
      if (seen.has(key)) {
        // Two agents share an identical webhook trigger
        expect(
          `${agent} duplicates trigger of ${seen.get(key)}: ${key}`
        ).toBe('no duplicates');
      }
      seen.set(key, agent);
    }
  });

  it('all agents referencing organization use consistent casing (Action-Llama)', () => {
    for (const { name, parsed } of agentConfigs) {
      if (parsed.params && parsed.params.org) {
        expect(parsed.params.org).toBe('Action-Llama');
      }
    }
  });
});
