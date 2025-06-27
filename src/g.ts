import { THREE, ThreeApp } from './ThreeModule';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import * as gc from './gameCore';


class Game extends ThreeApp {
  stageHeight: number = 28;
  stageWidth: number = this.stageHeight / 5 * 4;

  #manager: gc.GameManager = new gc.GameManager({
    w: this.stageWidth,
    h: this.stageHeight
  });
  #stage: gc.Stage = new gc.Stage(this.#manager);

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
    super.onBeforeRender(() => this.#manager.deltaTime = Math.min(this.#manager.clock.getDelta(), 0.1));
  }

  setBVH(...objects: THREE.Mesh[]) { objects.forEach(obj => obj.geometry.boundsTree = new MeshBVH(obj.geometry)); }

  get stage() { return this.#stage; }

  get manager() { return this.#manager; }
};

const game = new Game();

game.onBeforeRender(() => {
  game.stage.ball.add()
  if (game.manager.gameStatus === gc.GameStatus.Playing) {
    for (const offset of game.stage.ball.getOffsets()) {
      const origin = game.stage.ball.mesh.position.clone().add(offset);
      const raycaster = new THREE.Raycaster(
        origin,
        game.manager.velocity.clone().normalize(),
        0,
        game.manager.velocity.clone().multiplyScalar(game.manager.deltaTime).length() * 2
      );
      for (const obj of game.stage.hitObjects) {
        if ( obj.onHit(raycaster) ) break;
      }
    }
  }
  if (game.manager.gameStatus !== gc.GameStatus.Playing) game.manager.gameStatus = gc.GameStatus.Playing;
});

game.start();