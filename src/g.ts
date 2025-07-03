import { THREE, ThreeApp } from './ThreeModule';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { GameContext, Stage } from './gameCore';
import { GameMode, GameStatus } from './manager';
import { Controller } from './control';
import { CPU, CPUMode } from './cpu';


class Game extends ThreeApp {

  #context: GameContext = new GameContext();
  #stage: Stage = new Stage(this.#context);

  constructor() {
    super({
      cameraPosition: { y: 20, z: 16 },
      controls: true,
      composer: true
    });
    THREE.Mesh.prototype.raycast = acceleratedRaycast;
    this.init();
  }

  init() {
    super.addScene(this.#stage.ball.mesh, ...this.#stage.hitObjects.map(obj => obj.mesh));
    this.setBVH(...this.#stage.hitObjects.map(obj => obj.mesh));
    super.onBeforeRender(() => this.#context.GameManager.deltaTime = Math.min(this.#context.GameManager.clock.getDelta(), 0.05));
  }

  setBVH(...objects: THREE.Mesh[]) { objects.forEach(obj => obj.geometry.boundsTree = new MeshBVH(obj.geometry)); }

  setMode(mode: GameMode) {
    this.#context.ModeManager.mode = mode;
    switch (mode) {
      case GameMode.Selecting:
      case GameMode.Single:
      case GameMode.Duo:
      case GameMode.Multi:
    }
  }

  setStatus(status: GameStatus) {
    this.#context.GameManager.gameStatus = status;
  }

  get stage() { return this.#stage; }
  get context() { return this.#context; }
};

const game = new Game();
const controller = new Controller(game.context);
const cpu = new CPU(game.context.GameManager).init(game.stage.p2);
cpu.setMode(CPUMode.Easy);

function processingGameStatus() {
  switch (game.context.GameManager.gameStatus) {
    case GameStatus.First:
      // サービス権のランダム設定
      // 設定後サービスアニメーション
      first();
      break;
    case GameStatus.Serving:
      // パドル移動とボール移動の処理
      // スペースまたは10秒でボール発射
      serving();
      break;
    case GameStatus.Playing:
      // 壁やパドルの衝突処理
      playing();
      break;
    case GameStatus.GetPoint:
      // サービス絵の移動
      getPoint();
      break;
    case GameStatus.Pause:
      // 一時停止処理
      pause();
      break;
    case GameStatus.End:
      // ゲームが終わった後の処理
      end();
      break;
  }
}

async function first() {
  await game.stage.ball.animateServePosition( game.context.PointManager.pointGetter ? game.stage.p1 : game.stage.p2 );
  game.context.GameManager.gameStatus = GameStatus.Serving;
}

function serving() {
  
// async function waitForServeOrTimeout(timeout = 10000): Promise<void> {
//   return new Promise(resolve => {
//   const timer = setTimeout(() => {
//   window.removeEventListener('keydown', onKeyDown);
//   resolve();
//   }, timeout);

//   const onKeyDown = (e: KeyboardEvent) => {
//   if (e.code === 'Space') {
//   clearTimeout(timer);
//   window.removeEventListener('keydown', onKeyDown);
//   resolve();
//   }
//   };
//   window.addEventListener('keydown', onKeyDown);
//   });
// }

}

function playing() {
  game.stage.ball.add();
  controller.control(game.stage.p1);
  cpu.move();
  const manager = game.context.GameManager;
  if (manager.gameStatus === GameStatus.Playing) {
    for (const offset of game.stage.ball.getOffsets()) {
      const origin = game.stage.ball.position.clone().add(offset);
      const raycaster = new THREE.Raycaster(
        origin,
        game.context.GameManager.velocity.clone().normalize(),
        0,
        game.context.GameManager.velocity.clone().multiplyScalar(game.context.GameManager.deltaTime).length() + 0.05
      );
      for (const obj of game.stage.hitObjects) {
        const hit = obj.onHit(raycaster);
        if ( hit ) {
          // シングルの時だけ
          // if (game.context.ModeManager.mode === GameMode.Single) {
            cpu.resetPredict();
          // }
          

          // エフェクト処理
          break;
        }
      }
    }
  }
}

async function getPoint() {
  // effect
  await game.stage.ball.animateServePosition( game.context.PointManager.pointGetter ? game.stage.p1 : game.stage.p2 );7
  game.context.GameManager.gameStatus = GameStatus.Serving;
}

function pause() {

}

function end() {

}

game.onBeforeRender(() => {
  processingGameStatus();
});

game.start();