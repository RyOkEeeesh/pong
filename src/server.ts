import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import { GameCore } from './serverCore.ts';
import { ClientMsg, InitMsg, JoinMsg, MsgType, Player, ReadyMsg, RoleStatus, ServerMsg, ServerStatus } from "./constants.ts";

interface BeforeData {
  beforeSendPlayers: Player[];
}

interface ExtWebSocket extends WebSocket, BeforeData, Player{};

const wss = new WebSocketServer({ host: '0.0.0.0', port: 8080 });

const game = new GameCore();

const serverStatus: {
  now: ServerStatus,
  before: ServerStatus | null,
  set: (s: ServerStatus) => void;
} = {
  now: ServerStatus.Lobby,
  before: null,
  set: s => {
    serverStatus.before = serverStatus.now;
    serverStatus.now = s;
  }
}

let players: ExtWebSocket[] = [];

// let interval: NodeJS.Timeout | null = null;

let guestNo = 1;

function getPlayers(): Player[] {
  if (players.length === 0) return [];
  return [ ...players.map(p => ({
    name: p.name,
    id: p.id,
    role: p.role,
    ready: p.ready
  })) ];
}

function getInitMsg(ws: ExtWebSocket): InitMsg | null {
  const currentPlayers = getPlayers();

  const changed: Player[] = ws.beforeSendPlayers.length === 0
  ? currentPlayers
  : currentPlayers.filter(p => {
      const before = ws.beforeSendPlayers.find(bp => bp.id === p.id);
      if (!before) return true;
      if (before.role !== p.role || before.ready !== p.ready) return true; // 状態変化
      return false;
    }); ;

  ws.beforeSendPlayers = currentPlayers;
  
  if (changed.length === 0) return null;
  return {
    type: MsgType.Init,
    players: changed,
  };
}

wss.on("connection", (ws: ExtWebSocket, req) => {
  if (wss.clients.size > 22) {
    ws.close(1013, "Server busy"); // 1013 = Try again later
    return;
  }

  players.push(ws);

  ws.name = (Array.isArray(req.headers['x-username']) ? req.headers['x-username'][0] : req.headers['x-username']) ?? `Guest${guestNo++}`;
  ws.id = randomUUID();
  ws.ready = false;
  ws.beforeSendPlayers = [];
  const joinMsg: JoinMsg = {
    type: MsgType.Join,
    id: ws.id
  };
  ws.send(JSON.stringify(joinMsg));
  console.log(`${ws.name} joined the game.`);

  if (players.every(p => p.role !== RoleStatus.P1)) ws.role = RoleStatus.P1;
  else if (players.every(p => p.role !== RoleStatus.P2)) ws.role = RoleStatus.P2;
  else ws.role = RoleStatus.Spectator;

  players.forEach(p => {
    const msg = getInitMsg(p);
    if (msg) p.send(JSON.stringify(msg));
  });

  ws.on("message", (msg: string) => {
    const message: ClientMsg = JSON.parse(msg);

    if (message.type === MsgType.RequestRole && ws.role !== message.role) {
      ws.ready = false;
      if (message.role === RoleStatus.Spectator) {
        ws.role = RoleStatus.Spectator;
      } else if (players.every(p => p.role !== message.role)) {
        ws.role = message.role;
      }

      players.forEach(p => {
        const msg = getInitMsg(p);
        if (msg) p.send(JSON.stringify(msg));
      });
      return;
    }

    if (message.type === MsgType.Ready) {
      if (ws.role !== RoleStatus.Spectator) {
        ws.ready = message.readyStatus;

        players.forEach(p => {
          const msg = getInitMsg(p);
          if (msg) p.send(JSON.stringify(msg));
        });

        if (players.filter(p => p.role !== RoleStatus.Spectator && p.ready).length === 2) { // プレイヤー2人が準備完了したのでゲームを開始する
          serverStatus.set(ServerStatus.Game);
          console.log('Game start!');
          game.reset();
          game.start();
        }
      }
    }


  });

  ws.on("close", () => {
    console.log(`${ws.name} left the game.`);
    players = players.filter(p => p.id !== ws.id);
    players.forEach(p => {
      const msg = getInitMsg(p);
      if (msg) p.send(JSON.stringify(msg));
    });
  });
});

console.log("🚀 WebSocket サーバー起動: ws://localhost:8080");