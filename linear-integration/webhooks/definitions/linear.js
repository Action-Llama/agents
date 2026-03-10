/**
 * Linear webhook definition
 * Based on action-llama's github webhook definition pattern
 */

export const linear = {
    id: "linear",
    label: "Linear", 
    description: "Linear webhook events",
    secretCredential: "linear_webhook_secret",
    filterSpec: [
        {
            field: "events",
            label: "Events",
            type: "multi-select",
            required: true,
            options: [
                { value: "Issue", label: "Issues" },
                { value: "Comment", label: "Comments" }, 
                { value: "Project", label: "Projects" },
                { value: "Cycle", label: "Cycles" },
                { value: "ProjectUpdate", label: "Project Updates" },
                { value: "IssueLabel", label: "Issue Labels" },
            ],
        },
        {
            field: "actions", 
            label: "Actions",
            type: "multi-select",
            options: [
                { value: "create", label: "Created" },
                { value: "update", label: "Updated" },
                { value: "remove", label: "Removed" },
            ],
        },
        { 
            field: "teams", 
            label: "Teams", 
            type: "text[]" 
        },
        { 
            field: "projects", 
            label: "Projects", 
            type: "text[]" 
        },
        { 
            field: "labels", 
            label: "Labels", 
            type: "text[]" 
        },
        { 
            field: "assignee", 
            label: "Assignee", 
            type: "text" 
        },
        { 
            field: "creator", 
            label: "Creator", 
            type: "text" 
        },
        {
            field: "priorities",
            label: "Priorities", 
            type: "multi-select",
            options: [
                { value: "0", label: "No priority" },
                { value: "1", label: "Urgent" }, 
                { value: "2", label: "High" },
                { value: "3", label: "Medium" },
                { value: "4", label: "Low" },
            ],
        },
    ],
};