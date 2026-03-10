/**
 * Linear webhook secret credential type  
 * Based on action-llama's github-webhook-secret.js pattern
 */

const linearWebhookSecret = {
    id: "linear_webhook_secret",
    label: "Linear Webhook Secret",
    description: "Shared secret for verifying Linear webhook payloads. Generate any random string, then paste it here AND in your Linear webhook settings (Settings → API → Webhooks → Secret).",
    helpUrl: "https://developers.linear.app/docs/graphql/webhooks",
    fields: [
        { 
            name: "secret", 
            label: "Webhook Secret", 
            description: "Set this same value in your Linear webhook settings", 
            secret: true 
        },
    ],
    // No envVars or agentContext — used by the gateway, not injected into agents
};

export default linearWebhookSecret;