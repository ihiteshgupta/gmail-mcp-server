#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getAuthenticatedClient, isAuthenticated, getConfigDir } from "./auth.js";
import { GmailClient } from "./gmail.js";

// Tool definitions
const tools = [
  {
    name: "gmail_search",
    description:
      "Search for emails using Gmail search syntax. Supports queries like 'from:example@gmail.com', 'subject:meeting', 'is:unread', 'after:2024/01/01', etc.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Gmail search query (e.g., 'from:boss@company.com is:unread')",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "gmail_get_message",
    description: "Get the full content of a specific email by its ID",
    inputSchema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the email message",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "gmail_send",
    description: "Send an email",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: {
          type: "string",
          description: "Recipient email address",
        },
        subject: {
          type: "string",
          description: "Email subject",
        },
        body: {
          type: "string",
          description: "Email body (plain text)",
        },
        cc: {
          type: "string",
          description: "CC recipients (comma-separated)",
        },
        bcc: {
          type: "string",
          description: "BCC recipients (comma-separated)",
        },
        threadId: {
          type: "string",
          description: "Thread ID to reply to (for threading)",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "gmail_create_draft",
    description: "Create a draft email",
    inputSchema: {
      type: "object" as const,
      properties: {
        to: {
          type: "string",
          description: "Recipient email address",
        },
        subject: {
          type: "string",
          description: "Email subject",
        },
        body: {
          type: "string",
          description: "Email body (plain text)",
        },
        cc: {
          type: "string",
          description: "CC recipients (comma-separated)",
        },
        bcc: {
          type: "string",
          description: "BCC recipients (comma-separated)",
        },
        threadId: {
          type: "string",
          description: "Thread ID to reply to (for threading)",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "gmail_list_drafts",
    description: "List all draft emails",
    inputSchema: {
      type: "object" as const,
      properties: {
        maxResults: {
          type: "number",
          description: "Maximum number of drafts to return (default: 10)",
        },
      },
    },
  },
  {
    name: "gmail_send_draft",
    description: "Send an existing draft",
    inputSchema: {
      type: "object" as const,
      properties: {
        draftId: {
          type: "string",
          description: "The ID of the draft to send",
        },
      },
      required: ["draftId"],
    },
  },
  {
    name: "gmail_delete_draft",
    description: "Delete a draft email",
    inputSchema: {
      type: "object" as const,
      properties: {
        draftId: {
          type: "string",
          description: "The ID of the draft to delete",
        },
      },
      required: ["draftId"],
    },
  },
  {
    name: "gmail_trash",
    description: "Move an email to trash",
    inputSchema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the email to trash",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "gmail_untrash",
    description: "Remove an email from trash",
    inputSchema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the email to untrash",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "gmail_mark_read",
    description: "Mark an email as read",
    inputSchema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the email to mark as read",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "gmail_mark_unread",
    description: "Mark an email as unread",
    inputSchema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the email to mark as unread",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "gmail_modify_labels",
    description: "Add or remove labels from an email",
    inputSchema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the email",
        },
        addLabels: {
          type: "array",
          items: { type: "string" },
          description: "Label IDs to add",
        },
        removeLabels: {
          type: "array",
          items: { type: "string" },
          description: "Label IDs to remove",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "gmail_list_labels",
    description: "List all labels in the mailbox",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "gmail_create_label",
    description: "Create a new label",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Name for the new label",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "gmail_delete_label",
    description: "Delete a label",
    inputSchema: {
      type: "object" as const,
      properties: {
        labelId: {
          type: "string",
          description: "The ID of the label to delete",
        },
      },
      required: ["labelId"],
    },
  },
  {
    name: "gmail_get_thread",
    description: "Get all messages in an email thread",
    inputSchema: {
      type: "object" as const,
      properties: {
        threadId: {
          type: "string",
          description: "The ID of the thread",
        },
      },
      required: ["threadId"],
    },
  },
  {
    name: "gmail_list_attachments",
    description: "List all attachments in an email",
    inputSchema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the email",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "gmail_get_attachment",
    description: "Download an attachment from an email (returns base64 encoded data)",
    inputSchema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the email",
        },
        attachmentId: {
          type: "string",
          description: "The ID of the attachment",
        },
      },
      required: ["messageId", "attachmentId"],
    },
  },
  {
    name: "gmail_get_profile",
    description: "Get the user's Gmail profile (email address, total messages, etc.)",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

async function main() {
  const server = new Server(
    {
      name: "gmail-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Check authentication status
  let gmailClient: GmailClient | null = null;

  const ensureClient = async (): Promise<GmailClient> => {
    if (gmailClient) return gmailClient;

    const auth = await getAuthenticatedClient();
    if (!auth) {
      throw new Error(
        `Not authenticated. Please run 'npm run auth' in ${process.cwd()} to authenticate, or ensure credentials.json is in ${getConfigDir()}`
      );
    }

    gmailClient = new GmailClient(auth);
    return gmailClient;
  };

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const client = await ensureClient();

      switch (name) {
        case "gmail_search": {
          const { query, maxResults } = args as {
            query: string;
            maxResults?: number;
          };
          const results = await client.searchEmails(query, maxResults || 10);
          return {
            content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
          };
        }

        case "gmail_get_message": {
          const { messageId } = args as { messageId: string };
          const message = await client.getMessageContent(messageId);
          return {
            content: [{ type: "text", text: JSON.stringify(message, null, 2) }],
          };
        }

        case "gmail_send": {
          const { to, subject, body, cc, bcc, threadId } = args as {
            to: string;
            subject: string;
            body: string;
            cc?: string;
            bcc?: string;
            threadId?: string;
          };
          const result = await client.sendEmail({
            to,
            subject,
            body,
            cc,
            bcc,
            threadId,
          });
          return {
            content: [
              {
                type: "text",
                text: `Email sent successfully. Message ID: ${result.id}`,
              },
            ],
          };
        }

        case "gmail_create_draft": {
          const { to, subject, body, cc, bcc, threadId } = args as {
            to: string;
            subject: string;
            body: string;
            cc?: string;
            bcc?: string;
            threadId?: string;
          };
          const result = await client.createDraft({
            to,
            subject,
            body,
            cc,
            bcc,
            threadId,
          });
          return {
            content: [
              {
                type: "text",
                text: `Draft created successfully. Draft ID: ${result.id}`,
              },
            ],
          };
        }

        case "gmail_list_drafts": {
          const { maxResults } = args as { maxResults?: number };
          const drafts = await client.listDrafts(maxResults || 10);
          return {
            content: [{ type: "text", text: JSON.stringify(drafts, null, 2) }],
          };
        }

        case "gmail_send_draft": {
          const { draftId } = args as { draftId: string };
          const result = await client.sendDraft(draftId);
          return {
            content: [
              {
                type: "text",
                text: `Draft sent successfully. Message ID: ${result.id}`,
              },
            ],
          };
        }

        case "gmail_delete_draft": {
          const { draftId } = args as { draftId: string };
          await client.deleteDraft(draftId);
          return {
            content: [{ type: "text", text: "Draft deleted successfully." }],
          };
        }

        case "gmail_trash": {
          const { messageId } = args as { messageId: string };
          await client.trashMessage(messageId);
          return {
            content: [{ type: "text", text: "Email moved to trash." }],
          };
        }

        case "gmail_untrash": {
          const { messageId } = args as { messageId: string };
          await client.untrashMessage(messageId);
          return {
            content: [{ type: "text", text: "Email removed from trash." }],
          };
        }

        case "gmail_mark_read": {
          const { messageId } = args as { messageId: string };
          await client.markAsRead(messageId);
          return {
            content: [{ type: "text", text: "Email marked as read." }],
          };
        }

        case "gmail_mark_unread": {
          const { messageId } = args as { messageId: string };
          await client.markAsUnread(messageId);
          return {
            content: [{ type: "text", text: "Email marked as unread." }],
          };
        }

        case "gmail_modify_labels": {
          const { messageId, addLabels, removeLabels } = args as {
            messageId: string;
            addLabels?: string[];
            removeLabels?: string[];
          };
          await client.modifyLabels(messageId, addLabels, removeLabels);
          return {
            content: [{ type: "text", text: "Labels modified successfully." }],
          };
        }

        case "gmail_list_labels": {
          const labels = await client.listLabels();
          return {
            content: [{ type: "text", text: JSON.stringify(labels, null, 2) }],
          };
        }

        case "gmail_create_label": {
          const { name: labelName } = args as { name: string };
          const label = await client.createLabel(labelName);
          return {
            content: [
              {
                type: "text",
                text: `Label created successfully. ID: ${label.id}`,
              },
            ],
          };
        }

        case "gmail_delete_label": {
          const { labelId } = args as { labelId: string };
          await client.deleteLabel(labelId);
          return {
            content: [{ type: "text", text: "Label deleted successfully." }],
          };
        }

        case "gmail_get_thread": {
          const { threadId } = args as { threadId: string };
          const thread = await client.getThread(threadId);
          return {
            content: [{ type: "text", text: JSON.stringify(thread, null, 2) }],
          };
        }

        case "gmail_list_attachments": {
          const { messageId } = args as { messageId: string };
          const attachments = await client.listAttachments(messageId);
          return {
            content: [
              { type: "text", text: JSON.stringify(attachments, null, 2) },
            ],
          };
        }

        case "gmail_get_attachment": {
          const { messageId, attachmentId } = args as {
            messageId: string;
            attachmentId: string;
          };
          const data = await client.getAttachment(messageId, attachmentId);
          return {
            content: [
              {
                type: "text",
                text: `Attachment data (base64): ${data.substring(0, 100)}...`,
              },
            ],
          };
        }

        case "gmail_get_profile": {
          const profile = await client.getProfile();
          return {
            content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gmail MCP Server running on stdio");
}

main().catch(console.error);
