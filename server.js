const { WebSocketServer, WebSocket } = require("ws");

const PORT = process.env.PORT || 8080;
const wss  = new WebSocketServer({ port: PORT, maxPayload: 10 * 1024 * 1024 });

const hosts   = {};
const clients = {};

// ── Keepalive: Railway / any proxy kills idle WS after ~55s ──────────────────
// Ping every 25s so the connection stays alive on both ends
setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) { ws.terminate(); return; }
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);

wss.on("connection", (ws) => {
  ws.isAlive  = true;
  ws.deviceId = null;
  ws.role     = null;

  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (data, isBinary) => {

    // Binary = raw H264 Annex-B chunk from host → relay to viewer
    if (isBinary) {
      const id = ws.deviceId;
      if (!id || ws.role !== "host") return;
      const client = clients[id];
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: true });
      }
      return;
    }

    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {

      case "register-host": {
        const id = msg.deviceId;
        if (!id) return;
        ws.deviceId = id;
        ws.role     = "host";
        hosts[id] = {
          ws,
          preview:      null,
          monitors:     msg.monitors     || [],
          encoder:      msg.encoder      || "cpu",
          encoderLabel: msg.encoderLabel || "CPU"
        };
        ws.send(JSON.stringify({ type: "registered", deviceId: id }));
        console.log(`[+] Host online: ${id}`);
        // Notify any waiting session client
        if (clients[id] && clients[id].readyState === WebSocket.OPEN)
          clients[id].send(JSON.stringify({ type: "host-online" }));
        break;
      }

      case "preview": {
        const id = ws.deviceId;
        if (!id || !hosts[id]) return;
        hosts[id].preview = msg.data;
        // Push to any open session viewer
        if (clients[id] && clients[id].readyState === WebSocket.OPEN)
          clients[id].send(JSON.stringify({ type: "preview", deviceId: id, data: msg.data }));
        break;
      }

      case "check-device": {
        const id   = msg.deviceId;
        const host = hosts[id];
        const online = !!(host && host.ws.readyState === WebSocket.OPEN);
        ws.send(JSON.stringify({
          type:         "device-status",
          deviceId:     id,
          online,
          monitors:     online ? host.monitors     : [],
          encoder:      online ? host.encoder      : null,
          encoderLabel: online ? host.encoderLabel : null
        }));
        // Send cached preview thumbnail so index page shows screenshot
        if (online && host.preview)
          ws.send(JSON.stringify({ type: "preview", deviceId: id, data: host.preview }));
        break;
      }

      case "join": {
        const id = msg.deviceId;
        if (!id) return;
        ws.deviceId = id;
        ws.role     = "client";
        clients[id] = ws;

        if (!hosts[id] || hosts[id].ws.readyState !== WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: "Host is offline" }));
          return;
        }

        ws.send(JSON.stringify({
          type:         "joined",
          deviceId:     id,
          monitors:     hosts[id].monitors,
          encoder:      hosts[id].encoder,
          encoderLabel: hosts[id].encoderLabel
        }));

        hosts[id].ws.send(JSON.stringify({ type: "client-joined" }));
        console.log(`[+] Client joined: ${id}`);
        break;
      }

      // Pass-through relay between host ↔ client
      case "stream-info":
      case "input":
      case "command":
      case "request-stream": {
        const id = ws.deviceId;
        if (!id) return;
        const target = ws.role === "host"
          ? clients[id]
          : (hosts[id] && hosts[id].ws);
        if (target && target.readyState === WebSocket.OPEN)
          target.send(JSON.stringify(msg));
        break;
      }

      default: break;
    }
  });

  ws.on("close", () => {
    const id = ws.deviceId;
    if (!id) return;
    if (ws.role === "host") {
      delete hosts[id];
      console.log(`[-] Host offline: ${id}`);
      if (clients[id] && clients[id].readyState === WebSocket.OPEN)
        clients[id].send(JSON.stringify({ type: "host-disconnected" }));
    } else if (ws.role === "client") {
      if (clients[id] === ws) delete clients[id];
      if (hosts[id] && hosts[id].ws.readyState === WebSocket.OPEN)
        hosts[id].ws.send(JSON.stringify({ type: "client-disconnected" }));
      console.log(`[-] Client left: ${id}`);
    }
  });
});

console.log(`Atlas signal server running on port ${PORT}`);
