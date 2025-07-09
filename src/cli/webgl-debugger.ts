#!/usr/bin/env bun
/**
 * Main CLI entry point for WebGL Visual Regression
 * This can be installed globally or used via npx
 */
import { runBrowserCLI } from "../browser/cli.js";

runBrowserCLI().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});