import { THREE, ThreeApp } from './ThreeModule';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { GameContext, Paddle, Stage } from './gameCore';
import { GameMode, GameStatus } from './manager';
import { Controller } from './control';
import { CPU, CPUMode } from './cpu';
import { Effect } from './effect';


class Game extends ThreeApp {

  #context: GameContext = new GameContext();
  #stage: Stage = new Stage(this.#context);
  #effect: Effect = new Effect(this.#context.GameManager).init(super.scene);

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
    super.addScene(this.#stage.ball.mesh, ...this.#stage.hitObjects.map(obj => obj.mesh), this.stage.floor, this.#stage.displays);
    this.setBVH(...this.#stage.hitObjects.map(obj => obj.mesh));
    super.onBeforeRender(() => this.#context.GameManager.deltaTime = Math.min(this.#context.GameManager.clock.getDelta(), 0.05));
    this.initEffect();
  }

  initEffect() {
    const effect = this.#effect;
    this.stage.p1.initEffect(effect, this.stage.wallBefore.mesh);
    this.stage.p2.initEffect(effect, this.stage.wallAfter.mesh);
    this.stage.wallLeft.initEffect(effect, this.stage.wallLeft.mesh);
    this.stage.wallRight.initEffect(effect, this.stage.wallRight.mesh);
  }

  setBVH(...objects: THREE.Mesh[]) { objects.forEach(obj => obj.geometry.boundsTree = new MeshBVH(obj.geometry)); }

  setMode(mode: GameMode) {
    this.#context.ModeManager.mode = mode;
    // switch (mode) {
    //   case GameMode.Selecting:
    //   case GameMode.Single:
    //   case GameMode.Duo:
    //   case GameMode.Multi:
    // }
  }

  setStatus(status: GameStatus) {
    this.#context.GameManager.gameStatus = status;
  }

  hasService():Paddle {
    return !this.#context.PointManager.pointGetter ? this.stage.p1 : this.stage.p2;
  }

  get stage() { return this.#stage; }
  get context() { return this.#context; }
  get effect() { return this.#effect; }
};

const game = new Game();
const controller = new Controller(game.context).init(game.stage.p1);
const cpu = new CPU(game.context.GameManager).init(game.stage.p2);
cpu.setMode(CPUMode.Hard);

let isProcessing = false;

function processingGameStatus() {
  switch (game.context.GameManager.gameStatus) {
    case GameStatus.First:
      // サービス権のランダム設定
      // 設定後サービスアニメーション
      if (isProcessing) return;
      isProcessing = true;
      toServing().finally(() => isProcessing = false);
      // cpuが真ん中に戻る処理を追加する
      break;
    case GameStatus.Serving:
      // パドル移動とボール移動の処理
      // スペースまたは10秒でボール発射
      servingControl();
      if (isProcessing) return;
      isProcessing = true;
      serving().finally(() => {isProcessing = false;});
      break;
    case GameStatus.Playing:
      // 壁やパドルの衝突処理
      playing();
      break;
    case GameStatus.GetPoint:
      // サービスへの移動
      if (isProcessing) return;
      isProcessing = true;
      getPoint().finally(() => isProcessing = false);
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

// GameStatus
// First or GetPoint

async function toServing() {
  await game.stage.ball.animateServePosition(game.hasService());
  game.context.GameManager.gameStatus = GameStatus.Serving;
}

// Serving
function servingControl() {
  controller.control();
  game.stage.ball.changeServePosition(game.hasService());
}

async function serving() {
  if ( game.context.PointManager.pointGetter ) await cpu.serve();
  else await controller.serve();
  // await controller.serve();
  game.stage.ball.resetServePosition();
  game.context.GameManager.gameStatus = GameStatus.Playing;
};

// Playing

function playing() {
  game.stage.ball.add();
  controller.control();
  cpu.move();
  const manager = game.context.GameManager;

  for (const offset of game.stage.ball.offsets) {
    const origin = game.stage.ball.position.clone().add(offset);
    const frameVelocity = game.context.GameManager.velocity.clone().multiplyScalar(game.context.GameManager.deltaTime).length();
    const raycaster = new THREE.Raycaster(
      origin,
      game.context.GameManager.velocity.clone().normalize(),
      0,
      frameVelocity + 0.085
    );
    for (const obj of game.stage.hitObjects) {
      const hit = obj.onHit(raycaster);
      if ( hit ) {
        // シングルの時だけ
        // if (game.context.ModeManager.mode === GameMode.Single) {
          cpu.resetPredict();
        // }
        if (manager.gameStatus !== GameStatus.Playing) return;

        obj.effect?.(hit); // エフェクトfalseの時はやめるようにできたらいいね

        break;
      }
    }
  }
}

// GetPoint

async function getPoint() {
  await game.effect.blinkingEffect(game.stage.wallMat);
  await toServing();
}

function pause() {

}

function end() {

}

game.onBeforeRender(() => {
  processingGameStatus();
});

game.start();