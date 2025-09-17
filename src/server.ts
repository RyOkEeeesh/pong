import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import { Context, GameCore } from "./serverCore.ts";
import { ClientMsg, MsgType, RoleStatus } from "./constants.ts";

interface ExtWebSocket extends WebSocket {
  id?: string;
  name?: string;
  role?: RoleStatus;
};

const wss = new WebSocketServer({ host: '0.0.0.0', port: 8080 });

const game = new GameCore();

const player: ExtWebSocket[] = [];

let interval: NodeJS.Timeout | null = null;

wss.on("connection", (ws: ExtWebSocket) => {
  ws.id = randomUUID();
  console.log("✅ クライアント接続");

  // メッセージ受信
  ws.on("message", (msg: string) => {
    const message: ClientMsg = JSON.parse(msg);

    // if () ここ続き

    // 全クライアントにブロードキャスト
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`Echo: ${JSON.stringify(message)}`);
      }
    });
  });

  ws.on("close", () => {
    console.log(`${ws.name} left the game.`)
  });
});

console.log("🚀 WebSocket サーバー起動: ws://localhost:8080");