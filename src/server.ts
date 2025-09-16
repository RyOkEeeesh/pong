import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import { Context } from "./serverCore.ts";

interface ExtWebSocket extends WebSocket {
  id?: string;
  name?: string;
  role?: 'player' | 'spectator';
  isP1: number;
}

export enum MsgType {
  Join,
  Client,
  Echo,
};

interface JoinMsg {
  type: MsgType.Join;
  data: {
    name: string;
    role: 'player' | 'spectator';
    isP1: number;
  };
}

interface ClientMsg {
  type: MsgType.Client;
  data: {
    paddlePos: number;
  }
}

interface EchoMsg {
  type: MsgType.Echo;
  data: {};
}

type Msg = JoinMsg | ClientMsg | EchoMsg;

const wss = new WebSocketServer({ port: 8080 });

const player: ExtWebSocket[] = [];

let interval: NodeJS.Timeout | null;

wss.on("connection", (ws: ExtWebSocket) => {
  ws.id = randomUUID();
  console.log("✅ クライアント接続");

  // メッセージ受信
  ws.on("message", (msg: string) => {
    const message: Msg = JSON.parse(msg);

    if (message.type === MsgType.Join) {
      ws.name = message.data.name;
      console.log(`${ws.name} join the game.`);

      if (message.data.role === 'player' && player.length !== 2) {
        player.unshift(ws);
        ws.role = 'player';
      } else {
        ws.role = 'spectator';
        ws.isP1 = -1;
        const res = {
          type: 'init',
          data: {
            isP1: -1,
          }
        };
        ws.send(JSON.stringify(res));
      }

      if (player.length === 2) {
        player.forEach((ws, i) => {
          ws.isP1 = i;

          const res = {
            type: 'init',
            data: {
              isP1: i,
            }
          };
          ws.send(JSON.stringify(res));
        })
      }
    } else if (message.type === MsgType.Client) {
      if (ws.role === 'player') {
        const paddlePosition = message.data.paddlePos;
        Context.paddlePosition[ws.isP1] = paddlePosition;
      }
    }

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