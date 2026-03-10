# Linear-Enabled Developer Agent

This agent is configured to work with both Linear and GitHub issues, providing cross-platform development workflow support.

## Features

- **Linear Integration**: Responds to Linear webhook events for issues and comments
- **GitHub Integration**: Continues to support GitHub issue workflows
- **Cross-platform Sync**: Can work on issues from either platform

## Webhook Triggers

### Linear
- **Issue events**: `create`, `update` actions
- **Comment events**: `create`, `update` actions 
- **Filtering**: Teams (engineering, product), Labels (ready-for-dev, bug, enhancement)

### GitHub  
- **Issue events**: `labeled` actions
- **Filtering**: Labels (ready-for-dev)

## Credentials

- `linear_oauth:default` - Linear OAuth2 credentials for API access
- `github_token:proggy-al` - GitHub token for repository operations
- `git_ssh:default` - SSH key for git operations

## Environment

When triggered, this agent has access to:
- `LINEAR_ACCESS_TOKEN` and `LINEAR_WORKSPACE_URL` - For Linear API calls
- `GITHUB_TOKEN` / `GH_TOKEN` - For GitHub operations via `gh` CLI
- Git SSH configuration for repository cloning/pushing

## Workflow

1. **Linear Trigger**: Receives Linear webhook when issues/comments are created/updated
2. **GitHub Trigger**: Receives GitHub webhook when issues are labeled with "ready-for-dev"
3. **Implementation**: Uses appropriate APIs based on trigger source
4. **Cross-platform**: Can reference Linear issues from GitHub PRs and vice versa

## Linear API Usage

Use the Linear API with the provided credentials:

```javascript
const response = await fetch('https://api.linear.app/graphql', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.LINEAR_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `
      query {
        issues(first: 10) {
          nodes {
            id
            title
            description
          }
        }
      }
    `
  })
});
```