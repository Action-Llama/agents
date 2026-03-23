# Repository Setup Checklist

This checklist helps repository administrators ensure all required configuration is in place for successful deployments.

## Required Repository Secrets

The following secrets **must** be configured for the deployment workflow to succeed:

### ✅ ANTHROPIC_API_KEY

- **Description**: Valid Anthropic API key for Claude models
- **Purpose**: Used by agents for AI model access
- **Setup**: 
  1. Obtain an API key from [Anthropic Console](https://console.anthropic.com/)
  2. Go to [Repository Secrets](https://github.com/Action-Llama/agents/settings/secrets/actions)
  3. Click "New repository secret"
  4. Name: `ANTHROPIC_API_KEY`
  5. Value: Your Anthropic API key (starts with `sk-ant-`)

### ✅ DEPLOY_SSH_KEY

- **Description**: SSH private key for deployment access
- **Purpose**: Used for pushing to production environments
- **Setup**:
  1. Generate SSH key pair: `ssh-keygen -t rsa -b 4096 -C "deploy@action-llama.com"`
  2. Add public key to deployment target
  3. Go to [Repository Secrets](https://github.com/Action-Llama/agents/settings/secrets/actions)
  4. Click "New repository secret"
  5. Name: `DEPLOY_SSH_KEY`
  6. Value: Private key content (including `-----BEGIN OPENSSH PRIVATE KEY-----`)

### ✅ DEPLOY_ENV_TOML

- **Description**: Production environment configuration
- **Purpose**: Contains deployment-specific settings
- **Setup**:
  1. Create production environment configuration file
  2. Go to [Repository Secrets](https://github.com/Action-Llama/agents/settings/secrets/actions)
  3. Click "New repository secret"
  4. Name: `DEPLOY_ENV_TOML`
  5. Value: TOML configuration content

## Optional Repository Variables

These variables can be configured to customize deployment behavior:

### 🔧 GIT_EMAIL (Optional)

- **Default**: `deploy@action-llama.com`
- **Purpose**: Email address for deployment commits
- **Setup**:
  1. Go to [Repository Variables](https://github.com/Action-Llama/agents/settings/variables/actions)
  2. Click "New repository variable"
  3. Name: `GIT_EMAIL`
  4. Value: Your preferred deployment email

### 🔧 GIT_NAME (Optional)

- **Default**: `Action Llama Deploy`
- **Purpose**: Name for deployment commits
- **Setup**:
  1. Go to [Repository Variables](https://github.com/Action-Llama/agents/settings/variables/actions)
  2. Click "New repository variable"
  3. Name: `GIT_NAME`
  4. Value: Your preferred deployment name

## Validation

After configuring secrets, validate your setup:

### Automated Validation

```bash
# Install dependencies if needed
npm install

# Run validation script
GITHUB_TOKEN=your_github_token node scripts/validate-secrets.js
```

### Manual Validation

1. Go to [Repository Secrets](https://github.com/Action-Llama/agents/settings/secrets/actions)
2. Verify all required secrets are listed:
   - ✅ ANTHROPIC_API_KEY
   - ✅ DEPLOY_SSH_KEY  
   - ✅ DEPLOY_ENV_TOML
3. Check that secret values are not empty
4. Test by triggering the deployment workflow

### Workflow Test

After configuration, test the deployment:

1. Push a commit to `main` branch, or
2. Manually trigger the deployment workflow:
   - Go to [Actions](https://github.com/Action-Llama/agents/actions)
   - Select "Deploy" workflow
   - Click "Run workflow"

## Troubleshooting

### Common Issues

**❌ "ANTHROPIC_API_KEY repository secret is not set or is empty"**
- Secret is missing or empty
- Solution: Add/update the ANTHROPIC_API_KEY secret

**❌ "SSH key authentication failed"**
- DEPLOY_SSH_KEY is invalid or missing
- Solution: Verify SSH key format and deployment target configuration

**❌ "Environment configuration invalid"**
- DEPLOY_ENV_TOML is malformed or missing
- Solution: Validate TOML syntax and required fields

**❌ "Permission denied" errors during validation**
- GitHub token lacks required permissions
- Solution: Use token with `repo` scope

### Getting Help

1. **Check workflow logs**: [Actions page](https://github.com/Action-Llama/agents/actions) shows detailed error messages
2. **Review documentation**: See [README.md](./README.md) for detailed setup information
3. **Validate configuration**: Use the validation script to check secret configuration
4. **Repository access**: Ensure you have admin access to configure secrets

## Security Notes

- **Never commit secrets** to the repository
- **Use minimum required permissions** for API keys and SSH keys
- **Rotate secrets regularly** according to your security policy
- **Monitor secret usage** through workflow logs and audit trails

---

✅ **Setup Complete**: When all required secrets are configured and validation passes, your repository is ready for automated deployment!