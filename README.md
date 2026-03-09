# Action-Llama Agents

These are the Action-Llama agents that work on the project.

## Agents

- **dev** - Developer agent that picks up GitHub issues labeled with "agent", implements the requested changes, and opens pull requests
- **reviewer** - Reviewer agent that automatically reviews and merges pull requests after ensuring GitHub checks pass, code works, and no security issues exist
- **devops** - DevOps agent that monitors errors across Railway, GitHub Actions, and AWS ECS, analyzes them, and creates GitHub issues with error logs, analysis, and recommended solutions
- **planner** - Planner agent that triages new GitHub issues, assesses whether they have enough detail to begin development, and either asks clarifying questions or marks them as ready for development

## Getting Started

1. Configure credentials: `npx al doctor`
2. Start all agents: `npx al start`

For more information, see [AGENTS.md](AGENTS.md)