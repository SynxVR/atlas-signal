<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Atlas Remote — Session</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:      #08080f;
    --bg2:     #0e0e1a;
    --bg3:     #13131f;
    --border:  rgba(120,80,255,0.18);
    --purple:  #7c4dff;
    --purple2: #a67cff;
    --text:    #e8e4ff;
    --muted:   #7a7599;
    --green:   #4dff9e;
    --red:     #ff4d6e;
    --yellow:  #ffcc4d;
  }

  * { margin:0; padding:0; box-sizing:border-box; }

  body {
    background: #000;
    color: var(--text);
    font-family: 'DM Mono', monospace;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ── TOP BAR ── */
  #topBar {
    position: fixed;
    top: -50px; left: 0; right: 0;
    height: 44px;
    background: rgba(8,8,15,0.96);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 10px;
    z-index: 1000;
    transition: top 0.22s cubic-bezier(0.4,0,0.2,1);
  }

  #triggerZone {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 6px; z-index: 999;
  }

  #triggerZone:hover ~ #topBar,
  #topBar:hover { top: 0; }

  .bar-logo {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 14px;
    letter-spacing: -0.3px;
    margin-right: 6px;
    user-select: none;
  }
  .bar-logo span { color: var(--purple2); }

  .bar-btn {
    background: transparent;
    border: 1px solid transparent;
    color: var(--muted);
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    padding: 5px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    height: 30px;
    display: flex;
    align-items: center;
  }
  .bar-btn:hover { background: var(--bg3); border-color: var(--border); color: var(--text); }
  .bar-btn.lit   { background: rgba(124,77,255,0.18); border-color: rgba(124,77,255,0.45); color: var(--purple2); }

  .bar-divider { width:1px; height:22px; background:var(--border); margin:0 4px; flex-shrink:0; }
  .bar-spacer  { flex: 1; }

  .conn-indicator {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; color: var(--muted); padding: 0 6px;
  }
  .conn-dot {
    width:6px; height:6px; border-radius:50%;
    background:var(--yellow); box-shadow:0 0 5px var(--yellow);
    animation: blink 2s infinite;
  }
  .conn-dot.connected { background:var(--green); box-shadow:0 0 5px var(--green); }
  .conn-dot.error     { background:var(--red);   box-shadow:none; animation:none; }
  @keyframes blink { 0%,100%{opacity:1}50%{opacity:0.4} }

  /* ── DROPDOWNS ── */
  .dropdown-wrap { position: relative; }

  .dd-menu {
    display: none;
    position: absolute;
    top: calc(100% + 6px); left: 0;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 5px;
    min-width: 210px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.75);
    z-index: 2000;
  }
  .dd-menu.open { display: block; }

  .menu-item {
    display: flex; align-items: center;
    padding: 9px 12px; border-radius: 6px;
    font-size: 12px; color: var(--text);
    cursor: pointer; transition: background 0.12s;
    border: none; background: transparent;
    width: 100%; text-align: left;
    font-family: 'DM Mono', monospace;
  }
  .menu-item:hover { background: rgba(124,77,255,0.12); color: var(--purple2); }
  .menu-item.active { background: rgba(124,77,255,0.18); color: var(--purple2); border: 1px solid rgba(124,77,255,0.4); }
  .menu-item.toggle-on { background: rgba(124,77,255,0.18); border: 1px solid rgba(124,77,255,0.4); color: var(--purple2); }

  .menu-divider { height:1px; background:var(--border); margin:4px 5px; }

  /* Display menu — shows monitor previews */
  #displayMenu { min-width: 260px; }

  .monitor-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: 6px;
    cursor: pointer; transition: background 0.12s;
    border: 1px solid transparent;
  }
  .monitor-item:hover { background: rgba(124,77,255,0.1); border-color: var(--border); }
  .monitor-item.active { background: rgba(124,77,255,0.18); border-color: rgba(124,77,255,0.4); }

  .monitor-thumb {
    width: 80px; height: 45px;
    border-radius: 4px;
    background: var(--bg3);
    border: 1px solid var(--border);
    overflow: hidden;
    flex-shrink: 0;
  }
  .monitor-thumb img { width:100%; height:100%; object-fit:cover; }
  .monitor-thumb .no-prev {
    width:100%; height:100%;
    display:flex; align-items:center; justify-content:center;
    font-size:9px; color:var(--muted);
  }

  .monitor-meta { flex:1; }
  .monitor-name { font-size:12px; color:var(--text); font-family:'Syne',sans-serif; font-weight:700; }
  .monitor-res  { font-size:10px; color:var(--muted); margin-top:2px; }

  /* ── STATS POPUP ── */
  #statsPopup {
    display: none;
    position: fixed; bottom:18px; right:18px;
    background: rgba(8,8,15,0.95);
    border: 1px solid var(--border);
    border-radius: 10px; padding: 14px 16px;
    backdrop-filter: blur(16px);
    z-index: 2000; min-width: 175px;
  }
  #statsPopup.open { display: block; }

  .stats-title {
    font-family:'Syne',sans-serif; font-weight:700;
    font-size:10px; text-transform:uppercase; letter-spacing:1.5px;
    color:var(--purple2); margin-bottom:10px;
  }
  .stat-row { display:flex; justify-content:space-between; font-size:11px; margin-bottom:5px; gap:20px; }
  .stat-label { color:var(--muted); }
  .stat-value { color:var(--text); }
  .stat-value.good { color:var(--green); }
  .stat-value.warn { color:var(--yellow); }
  .stat-value.bad  { color:var(--red); }

  /* ── VIDEO ── */
  #streamWrap { flex:1; position:relative; background:#000; }
  #remoteVideo { width:100%; height:100%; object-fit:contain; display:block; }

  /* ── OVERLAY ── */
  #overlay {
    position:absolute; inset:0;
    background:var(--bg);
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    gap:14px; z-index:10;
  }
  #overlay.hidden { display:none; }

  .spinner {
    width:32px; height:32px;
    border:2px solid var(--border); border-top-color:var(--purple);
    border-radius:50%; animation:spin 0.75s linear infinite;
  }
  @keyframes spin { to { transform:rotate(360deg); } }

  .overlay-title { font-family:'Syne',sans-serif; font-weight:700; font-size:15px; }
  .overlay-sub   { font-size:12px; color:var(--muted); }

  /* ── PRE-CONNECT SCREEN ── */
  #preConnect {
    position:absolute; inset:0;
    background:var(--bg);
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    gap:24px; z-index:20;
    padding:40px;
  }
  #preConnect.hidden { display:none; }

  .pre-title { font-family:'Syne',sans-serif; font-weight:800; font-size:22px; letter-spacing:-0.5px; }
  .pre-sub   { font-size:12px; color:var(--muted); margin-top:-16px; }

  .pre-cards {
    display:flex; gap:16px; flex-wrap:wrap; justify-content:center;
    max-width:700px;
  }

  .pre-card {
    background:var(--bg2); border:1px solid var(--border);
    border-radius:12px; padding:18px 20px; min-width:200px; flex:1;
  }

  .pre-card h3 {
    font-family:'Syne',sans-serif; font-weight:700; font-size:12px;
    text-transform:uppercase; letter-spacing:1.5px; color:var(--muted);
    margin-bottom:12px;
  }

  .pre-option {
    display:flex; align-items:center; gap:10px;
    padding:10px 12px; border-radius:8px;
    border:1px solid var(--border); background:var(--bg3);
    cursor:pointer; transition:all 0.15s; margin-bottom:8px;
  }
  .pre-option:last-child { margin-bottom:0; }
  .pre-option:hover { border-color:rgba(124,77,255,0.4); background:rgba(124,77,255,0.08); }
  .pre-option.selected { border-color:var(--purple); background:rgba(124,77,255,0.15); }

  .pre-option-dot {
    width:10px; height:10px; border-radius:50%;
    border:2px solid var(--muted); flex-shrink:0; transition:all 0.15s;
  }
  .pre-option.selected .pre-option-dot { background:var(--purple); border-color:var(--purple); }

  .pre-option-label { font-size:12px; color:var(--text); }
  .pre-option-sub   { font-size:10px; color:var(--muted); margin-top:2px; }

  .monitor-pre-thumb {
    width:60px; height:34px; border-radius:3px;
    background:var(--bg); border:1px solid var(--border);
    overflow:hidden; flex-shrink:0;
  }
  .monitor-pre-thumb img { width:100%; height:100%; object-fit:cover; }

  .btn-connect-now {
    font-family:'Syne',sans-serif; font-weight:800; font-size:14px;
    background:var(--purple); color:#fff; border:none;
    border-radius:10px; padding:14px 40px; cursor:pointer;
    transition:all 0.15s; letter-spacing:0.3px;
  }
  .btn-connect-now:hover {
    background:var(--purple2);
    box-shadow:0 6px 24px rgba(124,77,255,0.4);
    transform:translateY(-1px);
  }
</style>
</head>
<body>

<div id="triggerZone"></div>

<!-- Top bar -->
<div id="topBar">
  <span class="bar-logo">Atlas<span>Remote</span></span>

  <!-- Actions -->
  <div class="dropdown-wrap">
    <button class="bar-btn" id="actionsBtn" onclick="toggleDD('actionsMenu','actionsBtn')">Actions ▾</button>
    <div class="dd-menu" id="actionsMenu">
      <button class="menu-item" onclick="sendAction('lock')">Lock System</button>
      <button class="menu-item" onclick="sendAction('startmenu')">Start Menu</button>
      <button class="menu-item" onclick="sendAction('run')">Run</button>
      <button class="menu-item" onclick="sendAction('taskmgr')">Task Manager</button>
      <button class="menu-item" onclick="sendAction('controlpanel')">Control Panel</button>
      <button class="menu-item" onclick="sendAction('closewindow')">Close Active Window</button>
      <button class="menu-item" onclick="sendAction('cmd')">Command Prompt</button>
      <div class="menu-divider"></div>
      <button class="menu-item" id="blackScreenBtn" onclick="toggleBlackScreen()">Black Screen</button>
    </div>
  </div>

  <!-- Display picker -->
  <div class="dropdown-wrap">
    <button class="bar-btn" id="displayBtn" onclick="toggleDD('displayMenu','displayBtn')">Display ▾</button>
    <div class="dd-menu" id="displayMenu"></div>
  </div>

  <div class="bar-divider"></div>

  <button class="bar-btn" onclick="doReconnect()">Reconnect</button>
  <button class="bar-btn" onclick="doDisconnect()">Disconnect</button>
  <button class="bar-btn" id="statsBtn" onclick="toggleStats()">Stats</button>

  <div class="bar-spacer"></div>

  <div class="conn-indicator">
    <div class="conn-dot" id="connDot"></div>
    <span id="connText">Connecting...</span>
  </div>
</div>

<!-- Pre-connect screen (encoder + monitor picker) -->
<div id="preConnect">
  <div class="pre-title">Connect to Device</div>
  <div class="pre-sub">Choose your settings before starting the session.</div>

  <div class="pre-cards">
    <!-- Encoder card -->
    <div class="pre-card">
      <h3>Encoder</h3>
      <div id="encoderOptions">
        <div class="pre-option selected" id="enc-auto" onclick="selectEncoder('auto')">
          <div class="pre-option-dot"></div>
          <div>
            <div class="pre-option-label">Auto (Recommended)</div>
            <div class="pre-option-sub">Uses best encoder for this host</div>
          </div>
        </div>
        <div class="pre-option" id="enc-nvenc" onclick="selectEncoder('nvenc')">
          <div class="pre-option-dot"></div>
          <div>
            <div class="pre-option-label">NVENC</div>
            <div class="pre-option-sub">NVIDIA GPU — lowest latency</div>
          </div>
        </div>
        <div class="pre-option" id="enc-cpu" onclick="selectEncoder('cpu')">
          <div class="pre-option-dot"></div>
          <div>
            <div class="pre-option-label">CPU (libx264)</div>
            <div class="pre-option-sub">Software encoding — compatible</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Monitor card -->
    <div class="pre-card">
      <h3>Display</h3>
      <div id="monitorOptions">
        <div style="font-size:12px;color:var(--muted);padding:8px 0">Connecting to server...</div>
      </div>
    </div>
  </div>

  <button class="btn-connect-now" onclick="startSession()">Start Session</button>
</div>

<!-- Stream view -->
<div id="streamWrap">
  <video id="remoteVideo" autoplay playsinline></video>
  <div id="overlay" class="hidden">
    <div class="spinner"></div>
    <div class="overlay-title">Connecting to host...</div>
    <div class="overlay-sub">Establishing connection</div>
  </div>
</div>

<!-- Stats -->
<div id="statsPopup">
  <div class="stats-title">Stream Stats</div>
  <div class="stat-row"><span class="stat-label">FPS</span><span class="stat-value" id="s-fps">—</span></div>
  <div class="stat-row"><span class="stat-label">Resolution</span><span class="stat-value" id="s-res">—</span></div>
  <div class="stat-row"><span class="stat-label">Bitrate</span><span class="stat-value" id="s-bitrate">—</span></div>
  <div class="stat-row"><span class="stat-label">Latency</span><span class="stat-value" id="s-latency">—</span></div>
  <div class="stat-row"><span class="stat-label">Packet Loss</span><span class="stat-value" id="s-loss">—</span></div>
  <div class="stat-row"><span class="stat-label">Encoder</span><span class="stat-value" id="s-encoder">—</span></div>
</div>

<script>
  const SIGNAL    = 'wss://atlas-signal-production.up.railway.app';
  const DEVICE_ID = sessionStorage.getItem('atlas-device-id');
  if (!DEVICE_ID) window.location.href = 'index.html';

  let ws, pc, inputCh;
  let blackScreenOn = false;
  let statsOpen     = false;
  let statsInterval = null;
  let lastBytes = 0, lastStatsTime = 0;
  let activeMonitor = 0;
  let selectedEncoder = 'auto';
  let hostEncoder     = 'cpu';
  let hostMonitors    = [];
  // Monitor previews from dashboard
  let monitorPreviews = {};

  const RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // ── Pre-connect: fetch host info ───────────────────────────────────────────
  function fetchHostInfo() {
    const tmpWs = new WebSocket(SIGNAL);
    tmpWs.onopen = () => {
      tmpWs.send(JSON.stringify({ type: 'check-device', deviceId: DEVICE_ID }));
    };
    tmpWs.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'device-status') {
          hostMonitors = msg.monitors || [];
          hostEncoder  = msg.encoder  || 'cpu';
          document.getElementById('s-encoder').textContent = msg.encoderLabel || hostEncoder;
          renderMonitorOptions();
          // Pre-select the host's default encoder
          selectEncoder(hostEncoder);
        }
        if (msg.type === 'preview') {
          monitorPreviews[0] = msg.data;
          renderMonitorOptions();
        }
      } catch {}
      tmpWs.close();
    };
  }

  function renderMonitorOptions() {
    const container = document.getElementById('monitorOptions');
    if (!hostMonitors.length) {
      container.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:8px 0">No monitor info available</div>';
      return;
    }
    container.innerHTML = '';
    hostMonitors.forEach((m, i) => {
      const div = document.createElement('div');
      div.className = 'pre-option' + (i === activeMonitor ? ' selected' : '');
      div.id = 'mon-pre-' + i;
      div.onclick = () => selectMonitor(i);

      const preview = monitorPreviews[i];
      div.innerHTML = `
        <div class="pre-option-dot"></div>
        <div class="monitor-pre-thumb">
          ${preview ? `<img src="${preview}" />` : '<div style="width:100%;height:100%;background:var(--bg3)"></div>'}
        </div>
        <div>
          <div class="pre-option-label">${m.name}</div>
          <div class="pre-option-sub">${m.width}×${m.height}</div>
        </div>
      `;
      container.appendChild(div);
    });
  }

  function selectEncoder(enc) {
    selectedEncoder = enc;
    ['auto','nvenc','cpu'].forEach(e => {
      document.getElementById('enc-' + e).classList.toggle('selected', e === enc);
    });
  }

  function selectMonitor(idx) {
    activeMonitor = idx;
    document.querySelectorAll('[id^="mon-pre-"]').forEach((el, i) => {
      el.classList.toggle('selected', i === idx);
    });
  }

  function startSession() {
    document.getElementById('preConnect').classList.add('hidden');
    document.getElementById('overlay').classList.remove('hidden');
    connectWs();
  }

  // ── WebSocket + WebRTC ─────────────────────────────────────────────────────
  function connectWs() {
    ws = new WebSocket(SIGNAL);

    ws.onopen = () => {
      setConn('waiting', 'Waiting for host...');
      ws.send(JSON.stringify({ type: 'join', deviceId: DEVICE_ID }));
    };

    ws.onmessage = async (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      if (msg.type === 'joined') {
        // Send encoder + monitor choice to host
        const enc = selectedEncoder === 'auto' ? hostEncoder : selectedEncoder;
        sendCommand('set-encoder', { encoder: enc });
        sendCommand('set-monitor', { monitor: activeMonitor });
        setConn('waiting', 'Waiting for stream...');
        // Setup input immediately — don't wait for WebRTC
        setupInput();
      }
      else if (msg.type === 'offer') {
        await handleOffer(msg.sdp);
      }
      else if (msg.type === 'ice' && pc) {
        try { await pc.addIceCandidate(msg.candidate); } catch {}
      }
      else if (msg.type === 'frame') {
        handleFrame(msg.data);
      }
      else if (msg.type === 'host-disconnected') {
        setConn('error', 'Host disconnected');
        showOverlay('Host disconnected', 'Go back and reconnect.');
      }
      else if (msg.type === 'command' && msg.action === 'clipboard' && msg.text) {
        navigator.clipboard.writeText(msg.text).catch(() => {});
      }
    };

    ws.onclose = () => setConn('error', 'Disconnected');
  }

  // ── WebRTC (for future native WebRTC implementation) ───────────────────────
  async function handleOffer(sdp) {
    pc = new RTCPeerConnection(RTC_CONFIG);

    pc.ontrack = (e) => {
      document.getElementById('remoteVideo').srcObject = e.streams[0];
      document.getElementById('overlay').classList.add('hidden');
      setConn('connected', 'Connected');
      startStats();
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && ws.readyState === 1)
        ws.send(JSON.stringify({ type: 'ice', candidate: e.candidate }));
    };

    pc.ondatachannel = (e) => {
      if (e.channel.label === 'input') inputCh = e.channel;
    };

    await pc.setRemoteDescription({ type: 'offer', sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
    setupInput();
  }

  // ── Frame receiver ─────────────────────────────────────────────────────────
  // The host sends frames as base64. We use the WebCodecs API (H264) if available,
  // otherwise fall back to JPEG rendering on a canvas.
  let frameCanvas, frameCtx;
  let decoder = null;
  let firstFrame = true;
  let frameCount = 0;
  let lastFrameTime = 0;
  let displayFps = 0;

  function handleFrame(b64data) {
    if (firstFrame) {
      firstFrame = false;
      document.getElementById('overlay').classList.add('hidden');
      setConn('connected', 'Connected');
      startStats();
      initFrameCanvas();
    }

    const binary = atob(b64data);
    const buf    = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);

    // Track fps
    frameCount++;
    const now = Date.now();
    if (now - lastFrameTime >= 1000) {
      displayFps   = frameCount;
      frameCount   = 0;
      lastFrameTime = now;
      document.getElementById('s-fps').textContent = displayFps + ' fps';
      document.getElementById('s-fps').className =
        'stat-value ' + (displayFps >= 55 ? 'good' : displayFps >= 30 ? 'warn' : 'bad');
    }

    // Try WebCodecs H264 decode
    if (window.VideoDecoder && decoder) {
      try {
        const chunk = new EncodedVideoChunk({
          type:      'key',
          timestamp: performance.now() * 1000,
          data:      buf
        });
        decoder.decode(chunk);
        return;
      } catch(e) { /* fall through to image method */ }
    }

    // Fallback: treat as JPEG and draw to canvas
    const blob = new Blob([buf], { type: 'image/jpeg' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      if (frameCtx) frameCtx.drawImage(img, 0, 0, frameCanvas.width, frameCanvas.height);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function initFrameCanvas() {
    // Replace video element with canvas for frame rendering
    const wrap  = document.getElementById('streamWrap');
    const video = document.getElementById('remoteVideo');

    frameCanvas        = document.createElement('canvas');
    frameCanvas.id     = 'frameCanvas';
    frameCanvas.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;background:#000';
    wrap.insertBefore(frameCanvas, video);
    video.style.display = 'none';

    // Size canvas to monitor resolution
    const mon = hostMonitors[activeMonitor];
    if (mon) { frameCanvas.width = mon.width; frameCanvas.height = mon.height; }
    else      { frameCanvas.width = 1920;      frameCanvas.height = 1080; }

    frameCtx = frameCanvas.getContext('2d');

    // Setup WebCodecs decoder if available
    if (window.VideoDecoder) {
      try {
        decoder = new VideoDecoder({
          output: (videoFrame) => {
            frameCtx.drawImage(videoFrame, 0, 0, frameCanvas.width, frameCanvas.height);
            videoFrame.close();
          },
          error: () => { decoder = null; } // fall back to JPEG
        });
        decoder.configure({
          codec:             'avc1.42E01E',
          optimizeForLatency: true
        });
      } catch(e) { decoder = null; }
    }

    // Setup input on canvas too
    frameCanvas.addEventListener('mousemove', (e) => {
      const r = frameCanvas.getBoundingClientRect();
      sendInput({ type:'mousemove', x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height });
    });
    frameCanvas.addEventListener('mousedown',   (e) => sendInput({ type:'mousedown', button:e.button }));
    frameCanvas.addEventListener('mouseup',     (e) => sendInput({ type:'mouseup',   button:e.button }));
    frameCanvas.addEventListener('wheel',       (e) => { e.preventDefault(); sendInput({ type:'wheel', deltaX:e.deltaX, deltaY:e.deltaY }); }, { passive:false });
    frameCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
    frameCanvas.addEventListener('click', () => { if (!isMenuOpen()) frameCanvas.requestPointerLock(); });
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  function setupInput() {
    const video = document.getElementById('remoteVideo');
    video.addEventListener('mousemove', (e) => {
      const r = video.getBoundingClientRect();
      sendInput({ type:'mousemove', x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height });
    });
    video.addEventListener('mousedown',   (e) => sendInput({ type:'mousedown', button:e.button }));
    video.addEventListener('mouseup',     (e) => sendInput({ type:'mouseup',   button:e.button }));
    video.addEventListener('wheel',       (e) => { e.preventDefault(); sendInput({ type:'wheel', deltaX:e.deltaX, deltaY:e.deltaY }); }, { passive:false });
    video.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown',  (e) => { if (!isMenuOpen()) { e.preventDefault(); sendInput({ type:'keydown', key:e.key, code:e.code }); } });
    document.addEventListener('keyup',    (e) => { if (!isMenuOpen()) { e.preventDefault(); sendInput({ type:'keyup',   key:e.key, code:e.code }); } });
    video.addEventListener('click', () => { if (!isMenuOpen()) video.requestPointerLock(); });
  }

  function sendInput(data) {
    const p = JSON.stringify(data);
    if (inputCh && inputCh.readyState === 'open') inputCh.send(p);
    else if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type:'input', data }));
  }

  function sendAction(action) {
    ws && ws.readyState === 1 && ws.send(JSON.stringify({ type:'command', action }));
    closeAllDD();
  }

  function sendCommand(action, extra) {
    if (ws && ws.readyState === 1)
      ws.send(JSON.stringify(Object.assign({ type:'command', action }, extra)));
  }

  // Auto clipboard sync
  document.addEventListener('copy', () => {
    setTimeout(() => {
      navigator.clipboard.readText().then(text => {
        if (text && ws && ws.readyState === 1)
          ws.send(JSON.stringify({ type:'command', action:'clipboard', text }));
      }).catch(() => {});
    }, 100);
  });

  // ── Display menu ───────────────────────────────────────────────────────────
  function buildDisplayMenu() {
    const menu = document.getElementById('displayMenu');
    menu.innerHTML = '';
    if (!hostMonitors.length) {
      menu.innerHTML = '<div class="menu-item" style="cursor:default;color:var(--muted)">No monitors detected</div>';
      return;
    }
    hostMonitors.forEach((m, i) => {
      const div = document.createElement('div');
      div.className = 'monitor-item' + (i === activeMonitor ? ' active' : '');
      div.id = 'mon-bar-' + i;
      div.onclick = () => switchMonitor(i);

      const preview = monitorPreviews[i];
      div.innerHTML = `
        <div class="monitor-thumb">
          ${preview
            ? `<img src="${preview}" />`
            : `<div class="no-prev">${m.width}×${m.height}</div>`}
        </div>
        <div class="monitor-meta">
          <div class="monitor-name">${m.name}</div>
          <div class="monitor-res">${m.width} × ${m.height}</div>
        </div>
      `;
      menu.appendChild(div);
    });
  }

  function switchMonitor(idx) {
    activeMonitor = idx;
    sendCommand('set-monitor', { monitor: idx });
    buildDisplayMenu();
    closeAllDD();
  }

  // ── Black screen ───────────────────────────────────────────────────────────
  function toggleBlackScreen() {
    blackScreenOn = !blackScreenOn;
    const btn = document.getElementById('blackScreenBtn');
    btn.textContent = blackScreenOn ? 'Black Screen  ON' : 'Black Screen';
    btn.classList.toggle('toggle-on', blackScreenOn);
    sendCommand('blackscreen', { enabled: blackScreenOn });
    closeAllDD();
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  function startStats() {
    if (statsInterval) clearInterval(statsInterval);
    statsInterval = setInterval(updateStats, 1000);
  }

  async function updateStats() {
    if (!pc) return;
    const stats = await pc.getStats();
    stats.forEach(r => {
      if (r.type === 'inbound-rtp' && r.kind === 'video') {
        const fps = Math.round(r.framesPerSecond || 0);
        setStat('s-fps', fps + ' fps', fps >= 55 ? 'good' : fps >= 30 ? 'warn' : 'bad');
        if (r.frameWidth) document.getElementById('s-res').textContent = r.frameWidth + 'x' + r.frameHeight;
        const now = Date.now();
        if (lastStatsTime > 0) {
          const mbps = ((r.bytesReceived-lastBytes)*8/((now-lastStatsTime)/1000)/1e6).toFixed(1);
          setStat('s-bitrate', mbps + ' Mbps', parseFloat(mbps) > 1 ? 'good' : 'warn');
        }
        lastBytes = r.bytesReceived; lastStatsTime = Date.now();
        const loss = r.packetsLost || 0;
        setStat('s-loss', loss === 0 ? '0%' : loss + ' pkts', loss === 0 ? 'good' : loss < 10 ? 'warn' : 'bad');
      }
      if (r.type === 'candidate-pair' && r.state === 'succeeded') {
        const rtt = Math.round((r.currentRoundTripTime||0)*1000);
        setStat('s-latency', rtt + ' ms', rtt < 50 ? 'good' : rtt < 100 ? 'warn' : 'bad');
      }
    });
  }

  function setStat(id, text, cls) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = 'stat-value ' + (cls || '');
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const openDDs = {};

  function toggleDD(menuId, btnId) {
    const isOpen = document.getElementById(menuId).classList.contains('open');
    closeAllDD();
    if (!isOpen) {
      document.getElementById(menuId).classList.add('open');
      document.getElementById(btnId).classList.add('lit');
      if (menuId === 'displayMenu') buildDisplayMenu();
      openDDs[menuId] = true;
    }
  }

  function closeAllDD() {
    document.querySelectorAll('.dd-menu').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.bar-btn').forEach(b => {
      if (b.id !== 'statsBtn') b.classList.remove('lit');
    });
  }

  function isMenuOpen() {
    return Array.from(document.querySelectorAll('.dd-menu')).some(m => m.classList.contains('open'));
  }

  function toggleStats() {
    statsOpen = !statsOpen;
    document.getElementById('statsPopup').classList.toggle('open', statsOpen);
    document.getElementById('statsBtn').classList.toggle('lit', statsOpen);
  }

  function setConn(state, text) {
    const dot = document.getElementById('connDot');
    dot.className = 'conn-dot' + (state==='connected'?' connected':state==='error'?' error':'');
    document.getElementById('connText').textContent = text;
  }

  function showOverlay(title, sub) {
    const o = document.getElementById('overlay');
    o.classList.remove('hidden');
    o.querySelector('.spinner').style.display = 'none';
    o.querySelector('.overlay-title').textContent = title;
    o.querySelector('.overlay-sub').textContent   = sub;
  }

  function doReconnect() {
    closeAllDD();
    if (pc) { pc.close(); pc = null; }
    if (ws) { ws.close(); ws = null; }
    showOverlay('Reconnecting...', 'Establishing connection');
    document.getElementById('overlay').querySelector('.spinner').style.display = '';
    setTimeout(connectWs, 500);
  }

  function doDisconnect() {
    if (pc) pc.close();
    if (ws) ws.close();
    window.location.href = 'index.html';
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-wrap')) closeAllDD();
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  fetchHostInfo();
</script>
</body>
</html>
