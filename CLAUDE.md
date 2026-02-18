# Gmail MCP Server

MCP server for Gmail using Google's official Gmail API with OAuth 2.0 authentication.

## Tech Stack

- TypeScript / Node.js 18+
- MCP SDK (@modelcontextprotocol/sdk)
- Google APIs (googleapis)
- OAuth 2.0 authentication

## Available Tools (19 total)

### Email Operations
- `gmail_search` - Search emails using Gmail query syntax
- `gmail_get_message` - Get full email content by ID
- `gmail_send` - Send an email (with CC, BCC, threading support)
- `gmail_get_thread` - Get all messages in a thread
- `gmail_get_profile` - Get user's Gmail profile

### Drafts
- `gmail_create_draft` - Create a draft email
- `gmail_list_drafts` - List all drafts
- `gmail_send_draft` - Send an existing draft
- `gmail_delete_draft` - Delete a draft

### Labels
- `gmail_list_labels` - List all labels
- `gmail_create_label` - Create a new label
- `gmail_delete_label` - Delete a label
- `gmail_modify_labels` - Add/remove labels from email

### Message Management
- `gmail_trash` - Move email to trash
- `gmail_untrash` - Remove from trash
- `gmail_mark_read` - Mark as read
- `gmail_mark_unread` - Mark as unread

### Attachments
- `gmail_list_attachments` - List attachments in email
- `gmail_get_attachment` - Download attachment (base64)

## Setup

```bash
# Install & build
npm install && npm run build

# Create config directory
mkdir -p ~/.gmail-mcp

# Add Google OAuth credentials (from Google Cloud Console)
cp /path/to/downloaded-credentials.json ~/.gmail-mcp/credentials.json

# Authenticate (opens browser)
npm run auth

# Add to Claude Code
claude mcp add gmail -- node ~/personal-projects/gmail-mcp-server/dist/index.js
```

## Gmail Search Syntax

```
from:example@gmail.com    # From specific sender
subject:meeting           # Subject contains "meeting"
is:unread                 # Unread emails
has:attachment            # Has attachments
after:2024/01/01          # After date
label:work                # Has label
```

## File Locations

- Credentials: `~/.gmail-mcp/credentials.json`
- Auth token: `~/.gmail-mcp/token.json`

## Key Files

- `src/index.ts` - MCP server and tool definitions
- `src/gmail.ts` - Gmail API client
- `src/auth.ts` / `src/auth-cli.ts` - OAuth authentication
