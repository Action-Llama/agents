# Changelog

## [1.1.0] - 2026-03-10

### Added

- **Linear Integration**: Complete Linear webhook and credential support
  - `linear_token`: Personal API token authentication
  - `linear_oauth`: OAuth2 authentication (recommended)
  - `linear_webhook_secret`: Webhook signature verification
  - Linear webhook events for Issues, Comments, Projects, and more
  - Comprehensive filtering by teams, projects, labels, assignees, and priorities
  - Cross-platform workflow support (Linear + GitHub)

### Features

- **Multiple authentication methods**: Support for both OAuth2 and personal API tokens
- **Organization-level webhooks**: Single endpoint for all Linear webhook events
- **Advanced filtering**: Filter Linear events by teams, projects, labels, assignee, creator, and priority
- **Full Linear API integration**: Access to Linear GraphQL API with configured credentials
- **Comprehensive documentation**: Setup guides, API reference, and troubleshooting

### Files Added

- `linear-integration/`: Complete Linear integration package
- `linear-agent/`: Example Linear-enabled agent configuration
- `docs/linear-integration.md`: Comprehensive setup and usage documentation

### Configuration

- Updated `config.toml` with Linear webhook support
- Added example Linear agent configuration in `linear-agent/agent-config.toml`
- Created Linear integration documentation

### Testing

- Added comprehensive test suite for Linear credentials and webhook providers
- Validated OAuth2 and personal token authentication flows
- Tested webhook event parsing and filtering

This feature enables Action-Llama agents to work seamlessly with Linear workspaces, providing the same powerful automation capabilities available for GitHub issues.