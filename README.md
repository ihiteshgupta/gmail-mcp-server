# gmail-mcp-server

> Gmail MCP Server — read, send, search, and manage Gmail through Claude using Google's official API.

[![npm version](https://img.shields.io/npm/v/@dev-hitesh-gupta/gmail-mcp-server.svg)](https://www.npmjs.com/package/@dev-hitesh-gupta/gmail-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

**19 tools** for emails, drafts, labels, threads, and attachments — powered by the official Google Gmail API with OAuth 2.0. Works with any Google account (personal Gmail or Google Workspace).

## Tools

### Email Operations (5)

| Tool | Description |
|------|-------------|
| `gmail_search` | Search emails using Gmail query syntax |
| `gmail_get_message` | Get full email content by ID |
| `gmail_send` | Send an email (supports CC, BCC, reply threading) |
| `gmail_get_thread` | Get all messages in a thread |
| `gmail_get_profile` | Get your Gmail profile info |

### Drafts (4)

| Tool | Description |
|------|-------------|
| `gmail_create_draft` | Create a draft email |
| `gmail_list_drafts` | List all saved drafts |
| `gmail_send_draft` | Send an existing draft |
| `gmail_delete_draft` | Delete a draft |

### Labels (3)

| Tool | Description |
|------|-------------|
| `gmail_list_labels` | List all labels |
| `gmail_create_label` | Create a new label |
| `gmail_delete_label` | Delete a label |

### Message Management (4)

| Tool | Description |
|------|-------------|
| `gmail_trash` | Move email to trash |
| `gmail_untrash` | Restore email from trash |
| `gmail_mark_read` | Mark email as read |
| `gmail_mark_unread` | Mark email as unread |
| `gmail_modify_labels` | Add or remove labels from an email |

### Attachments (2)

| Tool | Description |
|------|-------------|
| `gmail_list_attachments` | List all attachments in an email |
| `gmail_get_attachment` | Download attachment as base64 |

---

## Setup

This server uses Google's official Gmail API. You need to create OAuth 2.0 credentials once in Google Cloud Console — this takes about 5 minutes.

### Step 1 — Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Click the project dropdown at the top → **"New Project"**
3. Give it a name (e.g. `gmail-mcp`) and click **Create**
4. Make sure the new project is selected

### Step 2 — Enable the Gmail API

1. In the left menu go to **"APIs & Services"** → **"Library"**
2. Search for **"Gmail API"**
3. Click it → click **"Enable"**

### Step 3 — Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (works for any Google account) → click **Create**
3. Fill in:
   - **App name**: `Gmail MCP Server` (or anything)
   - **User support email**: your email
   - **Developer contact email**: your email
4. Click **Save and Continue**
5. On the **Scopes** page, click **"Add or Remove Scopes"** and add these:
   ```
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/gmail.compose
   https://www.googleapis.com/auth/gmail.modify
   https://www.googleapis.com/auth/gmail.labels
   ```
6. Click **Save and Continue**
7. On **Test users**, click **"Add Users"** → add your Gmail address
8. Click **Save and Continue** → **Back to Dashboard**

### Step 4 — Create OAuth Client ID

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Desktop app"**
4. Name: `Gmail MCP Server`
5. Click **Create**
6. Click **"Download JSON"** — save this file, you'll need it next

### Step 5 — Install & Authenticate

```bash
# Install the package
npm install -g @dev-hitesh-gupta/gmail-mcp-server

# Install dependencies for first run
npx playwright install chromium 2>/dev/null; true

# Create config directory and place your credentials
mkdir -p ~/.gmail-mcp
cp /path/to/downloaded-credentials.json ~/.gmail-mcp/credentials.json

# Authenticate — opens a browser window for Google sign-in
gmail-mcp-server auth
```

Your token is saved to `~/.gmail-mcp/token.json` and auto-refreshed on expiry.

### Step 6 — Add to Claude Code

```bash
claude mcp add gmail -- npx @dev-hitesh-gupta/gmail-mcp-server
```

Or manually in your Claude config (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gmail": {
      "command": "npx",
      "args": ["@dev-hitesh-gupta/gmail-mcp-server"]
    }
  }
}
```

---

## Multiple Accounts

You can connect multiple Gmail accounts by running separate server instances with different config directories:

```json
{
  "mcpServers": {
    "gmail-work": {
      "command": "npx",
      "args": ["@dev-hitesh-gupta/gmail-mcp-server"],
      "env": { "GMAIL_MCP_CONFIG_DIR": "~/.gmail-mcp-work" }
    },
    "gmail-personal": {
      "command": "npx",
      "args": ["@dev-hitesh-gupta/gmail-mcp-server"],
      "env": { "GMAIL_MCP_CONFIG_DIR": "~/.gmail-mcp-personal" }
    }
  }
}
```

Authenticate each separately:
```bash
GMAIL_MCP_CONFIG_DIR=~/.gmail-mcp-work gmail-mcp-server auth
GMAIL_MCP_CONFIG_DIR=~/.gmail-mcp-personal gmail-mcp-server auth
```

---

## Gmail Search Syntax

The `gmail_search` tool supports the full Gmail query language:

```
from:boss@company.com           # From specific sender
to:me                           # Sent to you
subject:invoice                 # Subject contains word
is:unread                       # Unread emails
is:starred                      # Starred emails
has:attachment                  # Has attachments
after:2024/01/01                # After date
before:2024/12/31               # Before date
label:work                      # Has label
in:inbox                        # In inbox
in:sent                         # In sent
in:spam                         # In spam
```

Combine queries:
```
from:client@company.com is:unread has:attachment
subject:urgent OR subject:important
from:boss@company.com after:2024/06/01
```

---

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `GMAIL_MCP_CONFIG_DIR` | `~/.gmail-mcp` | Directory for credentials and token |

---

## Data & Auth Storage

All data is stored locally:

```
~/.gmail-mcp/
├── credentials.json    # Your Google OAuth client credentials
└── token.json          # Access + refresh token (auto-managed)
```

> **Security:** Never commit `credentials.json` or `token.json` to version control. Add `~/.gmail-mcp/` to your `.gitignore`.

---

## Troubleshooting

**"Not authenticated" / "Credentials not found":**
```bash
# Make sure credentials.json is in place
ls ~/.gmail-mcp/credentials.json

# Re-authenticate
gmail-mcp-server auth
```

**Token expired:**
```bash
rm ~/.gmail-mcp/token.json
gmail-mcp-server auth
```

**"Access blocked" during Google sign-in:**
Your OAuth app is in test mode. Go to Google Cloud Console → OAuth consent screen → add your email under **Test users**.

**Scope errors:**
Ensure all 5 Gmail scopes are added in the OAuth consent screen (Step 3 above).

---

## Requirements

- Node.js 18+
- A Google account (personal Gmail or Google Workspace)
- Google Cloud project with Gmail API enabled (see setup above)

## License

MIT — [Hitesh Gupta](https://github.com/dev-hitesh-gupta)
