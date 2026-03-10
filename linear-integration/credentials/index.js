/**
 * Linear credential types registry
 */

import linearToken from './linear-token.js';
import linearOauth from './linear-oauth.js'; 
import linearWebhookSecret from './linear-webhook-secret.js';

export const linearCredentials = {
    "linear_token": linearToken,
    "linear_oauth": linearOauth,
    "linear_webhook_secret": linearWebhookSecret,
};

export { linearToken, linearOauth, linearWebhookSecret };