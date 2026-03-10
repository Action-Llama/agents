/**
 * Linear OAuth2 credential type
 * Based on action-llama's oauth patterns
 */

const linearOauth = {
    id: "linear_oauth",
    label: "Linear OAuth2", 
    description: "OAuth2 application credentials for Linear workspace access (recommended)",
    helpUrl: "https://developers.linear.app/docs/oauth/authentication",
    fields: [
        {
            name: "client_id",
            label: "Client ID",
            description: "OAuth application client ID from Linear",
            secret: false
        },
        {
            name: "client_secret", 
            label: "Client Secret",
            description: "OAuth application client secret from Linear",
            secret: true
        },
        {
            name: "access_token",
            label: "Access Token", 
            description: "OAuth access token (obtained through authorization flow)",
            secret: true
        },
        {
            name: "refresh_token",
            label: "Refresh Token",
            description: "OAuth refresh token for token renewal", 
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
        client_id: "LINEAR_CLIENT_ID",
        client_secret: "LINEAR_CLIENT_SECRET", 
        access_token: "LINEAR_ACCESS_TOKEN",
        refresh_token: "LINEAR_REFRESH_TOKEN",
        workspace_url: "LINEAR_WORKSPACE_URL"
    },
    agentContext: "`LINEAR_ACCESS_TOKEN` and `LINEAR_WORKSPACE_URL` — use Linear API with OAuth2",
    
    async validate(values) {
        // Validate required OAuth fields
        if (!values.client_id) {
            throw new Error('Linear OAuth client ID is required');
        }
        
        if (!values.client_secret) {
            throw new Error('Linear OAuth client secret is required');
        }
        
        if (!values.access_token) {
            throw new Error('Linear OAuth access token is required');
        }
        
        if (!values.workspace_url || !values.workspace_url.startsWith('https://')) {
            throw new Error('Linear workspace URL must be a valid HTTPS URL');
        }

        // TODO: Add actual API validation call to Linear to verify token
        return true;
    },
};

export default linearOauth;