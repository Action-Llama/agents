import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYAML } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const workflowsDir = join(repoRoot, '.github', 'workflows');

const deployYmlPath = join(workflowsDir, 'deploy.yml');
const updateYmlPath = join(workflowsDir, 'update-action-llama.yml');

const deployRaw = readFileSync(deployYmlPath, 'utf-8');
const updateRaw = readFileSync(updateYmlPath, 'utf-8');

const deployWorkflow = parseYAML(deployRaw);
const updateWorkflow = parseYAML(updateRaw);

// -----------------------------------------------------------------------
// YAML structure tests (both workflows)
// -----------------------------------------------------------------------
describe('YAML structure tests', () => {
  it('deploy.yml parses as valid YAML', () => {
    expect(() => parseYAML(deployRaw)).not.toThrow();
    expect(deployWorkflow).toBeTruthy();
  });

  it('update-action-llama.yml parses as valid YAML', () => {
    expect(() => parseYAML(updateRaw)).not.toThrow();
    expect(updateWorkflow).toBeTruthy();
  });

  it('deploy.yml has "on" triggers defined', () => {
    expect(deployWorkflow).toHaveProperty('on');
    expect(deployWorkflow.on).toBeTruthy();
  });

  it('update-action-llama.yml has "on" triggers defined', () => {
    expect(updateWorkflow).toHaveProperty('on');
    expect(updateWorkflow.on).toBeTruthy();
  });

  it('deploy.yml has at least one jobs entry', () => {
    expect(deployWorkflow).toHaveProperty('jobs');
    const jobCount = Object.keys(deployWorkflow.jobs).length;
    expect(jobCount).toBeGreaterThan(0);
  });

  it('update-action-llama.yml has at least one jobs entry', () => {
    expect(updateWorkflow).toHaveProperty('jobs');
    const jobCount = Object.keys(updateWorkflow.jobs).length;
    expect(jobCount).toBeGreaterThan(0);
  });
});

// -----------------------------------------------------------------------
// deploy.yml specific tests
// -----------------------------------------------------------------------
describe('deploy.yml specific tests', () => {
  it('triggers include push to main', () => {
    const on = deployWorkflow.on;
    expect(on).toHaveProperty('push');
    const branches = on.push.branches;
    expect(Array.isArray(branches)).toBe(true);
    expect(branches).toContain('main');
  });

  it('triggers include repository_dispatch', () => {
    expect(deployWorkflow.on).toHaveProperty('repository_dispatch');
  });

  it('triggers include workflow_dispatch', () => {
    expect(deployWorkflow.on).toHaveProperty('workflow_dispatch');
  });

  it('workflow_dispatch has a dry_run boolean input', () => {
    const inputs = deployWorkflow.on?.workflow_dispatch?.inputs;
    expect(inputs).toBeDefined();
    expect(inputs).toHaveProperty('dry_run');
    expect(inputs.dry_run.type).toBe('boolean');
  });

  it('the job uses ubuntu-latest (or a pinned Ubuntu version)', () => {
    const jobs = Object.values(deployWorkflow.jobs);
    const runsOn = jobs[0]['runs-on'];
    expect(typeof runsOn).toBe('string');
    expect(runsOn.toLowerCase()).toMatch(/ubuntu/);
  });

  it('actions/checkout is referenced in steps', () => {
    const jobs = Object.values(deployWorkflow.jobs);
    const steps = jobs.flatMap((job) => job.steps || []);
    const uses = steps.map((s) => s.uses || '');
    const hasCheckout = uses.some((u) => u.startsWith('actions/checkout'));
    expect(hasCheckout).toBe(true);
  });

  it('actions/setup-node is referenced in steps', () => {
    const jobs = Object.values(deployWorkflow.jobs);
    const steps = jobs.flatMap((job) => job.steps || []);
    const uses = steps.map((s) => s.uses || '');
    const hasSetupNode = uses.some((u) => u.startsWith('actions/setup-node'));
    expect(hasSetupNode).toBe(true);
  });

  it('Node version is specified (currently 20)', () => {
    const jobs = Object.values(deployWorkflow.jobs);
    const steps = jobs.flatMap((job) => job.steps || []);
    const setupNodeStep = steps.find((s) => (s.uses || '').startsWith('actions/setup-node'));
    expect(setupNodeStep).toBeDefined();
    const nodeVersion = String(setupNodeStep.with?.['node-version']);
    expect(nodeVersion).toBe('20');
  });
});

// -----------------------------------------------------------------------
// update-action-llama.yml specific tests
// -----------------------------------------------------------------------
describe('update-action-llama.yml specific tests', () => {
  it('has a schedule trigger', () => {
    expect(updateWorkflow.on).toHaveProperty('schedule');
    const schedules = updateWorkflow.on.schedule;
    expect(Array.isArray(schedules)).toBe(true);
    expect(schedules.length).toBeGreaterThan(0);
    expect(schedules[0]).toHaveProperty('cron');
  });

  it('has a workflow_dispatch trigger for manual runs', () => {
    expect(updateWorkflow.on).toHaveProperty('workflow_dispatch');
  });

  it('creates a branch (not pushing directly to main)', () => {
    const jobs = Object.values(updateWorkflow.jobs);
    const steps = jobs.flatMap((job) => job.steps || []);
    const scripts = steps
      .map((s) => (typeof s.run === 'string' ? s.run : ''))
      .join('\n');

    // The workflow should create a new branch before pushing
    const createsBranch =
      scripts.includes('git checkout -b') || scripts.includes('git switch -c');
    expect(createsBranch).toBe(true);
  });

  it('uses peter-evans/create-pull-request or gh pr create / curl API for PR creation', () => {
    const jobs = Object.values(updateWorkflow.jobs);
    const steps = jobs.flatMap((job) => job.steps || []);

    const usesPeterEvans = steps.some((s) =>
      (s.uses || '').startsWith('peter-evans/create-pull-request')
    );

    const scripts = steps
      .map((s) => (typeof s.run === 'string' ? s.run : ''))
      .join('\n');

    const usesGhPR =
      scripts.includes('gh pr create') ||
      scripts.includes('curl') ||
      scripts.includes('/pulls');

    expect(usesPeterEvans || usesGhPR).toBe(true);
  });
});
