# Gmail MCP Server

A Model Context Protocol (MCP) server for Gmail using Google's official Gmail API.

## Prerequisites

- Node.js 18+
- A Google Cloud project with Gmail API enabled
- OAuth 2.0 credentials

## Setup

### 1. Create Google Cloud Project & Enable Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" (or "Internal" for Workspace)
   - Fill in app name, user support email
   - Add scopes: `gmail.readonly`, `gmail.send`, `gmail.compose`, `gmail.modify`, `gmail.labels`
   - Add your email as a test user
4. Create OAuth client ID:
   - Application type: "Desktop app"
   - Name: "Gmail MCP Server"
5. Download the JSON file

### 3. Install & Configure

```bash
cd gmail-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Create config directory and add credentials
mkdir -p ~/.gmail-mcp
cp /path/to/downloaded-credentials.json ~/.gmail-mcp/credentials.json

# Authenticate
# For desktop (opens browser automatically):
npm run auth

# For headless server (manual code entry):
npm run auth:headless
```

### 4. Register with Claude Code

```bash
claude mcp add --scope user --transport stdio gmail -- node /Users/hitesh.gupta/gmail-mcp-server/dist/index.js
```

Or add manually to your Claude Code config:

```json
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": ["/Users/hitesh.gupta/gmail-mcp-server/dist/index.js"]
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `gmail_search` | Search emails using Gmail query syntax |
| `gmail_get_message` | Get full email content by ID |
| `gmail_send` | Send an email |
| `gmail_create_draft` | Create a draft email |
| `gmail_list_drafts` | List all drafts |
| `gmail_send_draft` | Send an existing draft |
| `gmail_delete_draft` | Delete a draft |
| `gmail_trash` | Move email to trash |
| `gmail_untrash` | Remove email from trash |
| `gmail_mark_read` | Mark email as read |
| `gmail_mark_unread` | Mark email as unread |
| `gmail_modify_labels` | Add/remove labels |
| `gmail_list_labels` | List all labels |
| `gmail_create_label` | Create a new label |
| `gmail_delete_label` | Delete a label |
| `gmail_get_thread` | Get all messages in a thread |
| `gmail_list_attachments` | List attachments in an email |
| `gmail_get_attachment` | Download attachment (base64) |
| `gmail_get_profile` | Get user's Gmail profile |

## Gmail Search Syntax Examples

```
from:example@gmail.com          # From specific sender
to:me                           # Sent to you
subject:meeting                 # Subject contains "meeting"
is:unread                       # Unread emails
is:starred                      # Starred emails
has:attachment                  # Has attachments
after:2024/01/01                # After date
before:2024/12/31               # Before date
label:work                      # Has label
in:inbox                        # In inbox
in:sent                         # In sent folder
```

Combine with AND/OR:
```
from:boss@company.com is:unread
subject:urgent OR subject:important
from:client@example.com has:attachment after:2024/06/01
```

## File Locations

- Credentials: `~/.gmail-mcp/credentials.json`
- Auth token: `~/.gmail-mcp/token.json`

## Troubleshooting

**"Not authenticated" error:**
```bash
# Desktop (with browser):
npm run auth

# Headless server (no browser):
npm run auth:headless
```

**"Credentials not found" error:**
Ensure `credentials.json` is in `~/.gmail-mcp/`

**Token expired:**
Delete `~/.gmail-mcp/token.json` and run `npm run auth` (or `npm run auth:headless`) again

**Running on headless server:**
Use `npm run auth:headless`, copy the URL to a browser on any machine, then paste the authorization code from the redirect URL

## Security Notes

- OAuth tokens are stored locally in `~/.gmail-mcp/token.json`
- Never commit credentials.json or token.json to version control
- Review OAuth scopes - this server requests full Gmail access
