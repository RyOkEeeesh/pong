import { THREE, ThreeApp } from './ThreeModule';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { GameContext, Paddle, Stage } from './gameCore';
import { GameMode, GameStatus } from './manager';
import { Controller } from './control';
import { CPU, CPUMode } from './cpu';
import { Effect } from './effect';
import { GameModeHandler, SingleMode } from './mode';

export type players = 'p1' | 'p2';

export class Game extends ThreeApp {

  #context: GameContext = new GameContext();
  #stage: Stage = new Stage(this.#context);
  #effect: Effect = new Effect(this.#context.GameManager).init(super.scene);
  #gameMode!: GameModeHandler;

  #isProcessing: boolean = false;

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
    switch (mode) {
      case GameMode.Selecting:
        break;
      case GameMode.Single:
        this.#gameMode = new SingleMode(this);
        if (this.#gameMode instanceof SingleMode) this.#gameMode.initCPU(CPUMode.Hard);
        break;
      case GameMode.Duo:
        break;
      case GameMode.Multi:
        break;
    }
  }

  setStatus(status: GameStatus) {
    this.#context.GameManager.gameStatus = status;
  }

  hasService():Paddle {
    return !this.#context.PointManager.pointGetter ? this.stage.p1 : this.stage.p2;
  }

  private handle(promise: Promise<any>, nextStatus?: GameStatus) {
    this.#isProcessing = true;
    promise
      .then(() => {if (nextStatus) this.context.GameManager.gameStatus = nextStatus;})
      .catch(err => console.error(err))
      .finally(() => this.#isProcessing = false);
  }

  processingGameStatus() {
    this.#gameMode.update();
    console.log(this.#context.GameManager.gameStatus);

    switch (this.context.GameManager.gameStatus) {

      case GameStatus.First:
        this.#gameMode.first();
        if (this.#isProcessing) return;
        this.handle(this.#gameMode.asFirst(), GameStatus.Serving);
        break;

      case GameStatus.Serving:
        this.#gameMode.serving();
        if (this.#isProcessing) return;
        this.handle(this.#gameMode.asServing(), GameStatus.Playing);
        break;

      case GameStatus.Playing:
        this.#gameMode.playing();
        if (this.#isProcessing) return;
        this.handle(this.#gameMode.asPlaying());
        break;

      case GameStatus.GetPoint:
        this.#gameMode.getPoint();
        if (this.#isProcessing) return;
        this.handle(this.#gameMode.asGetPoint(), GameStatus.Serving)
        break;

      case GameStatus.End:
        this.#gameMode.end();
        if (this.#isProcessing) return;
        this.handle(this.#gameMode.asEnd());
        break;
    }
  }

  get stage() { return this.#stage; }
  get context() { return this.#context; }
  get effect() { return this.#effect; }
};

const game = new Game();

game.setMode(GameMode.Single);

game.onBeforeRender(() => {
  game.processingGameStatus();
});

game.start();