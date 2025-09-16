import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";

interface ExtWebSocket extends WebSocket {
  id?: string;
  name?: string;
}

export enum MsgType {
  Join,
  Echo,
  Left,
};

interface JoinMsg {
  type: MsgType.Join;
  data: {
    name: string;
    role: 'player' | 'spectator';
  };
}

interface EchoMsg {
  type: MsgType.Echo;
  data: {};
}

interface LeftMsg {
  type: MsgType.Left;
  data: {};

}

type Msg = JoinMsg | EchoMsg | LeftMsg;

const wss = new WebSocketServer({ port: 8080 });


wss.on("connection", (ws: ExtWebSocket) => {
  ws.id = randomUUID();
  console.log("✅ クライアント接続");

  // メッセージ受信
  ws.on("message", (msg: string) => {
    const message: Msg = JSON.parse(msg);

    switch (message.type) {
      case MsgType.Join:
        ws.name = message.data.name;
        console.log(`ユーザ参加: ${ws.name}`);
        break;
      case MsgType.Echo:
        console.log(`メッセージ: ${message.data}`);
        break;
      case MsgType.Left:
        console.log(`退出: ${message.data ?? "理由なし"}`);
        break;
    }

    // 全クライアントにブロードキャスト
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`Echo: ${JSON.stringify(message)}`);
      }
    });
  });

  // 切断
  ws.on("close", () => {
    console.log("❌ クライアント切断");
  });
});

console.log("🚀 WebSocket サーバー起動: ws://localhost:8080");