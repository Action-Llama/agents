# Linear Integration for Action-Llama

This package provides Linear integration for Action-Llama agents, including credentials and webhook support.

## Features

- **Multiple authentication methods**:
  - `linear_token`: Personal API tokens
  - `linear_oauth`: OAuth2 authentication (recommended)
- **Webhook support**: Receive and process Linear webhook events
- **Comprehensive filtering**: Filter by teams, projects, labels, assignees, and more

## Credential Types

### linear_token
Personal API token for Linear workspace access.
- **Fields**: `token`, `workspace_url`
- **Usage**: Direct API access with personal token

### linear_oauth  
OAuth2 application credentials for Linear workspace access (recommended).
- **Fields**: `client_id`, `client_secret`, `access_token`, `refresh_token`, `workspace_url`
- **Usage**: OAuth2 flow with automatic token refresh

### linear_webhook_secret
Shared secret for verifying Linear webhook payloads.
- **Fields**: `secret`
- **Usage**: Webhook signature verification

## Webhook Events

Supports all Linear webhook events:
- **Issue**: Issue created, updated, removed
- **Comment**: Comments on issues  
- **Project**: Project updates
- **Cycle**: Development cycle changes
- **ProjectUpdate**: Project status updates
- **IssueLabel**: Label changes

## Configuration

Add to your `config.toml`:

```toml
[webhooks.linear]
type = "linear"
credential = "linear-webhook-secret"
```

Add to agent `agent-config.toml`:

```toml
credentials = ["linear_oauth:default"]

[[webhooks]]
source = "linear"
events = ["Issue", "Comment"]
actions = ["create", "update"]
teams = ["engineering"]
```

## Setup

1. Configure Linear credentials: `npx al doctor`
2. Select Linear OAuth2 or Personal Token
3. Set up webhooks in Linear: Settings → API → Webhooks
4. Use the webhook secret from your credentials

## API Reference

See Linear API documentation: https://developers.linear.app/