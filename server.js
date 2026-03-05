const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8080;
const wss  = new WebSocketServer({ port: PORT });

// hosts[deviceId] = { ws, preview: base64string|null }
const hosts   = {};
// clients[deviceId] = ws
const clients = {};

wss.on("connection", (ws) => {
  ws.deviceId = null;
  ws.role     = null;

  ws.on("message", (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {

      // ── Host registers ──────────────────────────────────────────────────
      case "register-host": {
        const id = msg.deviceId;
        if (!id) return;
        ws.deviceId = id;
        ws.role     = "host";
        hosts[id]   = { ws, preview: null };
        ws.send(JSON.stringify({ type: "registered", deviceId: id }));
        console.log(`[+] Host online: ${id}`);

        // Notify any waiting client that host came online
        if (clients[id] && clients[id].readyState === 1) {
          clients[id].send(JSON.stringify({ type: "host-online" }));
        }
        break;
      }

      // ── Host sends a screen preview thumbnail ───────────────────────────
      case "preview": {
        const id = ws.deviceId;
        if (!id || !hosts[id]) return;
        hosts[id].preview = msg.data; // base64 jpeg
        // Forward preview to any connected client dashboard
        if (clients[id] && clients[id].readyState === 1) {
          clients[id].send(JSON.stringify({ type: "preview", data: msg.data }));
        }
        break;
      }

      // ── Browser checks if a device ID exists ────────────────────────────
      case "check-device": {
        const id = msg.deviceId;
        const online = !!(hosts[id] && hosts[id].ws.readyState === 1);
        ws.send(JSON.stringify({ type: "device-status", deviceId: id, online }));
        // If online send latest preview too
        if (online && hosts[id].preview) {
          ws.send(JSON.stringify({ type: "preview", deviceId: id, data: hosts[id].preview }));
        }
        break;
      }

      // ── Browser joins a device session ──────────────────────────────────
      case "join": {
        const id = msg.deviceId;
        if (!id) return;
        ws.deviceId = id;
        ws.role     = "client";
        clients[id] = ws;

        if (!hosts[id] || hosts[id].ws.readyState !== 1) {
          ws.send(JSON.stringify({ type: "error", message: "Host is offline" }));
          return;
        }

        ws.send(JSON.stringify({ type: "joined", deviceId: id }));
        hosts[id].ws.send(JSON.stringify({ type: "client-joined" }));
        console.log(`[+] Client joined: ${id}`);
        break;
      }

      // ── WebRTC signaling ─────────────────────────────────────────────────
      case "offer":
      case "answer":
      case "ice": {
        const id  = ws.deviceId;
        if (!id) return;
        const target = ws.role === "host"
          ? clients[id]
          : (hosts[id] && hosts[id].ws);
        if (target && target.readyState === 1) target.send(JSON.stringify(msg));
        break;
      }

      // ── Commands / input ─────────────────────────────────────────────────
      case "command":
      case "input": {
        const id  = ws.deviceId;
        if (!id) return;
        const target = ws.role === "host"
          ? clients[id]
          : (hosts[id] && hosts[id].ws);
        if (target && target.readyState === 1) target.send(JSON.stringify(msg));
        break;
      }
    }
  });

  ws.on("close", () => {
    const id = ws.deviceId;
    if (!id) return;

    if (ws.role === "host") {
      delete hosts[id];
      console.log(`[-] Host offline: ${id}`);
      if (clients[id] && clients[id].readyState === 1)
        clients[id].send(JSON.stringify({ type: "host-disconnected" }));
    } else if (ws.role === "client") {
      if (clients[id] === ws) delete clients[id];
      if (hosts[id] && hosts[id].ws.readyState === 1)
        hosts[id].ws.send(JSON.stringify({ type: "client-disconnected" }));
      console.log(`[-] Client left: ${id}`);
    }
  });
});

console.log(`Atlas signaling server running on port ${PORT}`);
