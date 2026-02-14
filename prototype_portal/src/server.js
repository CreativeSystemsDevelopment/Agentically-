// ─────────────────────────────────────────────────────────────────────────────
// Agentically Prototype Portal — Server
// Express + WebSocket backend: terminal PTY, file browser, agent chat relay
// ─────────────────────────────────────────────────────────────────────────────
const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { WebSocketServer } = require("ws");
const os = require("os");
const { spawn } = require("child_process");

const PORT = process.env.PORT || 3000;
const WORKSPACE = process.env.WORKSPACE_ROOT || "/workspaces/Agentically-";

const app = express();
const server = http.createServer(app);

// ── Static files ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json({ limit: "2mb" }));

// ── REST: File browser ─────────────────────────────────────────────────────
app.get("/api/files", (req, res) => {
  const dir = req.query.path || WORKSPACE;
  const resolved = path.resolve(dir);
  if (!resolved.startsWith(WORKSPACE) && resolved !== WORKSPACE) {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const items = entries
      .filter((e) => !e.name.startsWith("."))
      .map((e) => ({
        name: e.name,
        path: path.join(resolved, e.name),
        type: e.isDirectory() ? "directory" : "file",
        size: e.isFile()
          ? fs.statSync(path.join(resolved, e.name)).size
          : null,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    res.json({ path: resolved, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/files/read", (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: "path required" });
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(WORKSPACE)) {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    const stat = fs.statSync(resolved);
    if (stat.size > 1024 * 1024) {
      return res.status(413).json({ error: "File too large (>1MB)" });
    }
    const content = fs.readFileSync(resolved, "utf-8");
    res.json({ path: resolved, content, size: stat.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/files/write", (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath) return res.status(400).json({ error: "path required" });
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(WORKSPACE)) {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content, "utf-8");
    res.json({ ok: true, path: resolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── REST: Agent chat (Copilot SDK) ─────────────────────────────────────────
const COPILOT_SYSTEM_PROMPT = `You are GitHub Copilot, an AI programming assistant integrated into the Agentically Portal.
You have access to the user's workspace at ${WORKSPACE}.
You are a highly sophisticated automated coding agent with expert-level knowledge across many different programming languages and frameworks.

Capabilities you can help with:
- Reading, writing, and editing files in the workspace
- Running terminal commands
- Answering coding questions
- Debugging issues
- Implementing new features
- Code review and refactoring

When the user asks you to perform file operations or run commands, describe what you would do clearly.
Keep your answers short and impersonal. Follow the user's requirements carefully & to the letter.
Use markdown formatting in your responses. Wrap code in fenced code blocks with language identifiers.`;

app.post("/api/agent/chat", async (req, res) => {
  const { messages, token } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  // Build conversation with system prompt
  const conversation = [
    { role: "system", content: COPILOT_SYSTEM_PROMPT },
    ...messages,
  ];

  // If a GitHub token is provided, use the Copilot API
  const apiToken = token || process.env.GITHUB_TOKEN;
  if (apiToken) {
    try {
      const response = await fetch(
        "https://api.githubcopilot.com/chat/completions",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            messages: conversation,
            stream: false,
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        return res.json({
          role: "assistant",
          content:
            data.choices?.[0]?.message?.content ||
            "No response from Copilot API.",
        });
      }
    } catch (err) {
      console.log("Copilot API unavailable, falling back to local agent");
    }
  }

  // Fallback: local agent that can actually do file/terminal operations
  const lastMsg = messages[messages.length - 1]?.content || "";
  let reply = await handleLocalAgent(lastMsg);
  res.json({ role: "assistant", content: reply });
});

// ── Local agent: file ops + command execution ───────────────────────────────
async function handleLocalAgent(userMessage) {
  const msg = userMessage.toLowerCase();

  // List files
  if (msg.match(/\b(list|ls|show|dir)\b.*\b(files?|folder|director)/)) {
    const match = userMessage.match(/(?:in|at|of)\s+([^\s]+)/i);
    const target = match ? path.resolve(WORKSPACE, match[1]) : WORKSPACE;
    try {
      const entries = fs.readdirSync(target, { withFileTypes: true });
      const list = entries
        .filter((e) => !e.name.startsWith("."))
        .map((e) => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`)
        .join("\n");
      return `**Contents of \`${target}\`:**\n\n${list}`;
    } catch (e) {
      return `Error listing directory: ${e.message}`;
    }
  }

  // Read file
  if (msg.match(/\b(read|cat|show|open|view)\b.*\b(file|content)/)) {
    const match = userMessage.match(/(?:file|read|cat|open)\s+([^\s]+)/i);
    if (match) {
      const target = path.resolve(WORKSPACE, match[1]);
      try {
        const content = fs.readFileSync(target, "utf-8");
        const ext = path.extname(target).slice(1) || "text";
        return `**\`${target}\`:**\n\n\`\`\`${ext}\n${content.slice(0, 4000)}\n\`\`\``;
      } catch (e) {
        return `Error reading file: ${e.message}`;
      }
    }
  }

  // Run command
  if (msg.match(/\b(run|exec|execute)\b/)) {
    const match = userMessage.match(/(?:run|exec|execute)\s+`?([^`]+)`?/i);
    if (match) {
      const cmd = match[1].trim();
      try {
        const result = await runCommand(cmd);
        return `**Command:** \`${cmd}\`\n\n\`\`\`\n${result.slice(0, 4000)}\n\`\`\``;
      } catch (e) {
        return `**Command failed:** \`${e.message}\``;
      }
    }
  }

  // Default helpful response
  return `I'm the **GitHub Copilot Agent** running in the Agentically Portal.

I can help you with:
- 📁 **File operations** — "list files in src", "read file package.json"
- 💻 **Run commands** — "run ls -la", "run git status"
- 🔧 **Code assistance** — Ask me any coding question
- 🤖 **Agent tasks** — I'll help you work with your codebase

**Tip:** Connect your GitHub token in Settings to unlock the full Copilot API.

What would you like to do?`;
}

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    const proc = spawn("bash", ["-c", cmd], {
      cwd: WORKSPACE,
      timeout: 15000,
      env: { ...process.env, HOME: os.homedir() },
    });
    let out = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (out += d));
    proc.on("close", (code) => {
      if (code !== 0 && !out) reject(new Error(`Exit code ${code}`));
      else resolve(out);
    });
    proc.on("error", reject);
  });
}

// ── WebSocket: Terminal PTY ─────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/ws/terminal" });

wss.on("connection", (ws) => {
  console.log("[terminal] client connected");

  // Use child_process instead of node-pty for broader compatibility
  const shell = spawn("bash", ["--login"], {
    cwd: WORKSPACE,
    env: {
      ...process.env,
      TERM: "xterm-256color",
      HOME: os.homedir(),
      LANG: "en_US.UTF-8",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  shell.stdout.on("data", (data) => {
    if (ws.readyState === 1) ws.send(data.toString());
  });
  shell.stderr.on("data", (data) => {
    if (ws.readyState === 1) ws.send(data.toString());
  });

  ws.on("message", (msg) => {
    const str = msg.toString();
    try {
      const parsed = JSON.parse(str);
      if (parsed.type === "resize" && shell.stdin) {
        // resize not supported with basic spawn, but we accept the message
        return;
      }
    } catch {}
    if (shell.stdin.writable) {
      shell.stdin.write(str);
    }
  });

  ws.on("close", () => {
    console.log("[terminal] client disconnected");
    shell.kill();
  });

  shell.on("exit", () => {
    if (ws.readyState === 1) ws.close();
  });
});

// ── Fallback: SPA ───────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// ── Start ───────────────────────────────────────────────────────────────────
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Agentically Portal running at http://localhost:${PORT}`);
  console.log(`   Workspace: ${WORKSPACE}`);
  console.log(`   Terminal WebSocket: ws://localhost:${PORT}/ws/terminal\n`);
});
