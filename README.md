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

**"ANTHROPIC_API_KEY secret not set"**: This means the required repository secret is missing. Repository administrators should:
1. **Quick fix**: Run the interactive setup assistant: `GITHUB_TOKEN=your_token npm run setup`
2. **Manual setup**: Follow the [Setup Checklist](./SETUP-CHECKLIST.md) for detailed instructions
3. **Validation**: Run validation tools after setup:
   - `npm run test-workflow` - Test workflow setup
   - `GITHUB_TOKEN=your_token npm run validate-secrets` - Validate repository secrets
4. Re-run the deployment after fixing any issues

**SSH/Deployment failures**: Check that `DEPLOY_SSH_KEY` and `DEPLOY_ENV_TOML` secrets are properly configured using the setup checklist.

**Testing without full setup**: Use dry-run mode to test the workflow when secrets are missing:
- Commit with "dry-run" in the commit message, OR
- Manually run the workflow and check "Run in dry-run mode"

### Setup Validation

Before deploying, validate that all secrets are configured correctly:

```bash
# Interactive setup assistant (recommended for first-time setup)
GITHUB_TOKEN=your_github_token npm run setup

# Test local workflow setup
npm run test-workflow

# Validate repository secrets (requires GitHub token with repo scope)
GITHUB_TOKEN=your_github_token npm run validate-secrets
```

**Dry-run mode**: Test the deployment workflow without all secrets configured:
```bash
# Option 1: Commit with dry-run in the message
git commit -m "test: dry-run workflow validation"

# Option 2: Manually trigger workflow with dry-run enabled
# Go to Actions → Deploy → Run workflow → Check "Run in dry-run mode"
```

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