import { THREE, ThreeApp, RenderPass, fitObject } from './ThreeModule';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { GameContext, mod, Paddle, Stage } from './gameCore';
import { GameMode, GameStatus } from './manager';
import { Effect } from './effect';
import { DuoMode, GameModeHandler, SelectingMode, SingleMode } from './mode';

export type players = 'p1' | 'p2';

export class Game extends ThreeApp {

  #context: GameContext = new GameContext();
  #stage: Stage = new Stage(this);
  #effect: Effect = new Effect(this.#context.GameManager).init(super.scene);
  #gameMode!: GameModeHandler;

  #cameras: THREE.PerspectiveCamera[] = []
  #camNo: number = 0;

  #isProcessing: boolean = false;

  constructor() {
    super({
      cameraPosition: { y: 30, z: 10 },
      controls: false,
      composer: true
    });
    THREE.Mesh.prototype.raycast = acceleratedRaycast;
    this.init();
  }

  init() {
    super.addScene(this.#stage.ball.mesh, this.#stage.mesh, this.#stage.p1.mesh, this.#stage.p2.mesh, this.#stage.floor, this.#stage.displays);
    this.setBVH(...this.#stage.hitObjects.map(obj => obj.mesh));
    super.onBeforeRender(() => this.#context.GameManager.deltaTime = Math.min(this.#context.GameManager.clock.getDelta(), 0.05));
    this.initCameras();
    this.initObjectEffect();
    super.onBeforeRender(() => this.processingGameStatus());
  }

  initCameras() {
    super.camera.position.set(0, 17, 10);
    super.camera.lookAt(new THREE.Vector3(0, 0, 3.5));
    fitObject(super.camera, this.#stage.mesh, 1.1);
    this.#cameras.push(super.camera.clone());

    const c1 = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    c1.position.y = 37;
    c1.lookAt(new THREE.Vector3());
    this.#cameras.push(c1);

    const c2 = c1.clone();
    c2.position.y = 30;
    c2.up.set(-1, 0, 0);
    c2.lookAt(new THREE.Vector3());
    this.#cameras.push(c2);
  }

  initObjectEffect() {
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
        this.#gameMode = new SelectingMode(this);
        break;
      case GameMode.Single:
        this.#gameMode = new SingleMode(this);
        break;
      case GameMode.Duo:
        this.#gameMode = new DuoMode(this);
        break;
      case GameMode.Multi:
        break;
    }
  }

  setStatus(status: GameStatus) { this.#context.GameManager.gameStatus = status; }

  setCamera(n: number) {
    this.#camNo += n;
    const i = mod(this.#camNo, this.#cameras.length);
    this.camera = this.#cameras[i];
    if (this.composer) {
      const renderPass = this.composer.passes.find(pass => pass instanceof RenderPass) as RenderPass;
      if (renderPass) renderPass.camera = this.camera;
    }
  }

  hasService():Paddle {
    return !this.#context.PointManager.pointGetter ? this.stage.p1 : this.stage.p2;
  }

  private handle(promise: Promise<any>, nextStatus?: GameStatus) {
    this.#isProcessing = true;
    promise
      .then(() => { if (nextStatus !== undefined) this.setStatus(nextStatus); })
      // .catch(err => console.error(err))
      .finally(() => this.#isProcessing = false);
  }

  processingGameStatus() {
    this.#gameMode.update();

    switch (this.context.GameManager.gameStatus) {

      case GameStatus.Wainting:
        this.#gameMode.waiting();
        if (this.#isProcessing) return;
        this.handle(this.#gameMode.asWainting(), GameStatus.First);
        break;

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
        this.handle(this.#gameMode.asGetPoint(), this.#gameMode.isEnd() ? GameStatus.End : GameStatus.Serving);
        break;

      case GameStatus.End:
        this.#gameMode.end();
        if (this.#isProcessing) return;
        this.handle(this.#gameMode.asEnd(), GameStatus.Wainting);
        break;
    }
  }

  get stage() { return this.#stage; }
  get context() { return this.#context; }
  get effect() { return this.#effect; }
  get gameMode() { return this.#gameMode; }
}