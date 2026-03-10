# Linear Integration Guide

This guide explains how to set up and use the Linear integration for Action-Llama agents.

## Overview

The Linear integration provides:
- **Multiple authentication methods**: OAuth2 (recommended) and personal API tokens
- **Webhook support**: Receive and process Linear webhook events  
- **Comprehensive filtering**: Filter by teams, projects, labels, assignees, priorities, and more
- **Cross-platform workflows**: Work with both Linear and GitHub issues

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure credentials**:
   ```bash
   npx al doctor
   ```
   
   Select "Linear OAuth2" (recommended) or "Linear Personal Token"

3. **Set up webhooks in Linear**:
   - Go to Settings → API → Webhooks
   - Create a new webhook pointing to your gateway URL
   - Set the webhook secret (use the same value from your credential configuration)

4. **Configure agents**:
   Add Linear webhook configuration to your agent's `agent-config.toml`:
   ```toml
   credentials = ["linear_oauth:default"]
   
   [[webhooks]]
   source = "linear"
   events = ["Issue", "Comment"]
   actions = ["create", "update"] 
   teams = ["engineering"]
   ```

## Authentication Methods

### OAuth2 (Recommended)

OAuth2 provides the most secure and flexible authentication:

1. **Create Linear OAuth Application**:
   - Go to Settings → API → Applications
   - Create a new application
   - Note the Client ID and Client Secret

2. **Configure credentials**:
   ```bash
   npx al doctor
   ```
   
   Select "Linear OAuth2" and provide:
   - Client ID
   - Client Secret  
   - Workspace URL (e.g., `https://acme.linear.app`)
   
   The setup will guide you through the OAuth authorization flow.

### Personal API Token

For simpler setups or testing:

1. **Generate token**:
   - Go to Settings → API → Personal API tokens
   - Create a new token with appropriate scopes

2. **Configure credentials**:
   ```bash
   npx al doctor
   ```
   
   Select "Linear Personal Token" and provide:
   - API token (starts with `lin_api_`)
   - Workspace URL

## Webhook Configuration

### Global Configuration

Add to your `config.toml`:

```toml
[webhooks.linear]
type = "linear"
credential = "linear-webhook-secret"  
```

### Agent Configuration

Add to your agent's `agent-config.toml`:

```toml
[[webhooks]]
source = "linear"
events = ["Issue", "Comment"]
actions = ["create", "update"]
teams = ["engineering", "product"]
projects = ["Sprint 1", "Roadmap"]
labels = ["ready-for-dev", "bug"]
assignee = "developer@company.com"
priorities = ["1", "2"]  # 1=Urgent, 2=High, 3=Medium, 4=Low, 0=No priority
```

## Supported Events

### Issue Events
- **create**: New issue created
- **update**: Issue updated (title, description, status, assignee, etc.)
- **remove**: Issue deleted

### Comment Events  
- **create**: New comment added to issue
- **update**: Comment edited
- **remove**: Comment deleted

### Other Events
- **Project**: Project created/updated/removed
- **Cycle**: Development cycle changes
- **ProjectUpdate**: Project status updates
- **IssueLabel**: Label changes

## Filtering Options

### Events
Filter by specific event types:
```toml
events = ["Issue", "Comment"]
```

### Actions
Filter by specific actions within events:
```toml
actions = ["create", "update"]
```

### Teams
Filter by Linear team names:
```toml
teams = ["engineering", "product", "design"]
```

### Projects
Filter by project names:
```toml
projects = ["Sprint 1", "Q1 Roadmap"]
```

### Labels
Filter by issue labels (any matching label will pass):
```toml
labels = ["ready-for-dev", "bug", "enhancement"]
```

### Assignee
Filter by assignee email:
```toml
assignee = "developer@company.com"
```

### Creator
Filter by issue creator email:
```toml
creator = "pm@company.com"
```

### Priorities
Filter by priority levels:
```toml
priorities = ["1", "2"]  # Urgent and High priority only
```

Priority levels:
- `0`: No priority
- `1`: Urgent  
- `2`: High
- `3`: Medium
- `4`: Low

## Agent Context

When webhooks trigger your agents, they receive context about the Linear event:

```json
{
  "source": "linear",
  "event": "Issue", 
  "action": "create",
  "number": 42,
  "title": "Implement new feature",
  "body": "Issue description...",
  "url": "https://linear.app/company/issue/ENG-42",
  "author": "creator@company.com",
  "assignee": "developer@company.com",
  "labels": ["ready-for-dev", "enhancement"],
  "team": "Engineering",
  "project": "Sprint 1", 
  "priority": "2",
  "state": "In Progress",
  "timestamp": "2026-03-10T19:13:12.000Z"
}
```

## Linear API Usage

Your agents can use the Linear GraphQL API with the configured credentials:

```javascript
const query = `
  query GetIssue($id: String!) {
    issue(id: $id) {
      id
      title
      description
      assignee {
        email
        name
      }
      labels {
        nodes {
          name
        }
      }
    }
  }
`;

const response = await fetch('https://api.linear.app/graphql', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.LINEAR_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query,
    variables: { id: 'issue-id' }
  })
});

const data = await response.json();
```

## Cross-Platform Workflows

You can configure agents to work with both Linear and GitHub:

```toml
[[webhooks]]
source = "linear"
events = ["Issue"]
teams = ["engineering"]

[[webhooks]] 
source = "github"
events = ["issues"]
actions = ["labeled"]
labels = ["ready-for-dev"]
```

This allows agents to:
- Pick up work from either Linear or GitHub
- Reference Linear issues in GitHub PRs
- Sync status between platforms
- Maintain unified development workflows

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL in Linear settings
2. Verify webhook secret matches your credential configuration
3. Check agent webhook filters are not too restrictive
4. Review Linear webhook delivery logs

### Authentication Errors

1. Verify credentials are correctly configured: `npx al doctor`
2. For OAuth: ensure access token is still valid (refresh if needed)
3. For Personal Token: check token has required scopes
4. Verify workspace URL is correct

### Agent Not Processing Events

1. Check agent webhook configuration filters
2. Verify agent is running and scaled appropriately  
3. Review agent logs for errors
4. Test with broader filter criteria

## API Documentation

- **Linear API**: https://developers.linear.app/docs/graphql/overview
- **Linear Webhooks**: https://developers.linear.app/docs/graphql/webhooks
- **OAuth Setup**: https://developers.linear.app/docs/oauth/authentication