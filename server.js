const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8080;
const wss  = new WebSocketServer({ port: PORT, maxPayload: 10 * 1024 * 1024 }); // 10MB max frame

const hosts   = {};
const clients = {};

wss.on("connection", (ws) => {
  ws.deviceId = null;
  ws.role     = null;

  ws.on("message", (data, isBinary) => {

    // Binary = raw H264 video chunk from host → relay directly to client
    if (isBinary) {
      const id = ws.deviceId;
      if (!id || ws.role !== "host") return;
      const client = clients[id];
      if (client && client.readyState === 1) {
        client.send(data, { binary: true });
      }
      return;
    }

    // Text = JSON signaling
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {

      case "register-host": {
        const id = msg.deviceId;
        if (!id) return;
        ws.deviceId = id;
        ws.role     = "host";
        hosts[id]   = {
          ws,
          preview:      null,
          monitors:     msg.monitors     || [],
          encoder:      msg.encoder      || "cpu",
          encoderLabel: msg.encoderLabel || "CPU"
        };
        ws.send(JSON.stringify({ type: "registered", deviceId: id }));
        console.log(`[+] Host online: ${id}`);
        if (clients[id] && clients[id].readyState === 1)
          clients[id].send(JSON.stringify({ type: "host-online" }));
        break;
      }

      case "preview": {
        const id = ws.deviceId;
        if (!id || !hosts[id]) return;
        hosts[id].preview = msg.data;
        if (clients[id] && clients[id].readyState === 1)
          clients[id].send(JSON.stringify({ type: "preview", deviceId: id, data: msg.data }));
        break;
      }

      case "check-device": {
        const id     = msg.deviceId;
        const host   = hosts[id];
        const online = !!(host && host.ws.readyState === 1);
        ws.send(JSON.stringify({
          type:         "device-status",
          deviceId:     id,
          online,
          monitors:     online ? host.monitors     : [],
          encoder:      online ? host.encoder      : null,
          encoderLabel: online ? host.encoderLabel : null
        }));
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

        if (!hosts[id] || hosts[id].ws.readyState !== 1) {
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

      // JSON messages: relay to the other side
      case "stream-info":
      case "input":
      case "command":
      case "request-stream": {
        const id = ws.deviceId;
        if (!id) return;
        const target = ws.role === "host" ? clients[id] : (hosts[id] && hosts[id].ws);
        if (target && target.readyState === 1)
          target.send(JSON.stringify(msg));
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

console.log(`Atlas server running on port ${PORT}`);
