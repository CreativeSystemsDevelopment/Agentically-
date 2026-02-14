/**
 * Agent Portal – Main Server
 *
 * Express + Socket.IO server providing:
 *   - Static file serving for the portal UI
 *   - WebSocket terminal (node-pty)
 *   - REST API for file browsing
 *   - WebSocket agent chat with tool calling
 */

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const { setupTerminal } = require("./src/terminal/pty");
const { setupFilesystemAPI } = require("./src/filesystem/browser");
const { setupAgentChat } = require("./src/agent/copilot");

const PORT = process.env.PORT || 3000;
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/workspaces/Agentically-";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 10 * 1024 * 1024, // 10MB for file transfers
});

// ── Static Files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "10mb" }));

// ── Filesystem REST API ───────────────────────────────────────
setupFilesystemAPI(app, WORKSPACE_ROOT);

// ── WebSocket Namespaces ──────────────────────────────────────
const terminalNs = io.of("/terminal");
const agentNs = io.of("/agent");

setupTerminal(terminalNs, WORKSPACE_ROOT);
setupAgentChat(agentNs, WORKSPACE_ROOT);

// ── Health Check ──────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    workspace: WORKSPACE_ROOT,
    hasApiKey: !!(process.env.AGENT_API_KEY || process.env.GITHUB_TOKEN),
  });
});

// ── Config endpoint ───────────────────────────────────────────
app.get("/api/config", (_req, res) => {
  res.json({
    workspace: WORKSPACE_ROOT,
    hasApiKey: !!(process.env.AGENT_API_KEY || process.env.GITHUB_TOKEN),
    model: process.env.AGENT_MODEL || "gpt-4o",
    apiBase: process.env.AGENT_API_BASE || "(not configured)",
  });
});

// ── Catch-all for SPA ─────────────────────────────────────────
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start ─────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║          🌐 Agent Portal Running            ║
║──────────────────────────────────────────────║
║  URL:       http://localhost:${PORT}            ║
║  Workspace: ${WORKSPACE_ROOT.padEnd(32)}║
║  API Key:   ${(process.env.AGENT_API_KEY || process.env.GITHUB_TOKEN ? "configured ✓" : "NOT SET ✗").padEnd(32)}║
╚══════════════════════════════════════════════╝
  `);
});
