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

## Development Commands

```bash
npm run build        # Compile TypeScript (tsc)
npm run dev          # Build + run server (tsc && node dist/index.js)
npm start            # Run compiled server (node dist/index.js)
npm run auth         # Interactive OAuth flow (opens browser, saves token)
```

No test framework is configured. Manual testing via Claude Code MCP integration.

## Architecture

### Server Pattern
- **Entry point**: `src/index.ts` -- MCP server with stdio transport
- **API client**: `src/gmail.ts` -- `GmailClient` class wrapping `googleapis` Gmail v1 SDK
- **Auth layer**: `src/auth.ts` -- OAuth2 credential/token management, token auto-refresh
- **Auth CLI**: `src/auth-cli.ts` -- Interactive browser-based OAuth flow (local HTTP callback server on port 3000)

### Request Flow
1. `index.ts` registers `ListToolsRequest` and `CallToolRequest` handlers
2. Tool calls go through `ensureClient()` which lazy-initializes the `GmailClient` (loads credentials + token, refreshes if expired)
3. Each tool case in the `switch` delegates to `GmailClient` methods
4. Results returned as `{ content: [{ type: "text", text: JSON.stringify(result) }] }`
5. Errors caught at the top-level try/catch, returned with `isError: true`

### Email Body Parsing
`getMessageContent()` in `gmail.ts` extracts body from MIME parts: prefers `text/plain`, falls back to `text/html`, handles both single-part and multipart messages.

### Email Composition
`sendEmail()` constructs raw RFC 2822 messages with MIME boundaries for attachments, base64url-encodes them for the Gmail API.

## Conventions

- TypeScript with ES modules (`"type": "module"` in package.json)
- All Gmail API calls use `userId: "me"` (authenticated user)
- Tool definitions are inline objects in `index.ts` with `as const` type assertions on schema types
- Tool arguments are cast with `as { ... }` inline type assertions (no zod/validation library)
- Config directory: `~/.gmail-mcp/` (overridable via `GMAIL_MCP_CONFIG_DIR` env var)
- Token auto-refresh: checks `expiry_date` and calls `refreshAccessToken()` transparently
- Success messages for mutating operations return human-readable strings (e.g., "Email sent successfully")
- Read operations return `JSON.stringify(result, null, 2)` for structured data
- No runtime dependencies beyond MCP SDK and googleapis
- Diagnostic logs go to `console.error` (stderr), keeping stdout clean for MCP stdio transport

## Key Files

- `src/index.ts` - MCP server, tool definitions, and request routing (single switch statement)
- `src/gmail.ts` - `GmailClient` class: all Gmail API operations (search, send, drafts, labels, threads, attachments)
- `src/auth.ts` - OAuth2 credential loading, token persistence, auto-refresh, config dir management
- `src/auth-cli.ts` - Interactive authentication CLI (browser OAuth + local callback server)
