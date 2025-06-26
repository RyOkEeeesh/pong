import { THREE, ThreeApp } from './ThreeModule';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import * as gc from './gameCore';


class Game extends ThreeApp {
  stageHeight: number = 28;
  stageWidth: number = this.stageHeight / 5 * 4;

  defBallSpeed = 25;
  ballSpeed: number = this.defBallSpeed;
  ballVelocity: THREE.Vector3 = new THREE.Vector3(0.1, 0, 0.1).normalize().multiplyScalar(this.ballSpeed);
  acceleration: number = 0.2;

  #manager: gc.GameManager = new gc.GameManager({
    w: this.stageWidth,
    h: this.stageHeight
  });
  #stage: gc.Stage = new gc.Stage(this.#manager);

  constructor() {
    super({
      cameraPosition: {y: 20, z: 16 },
      controls: true,
      composer: true
    });
    THREE.Mesh.prototype.raycast = acceleratedRaycast;
    this.init();
  }

  init() {
    super.addScene(this.#stage.ball.mesh, ...this.#stage.hitObjects);
    this.setBVH(...this.#stage.hitObjects);
    super.onBeforeRender(() => this.#manager.deltaTime = this.#manager.clock.getDelta());
  }

  setBVH(...objects: THREE.Mesh[]) {
    objects.forEach(obj => obj.geometry.boundsTree = new MeshBVH(obj.geometry))
  }

  get stage() {
    return this.#stage;
  }
}

const game = new Game();

game.onBeforeRender(() => game.stage.ball.add())

game.start();