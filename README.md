# Action Llama Agents

Automated development agents for the [Action Llama](https://github.com/Action-Llama/action-llama) organization. These agents run on schedules and webhooks to triage issues, implement changes, review PRs, and respond to CI failures.

## Agents

| Agent | Summary |
|-------|---------|
| [**dev**](agents/dev/ACTIONS.md) | Picks up GitHub issues and implements the requested changes, opening a PR with the fix |
| [**planner**](agents/planner/ACTIONS.md) | Triages new issues — assesses whether they have enough detail and either asks clarifying questions or marks them ready for development |
| [**reviewer**](agents/reviewer/ACTIONS.md) | Reviews and merges pull requests after ensuring they meet quality and security standards |
| [**gh-actions-responder**](agents/gh-actions-responder/ACTIONS.md) | Analyzes GitHub Actions workflow failures, diagnoses the root cause, and creates an issue with a suggested fix |
| [**mintlify-fixer**](agents/mintlify-fixer/ACTIONS.md) | Fixes Mintlify documentation build failures and opens a PR with the correction |
