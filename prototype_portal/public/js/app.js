// ============================================================
// Agentically Portal — Frontend Application
// ============================================================

(function () {
  'use strict';

  // --- State ---
  let currentPath = '';
  let githubToken = localStorage.getItem('github_token') || '';
  let ws = null;
  let term = null;
  let fitAddon = null;
  let currentViewingFile = '';

  // --- DOM ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ============================================================
  // TERMINAL
  // ============================================================
  function initTerminal() {
    const container = $('#terminal');
    container.innerHTML = '';

    term = new Terminal({
      theme: {
        background: '#0d1117',
        foreground: '#e6edf3',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        selectionBackground: '#264f78',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39d353',
        white: '#e6edf3',
      },
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      scrollback: 5000,
    });

    fitAddon = new FitAddon.FitAddon();
    const webLinksAddon = new WebLinksAddon.WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(container);

    setTimeout(() => fitAddon.fit(), 100);

    connectTerminalWS();

    window.addEventListener('resize', () => {
      if (fitAddon) fitAddon.fit();
    });

    new ResizeObserver(() => {
      if (fitAddon) fitAddon.fit();
    }).observe(container);
  }

  function connectTerminalWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}/ws/terminal`);

    ws.onopen = () => {
      term.write('\r\n\x1b[32m● Terminal connected\x1b[0m\r\n\r\n');
      // Send initial resize
      const dims = fitAddon.proposeDimensions();
      if (dims) ws.send(`__RESIZE__:${dims.cols},${dims.rows}`);
    };

    ws.onmessage = (ev) => {
      term.write(ev.data);
    };

    ws.onclose = () => {
      term.write('\r\n\x1b[31m● Terminal disconnected\x1b[0m\r\n');
    };

    ws.onerror = () => {
      term.write('\r\n\x1b[31m● Terminal error\x1b[0m\r\n');
    };

    term.onData((data) => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
    });

    term.onResize(({ cols, rows }) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(`__RESIZE__:${cols},${rows}`);
      }
    });
  }

  // ============================================================
  // FILE BROWSER
  // ============================================================
  async function loadDirectory(dirPath) {
    currentPath = dirPath || '';
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(currentPath)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      renderBreadcrumb(currentPath);
      renderFileList(data.items);
    } catch (e) {
      $('#fileList').innerHTML = `<div class="file-item" style="color:var(--accent-red)">Error: ${e.message}</div>`;
    }
  }

  function renderBreadcrumb(p) {
    const bc = $('#breadcrumb');
    bc.innerHTML = '';
    const parts = ['root', ...(p ? p.split('/') : [])];
    let accumulated = '';
    parts.forEach((part, i) => {
      if (i > 0) accumulated += (accumulated ? '/' : '') + part;
      const span = document.createElement('span');
      span.className = 'crumb';
      span.textContent = part;
      span.dataset.path = i === 0 ? '' : accumulated;
      span.onclick = () => loadDirectory(span.dataset.path);
      bc.appendChild(span);
    });
  }

  function renderFileList(items) {
    const list = $('#fileList');
    list.innerHTML = '';

    if (currentPath) {
      const up = document.createElement('div');
      up.className = 'file-item directory';
      up.innerHTML = '<span class="icon">⬆️</span><span class="name">..</span>';
      up.onclick = () => {
        const parent = currentPath.split('/').slice(0, -1).join('/');
        loadDirectory(parent);
      };
      list.appendChild(up);
    }

    items.forEach((item) => {
      const div = document.createElement('div');
      div.className = `file-item ${item.type}`;

      const icon = item.type === 'directory' ? '📁' : getFileIcon(item.name);
      const sizeStr = item.size != null ? formatSize(item.size) : '';

      div.innerHTML = `
        <span class="icon">${icon}</span>
        <span class="name">${item.name}</span>
        <span class="size">${sizeStr}</span>
      `;

      div.onclick = () => {
        if (item.type === 'directory') {
          loadDirectory(item.path);
        } else {
          openFileViewer(item.path);
        }
      };

      list.appendChild(div);
    });
  }

  function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const icons = {
      js: '🟨', ts: '🔷', py: '🐍', md: '📝', json: '📋',
      yaml: '⚙️', yml: '⚙️', toml: '⚙️', html: '🌐', css: '🎨',
      sh: '🖥️', txt: '📄', lock: '🔒', gitignore: '👁️',
    };
    return icons[ext] || '📄';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // File Viewer Modal
  async function openFileViewer(filePath) {
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      currentViewingFile = filePath;
      $('#fileViewerTitle').textContent = filePath;
      $('#fileViewerContent').value = data.content;
      $('#fileViewerModal').classList.remove('hidden');
    } catch (e) {
      alert('Error reading file: ' + e.message);
    }
  }

  async function saveFile() {
    if (!currentViewingFile) return;
    try {
      const res = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentViewingFile,
          content: $('#fileViewerContent').value,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Flash save confirmation
      const btn = $('#saveFileBtn');
      btn.textContent = '✅ Saved!';
      setTimeout(() => (btn.textContent = '💾 Save'), 1500);
    } catch (e) {
      alert('Error saving: ' + e.message);
    }
  }

  // ============================================================
  // AGENT CHAT
  // ============================================================
  async function sendMessage() {
    const input = $('#chatInput');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    appendMessage('user', message);

    // Show typing indicator
    const typingEl = appendTyping();

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (githubToken) headers['X-GitHub-Token'] = githubToken;

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message }),
      });
      const data = await res.json();

      typingEl.remove();

      if (data.error) {
        appendMessage('assistant', `❌ Error: ${data.error}`);
      } else {
        appendMessage('assistant', data.reply, data.tools_used);
      }
    } catch (e) {
      typingEl.remove();
      appendMessage('assistant', `❌ Network error: ${e.message}`);
    }
  }

  function appendMessage(role, content, toolsUsed) {
    const container = $('#chatMessages');
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;

    // Simple markdown rendering
    let html = escapeHtml(content)
      .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    let toolBadges = '';
    if (toolsUsed && toolsUsed.length > 0) {
      toolBadges = toolsUsed.map((t) => `<span class="tool-badge">🔧 ${t}</span>`).join(' ');
    }

    div.innerHTML = `<div class="msg-content">${html}</div>${toolBadges}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  function appendTyping() {
    const container = $('#chatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg assistant';
    div.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function clearChat() {
    try {
      await fetch('/api/agent/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch (e) { /* ignore */ }
    $('#chatMessages').innerHTML = `
      <div class="chat-msg system">
        <div class="msg-content">
          <strong>Agentically Copilot Agent</strong><br>
          Chat cleared. Ready for new conversation.
        </div>
      </div>`;
  }

  // ============================================================
  // SETTINGS
  // ============================================================
  function updateStatusBadge() {
    const badge = $('#statusBadge');
    if (githubToken) {
      badge.textContent = '● Copilot API';
      badge.className = 'status-badge connected';
    } else {
      badge.textContent = '● Local Mode';
      badge.className = 'status-badge';
    }
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  function init() {
    // Terminal
    initTerminal();
    $('#reconnectTerm').onclick = () => {
      if (ws) ws.close();
      setTimeout(connectTerminalWS, 300);
    };

    // File browser
    loadDirectory('');
    $('#refreshFiles').onclick = () => loadDirectory(currentPath);
    $('#newFileBtn').onclick = () => {
      const name = prompt('New file name:');
      if (name) {
        const fp = currentPath ? `${currentPath}/${name}` : name;
        fetch('/api/files/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: fp, content: '' }),
        }).then(() => loadDirectory(currentPath));
      }
    };
    $('#newFolderBtn').onclick = () => {
      const name = prompt('New folder name:');
      if (name) {
        const fp = currentPath ? `${currentPath}/${name}` : name;
        fetch('/api/files/mkdir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: fp }),
        }).then(() => loadDirectory(currentPath));
      }
    };

    // File viewer
    $('#saveFileBtn').onclick = saveFile;
    $('#closeFileViewer').onclick = () => $('#fileViewerModal').classList.add('hidden');

    // Chat
    $('#sendBtn').onclick = sendMessage;
    $('#chatInput').onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };
    $('#clearChat').onclick = clearChat;

    // Settings
    $('#settingsBtn').onclick = () => {
      $('#githubTokenInput').value = githubToken;
      $('#settingsModal').classList.remove('hidden');
    };
    $('#closeSettings').onclick = () => $('#settingsModal').classList.add('hidden');
    $('#saveTokenBtn').onclick = () => {
      githubToken = $('#githubTokenInput').value.trim();
      localStorage.setItem('github_token', githubToken);
      updateStatusBadge();
      $('#settingsModal').classList.add('hidden');
    };

    // Nav tabs (only copilot is active for now)
    $$('.nav-tab').forEach((tab) => {
      tab.onclick = () => {
        if (tab.classList.contains('disabled')) return;
        $$('.nav-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
      };
    });

    // Keyboard shortcut: Ctrl+` to focus terminal
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        term?.focus();
      }
    });

    updateStatusBadge();
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
