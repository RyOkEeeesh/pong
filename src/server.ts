// import { WebSocketServer, WebSocket } from "ws";

import * as THREE from 'three';
import { GameStatus, PADDLE_POSITION_Z1, PADDLE_POSITION_Z2, STAGE_HEIGHT, STAGE_WIDTH } from "./constants";
import { SideWall, GoalWall, Paddle, Ball, delta, Context } from "./serverCore";

// // ポート8080でサーバー起動
// const wss = new WebSocketServer({ port: 8080 });

// wss.on("connection", (ws: WebSocket) => {
//   console.log("✅ クライアント接続");

//   // メッセージ受信
//   ws.on("message", (message: string) => {
//     console.log("📩 受信:", message);

//     // 全クライアントにブロードキャスト
//     wss.clients.forEach((client) => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(`Echo: ${message}`);
//       }
//     });
//   });

//   // 切断
//   ws.on("close", () => {
//     console.log("❌ クライアント切断");
//   });
// });

// console.log("🚀 WebSocket サーバー起動: ws://localhost:8080");

const offsets = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.5, 0, 0.5),
    new THREE.Vector3(-0.5, 0, 0.5),
    new THREE.Vector3(0.5, 0, -0.5),
    new THREE.Vector3(-0.5, 0, -0.5)
  ];

export class GameCore {
  #Walls = [new SideWall([-STAGE_WIDTH / 2, 0]), new SideWall([STAGE_WIDTH / 2, 0]), new GoalWall([0, STAGE_HEIGHT / 2]), new GoalWall([0, -STAGE_HEIGHT / 2])];
  #paddles = [new Paddle([0, PADDLE_POSITION_Z2]), new Paddle([0, PADDLE_POSITION_Z1])];
  #ball = new Ball();

  #interval!: NodeJS.Timeout | null;

  constructor() {}

  start() {
    this.#interval = setInterval(() => {
      this.#paddles[0].move();
      this.#paddles[1].move();

      switch (Context.gameStatus) {
        case GameStatus.Waiting:
        case GameStatus.First:
        case GameStatus.Serving:
        case GameStatus.Playing:
          {
            Context.updateBallPosition();
            const frameVelocity = Context.velocity.clone().multiplyScalar(delta).length();
            for (const offset of offsets) {
              const origin = Context.ballPosition.clone().add(offset);
              const ray = new THREE.Raycaster(
                origin,
                Context.velocity.clone().normalize(),
                0,
                frameVelocity + 0.09
              );

              for (const obj of [...this.#paddles, ...this.#Walls]) {
                const hit = obj.onHit(ray);
                if (hit) {
                  if (Context.gameStatus !== GameStatus.Playing) return;

                  // ヒットした値などをクライアントに送信
                  break;
                }
              }
            }
          }
          break;
        case GameStatus.GetPoint:
        case GameStatus.End:
        case GameStatus.Pause:
      }

      console.log(Context.ballPosition);
      this.#ball.setPosition();
    }, delta * 1000);
  }

  stop() {
    if (!this.#interval) return;
    clearInterval(this.#interval);
    this.#interval = null;
  }

  get walls() { return this.#Walls; }
  get paddles() { return this.#paddles; }
  get ball() { return this.#ball; }
}