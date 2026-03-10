/**
 * Linear integration for Action-Llama
 * 
 * This package extends action-llama with Linear credentials and webhook support.
 * 
 * Provides:
 * - linear_token: Personal API token authentication
 * - linear_oauth: OAuth2 authentication (recommended)  
 * - linear_webhook_secret: Webhook signature verification
 * - Linear webhook definitions and providers
 */

import { linearCredentials } from './credentials/index.js';
import { linearWebhookDefinition, LinearWebhookProvider } from './webhooks/index.js';

export {
    linearCredentials,
    linearWebhookDefinition, 
    LinearWebhookProvider
};

// Main integration object for easy consumption
export const linearIntegration = {
    credentials: linearCredentials,
    webhookDefinition: linearWebhookDefinition,
    webhookProvider: LinearWebhookProvider,
};

export default linearIntegration;