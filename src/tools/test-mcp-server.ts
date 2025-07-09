#!/usr/bin/env node
/**
 * Test script to verify MCP server starts correctly
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("Testing MCP server startup...");

const serverPath = path.join(__dirname, "..", "..", "dist", "server.js");
const server = spawn("node", [serverPath], {
  stdio: ["pipe", "pipe", "pipe"],
  cwd: process.cwd(),
});

let stderr = "";

server.stderr.on("data", (data) => {
  stderr += data.toString();
  console.error("STDERR:", data.toString());
});

server.stdout.on("data", (data) => {
  console.log("STDOUT:", data.toString());
});

server.on("error", (error) => {
  console.error("Failed to start server:", error);
});

server.on("exit", (code, signal) => {
  console.log(`Server exited with code ${code} and signal ${signal}`);
  console.log("Full stderr output:", stderr);
});

// Send a test initialize request after a short delay
setTimeout(() => {
  console.log("Sending test initialize request...");
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };
  
  server.stdin.write(JSON.stringify(request) + "\n");
}, 1000);

// Kill the server after 5 seconds
setTimeout(() => {
  console.log("Killing server...");
  server.kill();
}, 5000);