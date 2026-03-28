# Test Coverage Analysis

## Current State

This repository has **zero automated tests**. There are no test files (`.test.js`, `.spec.js`), no test framework configured (Jest, Vitest, Mocha), and no coverage tooling. The `package.json` has no `test` script.

The repository contains:
- **10 scripts** in `scripts/` (~1,800 lines of JavaScript) with significant business logic
- **7 agent configurations** with TOML configs and SKILL.md prompts
- **2 GitHub Actions workflows** with complex validation steps
- **Shared patterns** (e.g., `getRepoInfo()`) duplicated across 6+ scripts

## Recommended Test Improvements

### Priority 1: Unit Tests for Script Utilities

The `scripts/` directory contains substantial logic that is currently untested. These are the highest-value targets:

#### 1.1 `getRepoInfo()` — duplicated in 6 scripts
This function parses a GitHub repo from `git remote get-url origin`. It handles multiple URL formats (HTTPS, SSH) and has error paths. Since it's duplicated everywhere, it should be **extracted into a shared module** and tested:

```
Test cases:
- HTTPS URL: https://github.com/owner/repo.git → "owner/repo"
- HTTPS URL without .git: https://github.com/owner/repo → "owner/repo"
- SSH URL: git@github.com:owner/repo.git → "owner/repo"
- Invalid URL → throws error
- No git remote → throws error
```

#### 1.2 `CI_FAILURE_PATTERNS` regex matching (`resolve-ci-failure.js:34-70`)
The `analyzeFailure()` function matches log text against 5 regex patterns. These regexes are critical for diagnosing CI failures and are excellent candidates for unit tests:

```
Test cases per pattern:
- MISSING_ANTHROPIC_KEY: matches "ANTHROPIC_API_KEY not set", "not configured"
- ONLY_ANTHROPIC_KEY_MISSING: matches combined status messages
- MISSING_DEPLOY_SSH: matches "DEPLOY_SSH_KEY not set", "SSH authentication failed"
- MISSING_DEPLOY_ENV: matches "DEPLOY_ENV_TOML not set"
- GENERAL_SECRET_MISSING: matches "repository secret not set"
- No match → returns null detectedPattern
- Priority ordering (first match wins)
```

#### 1.3 `checkSecrets()` in `validate-secrets.js:79-161`
This function has 3 distinct API response branches (200, 404, other) across 3 loops (required secrets, optional secrets, optional variables). Mock the `fetch` calls and verify:

```
Test cases:
- All secrets configured → returns true
- Required secret missing (404) → returns false
- Optional secret missing (404) → still returns true
- API error (403) → warns about permissions
- Network error → shows error message
```

#### 1.4 `printSolution()` in `resolve-ci-failure.js:277-311`
Tests that the correct solution steps are rendered, including `{repo_url}` template substitution.

### Priority 2: Integration Tests for Setup Scripts

#### 2.1 `test-deploy-workflow.js`
This script runs 6 sequential validation steps. It already *is* a test of sorts, but it's not tested itself. An integration test should verify it correctly identifies:
- Missing git repo
- Missing `package.json`
- Missing `node_modules` (and triggers install)
- Missing environment variables
- Invalid workflow YAML

#### 2.2 `pre-commit-check.js`
The pre-commit hook has a 3-second timeout on API calls. Test:
- Feature branch → exits early without checks
- Main branch + token present → checks API
- Main branch + API timeout → continues without blocking
- Main branch + secret missing → warns but doesn't block

### Priority 3: Configuration Validation Tests

#### 3.1 Agent TOML Config Validation
Each agent's `config.toml` should be validated programmatically:

```
Test cases:
- All configs parse as valid TOML
- Each config references a model defined in root config.toml
- Webhook triggers reference valid GitHub event types
- Schedule cron expressions are valid
- Required fields (model, name) are present
- Repository references match expected format (org/repo)
```

#### 3.2 GitHub Actions Workflow Validation
The `deploy.yml` and `update-action-llama.yml` workflows should be validated:

```
Test cases:
- YAML is valid and parseable
- All referenced secrets are documented
- All referenced actions (actions/checkout, actions/setup-node) use pinned versions
- The dry-run mode path doesn't require secrets
```

### Priority 4: Snapshot/Contract Tests for Agent Skills

#### 4.1 SKILL.md Structure Validation
Each agent's `SKILL.md` is the core prompt. Validate structural consistency:

```
Test cases:
- All agents have a SKILL.md file
- SKILL.md files are non-empty and above a minimum size
- No broken markdown links within SKILL.md files
- Referenced commands/tools are consistent with config.toml
```

## Recommended Setup

### Test Framework
Add **Vitest** (already used in the target `action-llama` repo, keeps the ecosystem consistent):

```json
{
  "devDependencies": {
    "vitest": "^3.0.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Suggested File Structure
```
tests/
├── unit/
│   ├── utils.test.js              # Shared getRepoInfo(), checkGitHubToken()
│   ├── validate-secrets.test.js   # Secret validation logic
│   ├── resolve-ci-failure.test.js # CI pattern matching & solutions
│   └── pre-commit-check.test.js   # Pre-commit hook logic
├── integration/
│   ├── test-deploy-workflow.test.js
│   └── setup-scripts.test.js
└── config/
    ├── agent-configs.test.js      # TOML validation
    ├── workflow-validation.test.js # GitHub Actions YAML
    └── skill-files.test.js        # SKILL.md structure
```

### Refactoring Prerequisite
Before writing tests, extract `getRepoInfo()` and `checkGitHubToken()` into a shared `scripts/utils.js` module. These functions are copy-pasted across 6 files and represent the easiest win for both testability and maintainability.

## Impact Summary

| Area | Files | Estimated Tests | Risk Covered |
|------|-------|----------------|--------------|
| Script utilities | 6 scripts | ~30 tests | Broken repo parsing, incorrect secret validation |
| CI pattern matching | 1 script | ~15 tests | Misdiagnosed CI failures |
| Config validation | 9 TOML files | ~20 tests | Invalid deployments, misconfigured agents |
| Workflow validation | 2 YAML files | ~10 tests | Broken CI/CD pipeline |
| SKILL.md structure | 7 files | ~10 tests | Inconsistent agent behavior |
| **Total** | | **~85 tests** | |

The highest-ROI starting point is **Priority 1** — unit testing the script utilities, particularly the regex pattern matching and API response handling in `resolve-ci-failure.js` and `validate-secrets.js`. These are the most logic-dense files and the most likely to regress.
