/**
 * Linear personal API token credential type
 * Based on action-llama's github-token.js pattern
 */

const linearToken = {
    id: "linear_token", 
    label: "Linear Personal API Token",
    description: "Personal API token for Linear workspace access",
    helpUrl: "https://linear.app/settings/api",
    fields: [
        { 
            name: "token", 
            label: "Personal API Token", 
            description: "Linear personal API token (lin_api_...)", 
            secret: true 
        },
        {
            name: "workspace_url",
            label: "Workspace URL", 
            description: "Your Linear workspace URL (e.g., https://acme.linear.app)",
            secret: false
        }
    ],
    envVars: { 
        token: "LINEAR_API_TOKEN",
        workspace_url: "LINEAR_WORKSPACE_URL"
    },
    agentContext: "`LINEAR_API_TOKEN` and `LINEAR_WORKSPACE_URL` — use Linear API directly",
    
    async validate(values) {
        // Basic format validation for Linear API token
        if (!values.token || !values.token.startsWith('lin_api_')) {
            throw new Error('Linear API token must start with "lin_api_"');
        }
        
        if (!values.workspace_url || !values.workspace_url.startsWith('https://')) {
            throw new Error('Linear workspace URL must be a valid HTTPS URL');
        }

        // TODO: Add actual API validation call to Linear
        // For now, we'll just validate the format
        return true;
    },
};

export default linearToken;