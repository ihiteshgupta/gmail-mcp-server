import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import { URL } from "url";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.labels",
];

const CONFIG_DIR = process.env.GMAIL_MCP_CONFIG_DIR || path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".gmail-mcp"
);
const TOKEN_PATH = path.join(CONFIG_DIR, "token.json");
const CREDENTIALS_PATH = path.join(CONFIG_DIR, "credentials.json");

export interface Credentials {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadCredentials(): Credentials | null {
  try {
    if (fs.existsSync(CREDENTIALS_PATH)) {
      const content = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error loading credentials:", error);
  }
  return null;
}

export function loadToken(): object | null {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const content = fs.readFileSync(TOKEN_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error loading token:", error);
  }
  return null;
}

function saveToken(token: object): void {
  ensureConfigDir();
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
}

export function createOAuth2Client(credentials: Credentials): OAuth2Client {
  const config = credentials.installed || credentials.web;
  if (!config) {
    throw new Error("Invalid credentials format");
  }

  return new google.auth.OAuth2(
    config.client_id,
    config.client_secret,
    config.redirect_uris[0] || "http://localhost:3000/oauth2callback"
  );
}

export async function getAuthenticatedClient(): Promise<OAuth2Client | null> {
  const credentials = loadCredentials();
  if (!credentials) {
    return null;
  }

  const oauth2Client = createOAuth2Client(credentials);
  const token = loadToken();

  if (token) {
    oauth2Client.setCredentials(token);

    // Check if token needs refresh
    if (oauth2Client.credentials.expiry_date) {
      const now = Date.now();
      if (oauth2Client.credentials.expiry_date <= now) {
        try {
          const { credentials: newToken } =
            await oauth2Client.refreshAccessToken();
          saveToken(newToken);
          oauth2Client.setCredentials(newToken);
        } catch (error) {
          console.error("Error refreshing token:", error);
          return null;
        }
      }
    }

    return oauth2Client;
  }

  return null;
}

export async function authenticateInteractive(): Promise<OAuth2Client> {
  const credentials = loadCredentials();
  if (!credentials) {
    throw new Error(
      `Credentials not found. Please place your credentials.json in ${CREDENTIALS_PATH}`
    );
  }

  const oauth2Client = createOAuth2Client(credentials);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("\nAuthorize this app by visiting this URL:\n");
  console.log(authUrl);
  console.log("\nWaiting for authorization...\n");

  // Start local server to receive callback
  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || "", "http://127.0.0.1:3000");
        if (url.pathname === "/oauth2callback") {
          const code = url.searchParams.get("code");
          if (code) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(
              "<html><body><h1>Authentication successful!</h1><p>You can close this window.</p></body></html>"
            );
            server.close();
            resolve(code);
          } else {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(
              "<html><body><h1>Error</h1><p>No authorization code received.</p></body></html>"
            );
            reject(new Error("No authorization code received"));
          }
        }
      } catch (error) {
        reject(error);
      }
    });

    server.listen(3000, "127.0.0.1", () => {
      console.log("Listening on http://127.0.0.1:3000 for OAuth callback...");
    });

    // Open browser automatically
    import("open").then((open) => {
      open.default(authUrl);
    });
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  saveToken(tokens);

  console.log("Authentication successful! Token saved.");
  return oauth2Client;
}

export function isAuthenticated(): boolean {
  return loadCredentials() !== null && loadToken() !== null;
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}
