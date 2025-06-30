import { THREE, ThreeApp } from './ThreeModule';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import * as gc from './gameCore';
import { CPU, CPUMode } from './cpu';


class Game extends ThreeApp {

  #context: gc.GameContext = new gc.GameContext();
  #stage: gc.Stage = new gc.Stage(this.#context.GameManager);

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

  get stage() { return this.#stage; }

  get context() { return this.#context; }
};

const game = new Game();
const controller = new gc.Controller(game.context);
const cpu = new CPU(game.context.GameManager).init(game.stage.p2);
cpu.setMode(CPUMode.Normal);


game.onBeforeRender(() => {
  game.stage.ball.add();
  controller.control(game.stage.p1);
  cpu.move();
  const manager = game.context.GameManager;
  if (manager.gameStatus === gc.GameStatus.Playing) {
    for (const offset of game.stage.ball.getOffsets()) {
      const origin = game.stage.ball.position.clone().add(offset);
      const raycaster = new THREE.Raycaster(
        origin,
        game.context.GameManager.velocity.clone().normalize(),
        0,
        game.context.GameManager.velocity.clone().multiplyScalar(game.context.GameManager.deltaTime).length() + 0.05
      );
      for (const obj of game.stage.hitObjects) {
        if ( obj.onHit(raycaster) ) {

          // シングルの時だけ
          cpu.resetPredict();

          // エフェクト処理
          break;
        }
      }
    }
  }
  if (manager.gameStatus !== gc.GameStatus.Playing) manager.gameStatus = gc.GameStatus.Playing;
});

game.start();