#!/usr/bin/env node

import { authenticateInteractive, authenticateHeadless, isAuthenticated, getConfigDir } from "./auth.js";

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

  // Check if running in headless mode
  const isHeadless = process.env.HEADLESS === "true" || process.argv.includes("--headless");

  try {
    if (isHeadless) {
      console.log("Running in headless mode (no browser available)\n");
      await authenticateHeadless();
    } else {
      await authenticateInteractive();
    }
    console.log("\nAuthentication complete! You can now use the Gmail MCP server.");
  } catch (error) {
    console.error("\nAuthentication failed:", error);
    process.exit(1);
  }
}

main();
