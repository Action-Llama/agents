# Action-Llama Agents

These are the Action-Llama agents that work on the project.

## Agents

- **dev** - Developer agent that picks up GitHub issues labeled with "agent", implements the requested changes, and opens pull requests
- **reviewer** - Reviewer agent that automatically reviews and merges pull requests after ensuring GitHub checks pass, code works, and no security issues exist

## Getting Started

1. Configure credentials: `npx al doctor`
2. Start all agents: `npx al start`

For more information, see [AGENTS.md](AGENTS.md).