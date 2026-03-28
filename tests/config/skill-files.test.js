import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');
const agentsDir = path.join(repoRoot, 'agents');

const EXPECTED_AGENTS = [
  'dev',
  'planner',
  'reviewer',
  'gh-actions-responder',
  'mintlify-fixer',
  'e2e-coverage-improver',
  'unit-coverage-improver',
];

// Dynamically discover agent directories
function getAgentDirs() {
  return fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

describe('Agent inventory', () => {
  it('should contain exactly the expected agent directories', () => {
    const found = getAgentDirs().sort();
    const expected = [...EXPECTED_AGENTS].sort();
    assert.deepEqual(
      found,
      expected,
      `Expected agents: [${expected.join(', ')}]\nFound: [${found.join(', ')}]`
    );
  });

  it('should have no unexpected directories in agents/', () => {
    const found = new Set(getAgentDirs());
    const expected = new Set(EXPECTED_AGENTS);
    const unexpected = [...found].filter((d) => !expected.has(d));
    assert.equal(
      unexpected.length,
      0,
      `Unexpected agent directories: ${unexpected.join(', ')}`
    );
  });
});

describe('Required files — existence', () => {
  const agentDirs = getAgentDirs();

  for (const agent of agentDirs) {
    it(`agents/${agent} has a SKILL.md file`, () => {
      const skillPath = path.join(agentsDir, agent, 'SKILL.md');
      assert.ok(
        fs.existsSync(skillPath),
        `Missing SKILL.md in agents/${agent}`
      );
    });

    it(`agents/${agent} has a config.toml file`, () => {
      const configPath = path.join(agentsDir, agent, 'config.toml');
      assert.ok(
        fs.existsSync(configPath),
        `Missing config.toml in agents/${agent}`
      );
    });
  }
});

describe('SKILL.md — completeness', () => {
  const agentDirs = getAgentDirs();

  for (const agent of agentDirs) {
    const skillPath = path.join(agentsDir, agent, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;

    it(`agents/${agent}/SKILL.md is non-empty`, () => {
      const stat = fs.statSync(skillPath);
      assert.ok(stat.size > 0, `SKILL.md in agents/${agent} is empty`);
    });

    it(`agents/${agent}/SKILL.md has at least 100 lines`, () => {
      const content = fs.readFileSync(skillPath, 'utf8');
      const lines = content.split('\n').length;
      assert.ok(
        lines >= 100,
        `SKILL.md in agents/${agent} has only ${lines} lines (minimum 100 required)`
      );
    });
  }
});

describe('SKILL.md — structural consistency', () => {
  const agentDirs = getAgentDirs();

  for (const agent of agentDirs) {
    const skillPath = path.join(agentsDir, agent, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;

    it(`agents/${agent}/SKILL.md is valid UTF-8 text`, () => {
      assert.doesNotThrow(() => {
        fs.readFileSync(skillPath, 'utf8');
      }, `SKILL.md in agents/${agent} is not valid UTF-8`);
    });

    it(`agents/${agent}/SKILL.md contains no null bytes or binary content`, () => {
      const buf = fs.readFileSync(skillPath);
      const hasNullByte = buf.includes(0x00);
      assert.ok(
        !hasNullByte,
        `SKILL.md in agents/${agent} contains null bytes (binary content)`
      );
    });

    it(`agents/${agent}/SKILL.md contains at least one markdown heading`, () => {
      const content = fs.readFileSync(skillPath, 'utf8');
      const hasHeading = /^#{1,6}\s+\S/m.test(content);
      assert.ok(
        hasHeading,
        `SKILL.md in agents/${agent} has no markdown headings`
      );
    });
  }
});

describe('SKILL.md — cross-references', () => {
  const agentDirs = getAgentDirs();
  const agentSet = new Set(agentDirs);

  it('all agent directories referenced in SKILL.md files exist', () => {
    const missing = [];

    for (const agent of agentDirs) {
      const skillPath = path.join(agentsDir, agent, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;

      const content = fs.readFileSync(skillPath, 'utf8');

      // Match patterns like `agents/dev`, `agents/planner`, etc.
      const refs = [...content.matchAll(/agents\/([a-z][a-z0-9-]*)/g)].map(
        (m) => m[1]
      );

      for (const ref of refs) {
        if (!agentSet.has(ref)) {
          missing.push(`agents/${agent}/SKILL.md references non-existent agent: agents/${ref}`);
        }
      }
    }

    assert.equal(
      missing.length,
      0,
      `Broken agent references found:\n${missing.join('\n')}`
    );
  });
});
