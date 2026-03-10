import { createHmac, timingSafeEqual } from "crypto";

/**
 * Linear webhook provider
 * Based on action-llama's GitHub webhook provider pattern
 */

const MAX_TEXT_LENGTH = 4000;

function truncate(text, max = MAX_TEXT_LENGTH) {
    if (!text) return undefined;
    return text.length > max ? text.slice(0, max) + "..." : text;
}

export class LinearWebhookProvider {
    source = "linear";

    validateRequest(headers, rawBody, secrets) {
        // If no secrets configured, skip validation (allow unsigned webhooks)
        if (!secrets || Object.keys(secrets).length === 0) {
            return "_unsigned";
        }

        // Linear uses X-Linear-Signature header
        const signature = headers["x-linear-signature"];
        if (!signature) return null;

        // Try each configured secret — different teams/workspaces may use different secrets
        for (const [instanceName, secret] of Object.entries(secrets)) {
            const expected = createHmac("sha256", secret)
                .update(rawBody)
                .digest("hex");
                
            if (signature.length === expected.length && 
                timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
                return instanceName;
            }
        }

        return null;
    }

    parseEvent(headers, body) {
        // Linear webhook events have a "type" field indicating the event type
        const eventType = body.type;
        if (!eventType) return null;

        const action = body.action;
        const data = body.data;
        if (!data) return null;

        const base = {
            source: "linear",
            event: eventType,
            action: action,
            timestamp: new Date().toISOString(),
        };

        return this.extractContext(eventType, action, data, base);
    }

    extractContext(eventType, action, data, base) {
        switch (eventType) {
            case "Issue": {
                const issue = data;
                return {
                    ...base,
                    number: issue.number,
                    title: issue.title,
                    body: truncate(issue.description),
                    url: issue.url,
                    author: issue.creator?.email || issue.creator?.name,
                    assignee: issue.assignee?.email || issue.assignee?.name, 
                    labels: issue.labels?.nodes?.map(l => l.name) || [],
                    team: issue.team?.name,
                    project: issue.project?.name,
                    priority: issue.priority?.toString(),
                    state: issue.state?.name,
                };
            }

            case "Comment": {
                const comment = data;
                const issue = comment.issue;
                return {
                    ...base,
                    number: issue?.number,
                    title: issue?.title,
                    url: comment.url || issue?.url,
                    author: issue?.creator?.email || issue?.creator?.name,
                    comment: truncate(comment.body),
                    commentAuthor: comment.user?.email || comment.user?.name,
                    labels: issue?.labels?.nodes?.map(l => l.name) || [],
                    team: issue?.team?.name,
                    project: issue?.project?.name,
                };
            }

            case "Project": {
                const project = data;
                return {
                    ...base,
                    title: project.name,
                    body: truncate(project.description),
                    url: project.url,
                    author: project.creator?.email || project.creator?.name,
                    team: project.teams?.nodes?.[0]?.name,
                    state: project.state,
                };
            }

            case "Cycle": {
                const cycle = data;
                return {
                    ...base,
                    title: cycle.name,
                    body: truncate(cycle.description),
                    url: cycle.url,
                    team: cycle.team?.name,
                    startsAt: cycle.startsAt,
                    endsAt: cycle.endsAt,
                };
            }

            case "ProjectUpdate": {
                const update = data;
                const project = update.project;
                return {
                    ...base,
                    title: `${project?.name} - Update`,
                    body: truncate(update.body),
                    url: update.url,
                    author: update.user?.email || update.user?.name,
                    project: project?.name,
                };
            }

            case "IssueLabel": {
                const label = data;
                return {
                    ...base,
                    title: label.name,
                    body: truncate(label.description),
                    team: label.team?.name,
                };
            }

            default:
                // Return generic context for unknown event types
                return {
                    ...base,
                    title: action || eventType,
                };
        }
    }

    matchesFilter(context, filter) {
        const f = filter;

        if (f.events?.length && !f.events.includes(context.event)) {
            return false;
        }

        if (f.actions?.length && context.action && !f.actions.includes(context.action)) {
            return false;
        }

        // If filter specifies actions but event has no action, skip
        if (f.actions?.length && !context.action) {
            return false;
        }

        if (f.teams?.length && !f.teams.includes(context.team)) {
            return false;
        }

        if (f.projects?.length && !f.projects.includes(context.project)) {
            return false;
        }

        if (f.labels?.length) {
            const contextLabels = context.labels || [];
            const hasMatchingLabel = f.labels.some(l => contextLabels.includes(l));
            if (!hasMatchingLabel) return false;
        }

        if (f.assignee && context.assignee !== f.assignee) {
            return false;
        }

        if (f.creator && context.author !== f.creator) {
            return false;
        }

        if (f.priorities?.length && context.priority && !f.priorities.includes(context.priority)) {
            return false;
        }

        return true;
    }
}