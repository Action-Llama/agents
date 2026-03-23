# Action-Llama Agents

This repository contains Action-Llama agents and their deployment configuration.

## Setup Requirements

### Repository Secrets

Before the deployment workflow can run successfully, the following repository secrets must be configured in GitHub:

1. **ANTHROPIC_API_KEY** ⚠️ **Required**
   - Valid Anthropic API key for Claude models
   - Used by agents for AI model access
   - Set at: https://github.com/Action-Llama/agents/settings/secrets/actions

2. **DEPLOY_SSH_KEY** ⚠️ **Required**
   - SSH private key for deployment access
   - Used for pushing to production environments
   - Set at: https://github.com/Action-Llama/agents/settings/secrets/actions

3. **DEPLOY_ENV_TOML** ⚠️ **Required**
   - Production environment configuration
   - Contains deployment-specific settings
   - Set at: https://github.com/Action-Llama/agents/settings/secrets/actions

### Repository Variables (Optional)

- **GIT_EMAIL**: Email for Git commits (defaults to deploy@action-llama.com)
- **GIT_NAME**: Name for Git commits (defaults to Action Llama Deploy)

## Development

### Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure local Action-Llama environment:
   ```bash
   # Set up credentials directory
   mkdir -p ~/.action-llama/credentials
   
   # Add your Anthropic API key
   echo '{"type":"anthropic_key","key":"your-api-key-here"}' > ~/.action-llama/credentials/anthropic_key.json
   
   # Add GitHub token if needed
   echo '{"type":"github_token","token":"your-github-token"}' > ~/.action-llama/credentials/github_token.json
   ```

### Agent Configuration

Agents are configured in the `agents/` directory. See the Action-Llama documentation for details on creating and configuring agents.

## Deployment

The deployment workflow runs automatically on pushes to `main`. It:

1. Validates all required secrets are configured
2. Sets up the Action-Llama environment
3. Deploys agents to the production environment

### Troubleshooting Deployment

**"ANTHROPIC_API_KEY secret not set"**: This means the required repository secret is missing. Repository administrators need to:
1. Go to [Repository Secrets](https://github.com/Action-Llama/agents/settings/secrets/actions)
2. Add the `ANTHROPIC_API_KEY` secret with a valid Anthropic API key
3. Re-run the deployment

**SSH/Deployment failures**: Check that `DEPLOY_SSH_KEY` and `DEPLOY_ENV_TOML` secrets are properly configured.

## CI/CD

The repository uses GitHub Actions for:
- **Deploy** (.github/workflows/deploy.yml): Automated deployment to production
- Secret validation ensures all required credentials are available before deployment

## Contributing

When adding new agents or modifying the configuration:
1. Test locally with your own credentials
2. Ensure the deployment workflow validates any new required secrets
3. Update this README if new setup requirements are added

## Support

For issues with:
- **Missing secrets**: Contact repository administrators
- **Agent development**: See Action-Llama documentation
- **Deployment issues**: Check workflow logs and ensure secrets are configured