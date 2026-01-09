#!/usr/bin/env node

import { authenticateInteractive, isAuthenticated, getConfigDir } from "./auth.js";

async function main() {
  console.log("Gmail MCP Server - Authentication");
  console.log("==================================\n");
  console.log(`Config directory: ${getConfigDir()}\n`);

  if (isAuthenticated()) {
    console.log("Already authenticated!");
    console.log(
      "To re-authenticate, delete the token.json file and run this script again."
    );
    return;
  }

  try {
    await authenticateInteractive();
    console.log("\nAuthentication complete! You can now use the Gmail MCP server.");
  } catch (error) {
    console.error("\nAuthentication failed:", error);
    process.exit(1);
  }
}

main();
