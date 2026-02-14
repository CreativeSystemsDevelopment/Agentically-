/**
 * Terminal Manager – node-pty over Socket.IO
 *
 * Provides a real PTY terminal accessible by both the user (via xterm.js)
 * and the agent (via tool calls). The terminal is linked to the VM.
 */

const os = require("os");
const pty = require("node-pty");

// Active terminals keyed by socket id
const terminals = new Map();

// Shared terminal that agent can also write to
let sharedTerminal = null;
let sharedTerminalOutput = "";
const MAX_OUTPUT_BUFFER = 100000; // 100KB rolling buffer

function setupTerminal(namespace, workspaceRoot) {
  namespace.on("connection", (socket) => {
    console.log("[Terminal] Client connected:", socket.id);

    const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
    const term = pty.spawn(shell, [], {
      name: "xterm-256color",
      cols: 120,
      rows: 30,
      cwd: workspaceRoot,
      env: { ...process.env, TERM: "xterm-256color" },
    });

    terminals.set(socket.id, term);

    // Set as shared terminal (latest connection)
    sharedTerminal = term;
    sharedTerminalOutput = "";

    // Forward PTY output → client
    term.onData((data) => {
      socket.emit("output", data);
      // Buffer output for agent tool reads
      sharedTerminalOutput += data;
      if (sharedTerminalOutput.length > MAX_OUTPUT_BUFFER) {
        sharedTerminalOutput = sharedTerminalOutput.slice(-MAX_OUTPUT_BUFFER);
      }
    });

    term.onExit(({ exitCode }) => {
      console.log("[Terminal] Process exited:", exitCode);
      socket.emit("exit", exitCode);
    });

    // Receive input from client → PTY
    socket.on("input", (data) => {
      term.write(data);
    });

    // Resize
    socket.on("resize", ({ cols, rows }) => {
      try {
        term.resize(cols, rows);
      } catch (e) {
        // ignore resize errors
      }
    });

    socket.on("disconnect", () => {
      console.log("[Terminal] Client disconnected:", socket.id);
      term.kill();
      terminals.delete(socket.id);
      if (sharedTerminal === term) {
        sharedTerminal = null;
      }
    });
  });
}

/**
 * Execute a command in the shared terminal and capture output.
 * Used by the agent's run_in_terminal tool.
 */
function executeInTerminal(command, timeout = 30000) {
  return new Promise((resolve, reject) => {
    if (!sharedTerminal) {
      reject(new Error("No active terminal. Open the terminal in the portal first."));
      return;
    }

    const marker = `__AGENT_CMD_${Date.now()}__`;
    const endMarker = `__AGENT_END_${Date.now()}__`;
    let output = "";
    let capturing = false;
    let timer;

    const handler = (data) => {
      const str = data.toString();
      if (str.includes(marker)) {
        capturing = true;
        return;
      }
      if (str.includes(endMarker)) {
        cleanup();
        resolve(output.trim());
        return;
      }
      if (capturing) {
        output += str;
      }
    };

    const cleanup = () => {
      sharedTerminal.removeListener("data", handler);
      if (timer) clearTimeout(timer);
    };

    sharedTerminal.onData(handler);

    timer = setTimeout(() => {
      cleanup();
      resolve(output.trim() || "(command timed out)");
    }, timeout);

    // Write command with markers
    sharedTerminal.write(`echo "${marker}" && ${command} ; echo "${endMarker}"\r`);
  });
}

/**
 * Get recent terminal output (for agent context)
 */
function getTerminalOutput() {
  return sharedTerminalOutput;
}

module.exports = { setupTerminal, executeInTerminal, getTerminalOutput };
