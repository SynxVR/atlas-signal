const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8080;
const wss  = new WebSocketServer({ port: PORT });

// Each room has exactly 2 peers: host and client
// rooms[roomId] = { host: ws, client: ws }
const rooms = {};

wss.on("connection", (ws) => {
  ws.roomId = null;
  ws.role   = null;

  ws.on("message", (data) => {
    let msg;
    try { msg = JSON.parse(data); }
    catch { return; }

    switch (msg.type) {

      // Host registers itself with a room ID
      case "register-host": {
        const id = msg.roomId;
        if (!rooms[id]) rooms[id] = { host: null, client: null };
        rooms[id].host = ws;
        ws.roomId = id;
        ws.role   = "host";
        ws.send(JSON.stringify({ type: "registered", role: "host", roomId: id }));
        console.log(`[+] Host registered: ${id}`);
        break;
      }

      // Browser joins a room
      case "join": {
        const id = msg.roomId;
        if (!rooms[id] || !rooms[id].host) {
          ws.send(JSON.stringify({ type: "error", message: "Room not found or host offline" }));
          return;
        }
        rooms[id].client = ws;
        ws.roomId = id;
        ws.role   = "client";
        ws.send(JSON.stringify({ type: "joined", roomId: id }));
        // Tell host a client joined so it can start the WebRTC offer
        rooms[id].host.send(JSON.stringify({ type: "client-joined" }));
        console.log(`[+] Client joined: ${id}`);
        break;
      }

      // WebRTC signaling — forward offer/answer/ice between host and client
      case "offer":
      case "answer":
      case "ice": {
        const room = rooms[ws.roomId];
        if (!room) return;
        const target = ws.role === "host" ? room.client : room.host;
        if (target && target.readyState === 1) {
          target.send(JSON.stringify(msg));
        }
        break;
      }

      // Commands (black screen, clipboard, lock, etc.) — forwarded host <-> client
      case "command": {
        const room = rooms[ws.roomId];
        if (!room) return;
        const target = ws.role === "host" ? room.client : room.host;
        if (target && target.readyState === 1) {
          target.send(JSON.stringify(msg));
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    const room = rooms[ws.roomId];
    if (!room) return;

    if (ws.role === "host") {
      // Host disconnected — notify client
      if (room.client && room.client.readyState === 1) {
        room.client.send(JSON.stringify({ type: "host-disconnected" }));
      }
      delete rooms[ws.roomId];
      console.log(`[-] Host disconnected: ${ws.roomId}`);
    } else if (ws.role === "client") {
      // Client disconnected — notify host
      if (room.host && room.host.readyState === 1) {
        room.host.send(JSON.stringify({ type: "client-disconnected" }));
      }
      room.client = null;
      console.log(`[-] Client disconnected: ${ws.roomId}`);
    }
  });
});

console.log(`Atlas signaling server running on port ${PORT}`);