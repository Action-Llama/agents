/**
 * Simple tests for Linear integration
 */

import { strict as assert } from 'assert';
import test from 'node:test';
import linearToken from '../credentials/linear-token.js';
import { LinearWebhookProvider } from '../webhooks/providers/linear.js';

test('Linear token credential has correct structure', () => {
    assert.equal(linearToken.id, 'linear_token');
    assert.equal(linearToken.label, 'Linear Personal API Token');
    assert(linearToken.fields);
    assert(linearToken.envVars);
    assert(typeof linearToken.validate === 'function');
});

test('Linear token validates correct format', async () => {
    const values = {
        token: 'lin_api_1234567890abcdef',
        workspace_url: 'https://acme.linear.app'
    };
    
    const result = await linearToken.validate(values);
    assert.equal(result, true);
});

test('Linear webhook provider can be instantiated', () => {
    const provider = new LinearWebhookProvider();
    assert.equal(provider.source, 'linear');
    assert(typeof provider.validateRequest === 'function');
    assert(typeof provider.parseEvent === 'function');
    assert(typeof provider.matchesFilter === 'function');
});

test('Linear webhook provider handles unsigned requests', () => {
    const provider = new LinearWebhookProvider();
    const result = provider.validateRequest({}, 'body', {});
    assert.equal(result, '_unsigned');
});

test('Linear webhook provider parses issue events', () => {
    const provider = new LinearWebhookProvider();
    const body = {
        type: 'Issue',
        action: 'create',
        data: {
            number: 42,
            title: 'Test Issue',
            url: 'https://linear.app/issue/42',
            creator: { email: 'test@example.com' }
        }
    };

    const result = provider.parseEvent({}, body);
    
    assert.equal(result.source, 'linear');
    assert.equal(result.event, 'Issue');
    assert.equal(result.action, 'create');
    assert.equal(result.number, 42);
    assert.equal(result.title, 'Test Issue');
    assert.equal(result.author, 'test@example.com');
});

console.log('All tests completed successfully!');