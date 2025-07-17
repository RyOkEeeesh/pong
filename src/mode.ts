import { GameStatus } from "./manager";
import { Game } from "./g";
import { CPU, CPUMode } from "./cpu";
import { THREE } from "./ThreeModule";
import { Controller } from "./control";

export abstract class GameModeHandler {
  constructor(protected game: Game) {}
  async toServing() { await this.game.stage.ball.animateServePosition(this.game.hasService()); }
  abstract update(): void;
  abstract first(): void;
  abstract asFirst(): Promise<void>;
  abstract serving(): void;
  abstract asServing(): Promise<void>;
  abstract playing(): void;
  abstract asPlaying(): Promise<void>;
  abstract getPoint(): void;
  abstract asGetPoint(): Promise<void>;
  abstract end(): void;
  abstract asEnd(): Promise<void>;
}


export class SingleMode extends GameModeHandler {
  #controller!: Controller;
  #cpu = new CPU(this.game.context.GameManager).init(this.game.stage.p2); 

  constructor(game: Game ) { 
    super(game);
    this.init();
  }

  init() {
    this.#controller = new Controller(this.game).init('p1');
    // パドル初期化
    // p1 自分 p2 cpu に変更
  }

  initCPU(m: CPUMode) { this.#cpu.setMode(m); }

  override update(): void {
    this.#controller.control();
  }

  first(): void {
    if (this.#controller.acceptMove) this.#controller.acceptMove = false;
  }

  async asFirst(): Promise<void> {
    await new Promise(resolve => setTimeout(() => resolve(null), 1000));
    await this.toServing();
  }

  serving(): void {
    if (!this.#controller.acceptMove) this.#controller.acceptMove = true;
    this.game.stage.ball.changeServePosition(this.game.hasService());
  }

  async asServing(): Promise<void> {
    this.game.context.PointManager.pointGetter ? 
      await this.#cpu.serve():
      await this.#controller.serve();
    this.game.stage.ball.resetServePosition();
  }

  playing() {
    if (!this.#controller.acceptMove) this.#controller.acceptMove = true;
    this.game.stage.ball.add();
    this.#cpu.move();
    const manager = this.game.context.GameManager;

    for (const offset of this.game.stage.ball.offsets) {
      const origin = this.game.stage.ball.position.clone().add(offset);
      const frameVelocity = manager.velocity.clone().multiplyScalar(this.game.context.GameManager.deltaTime).length();
      const raycaster = new THREE.Raycaster(
        origin,
        manager.velocity.clone().normalize(),
        0,
        frameVelocity + 0.085
      );
      for (const obj of this.game.stage.hitObjects) {
        const hit = obj.onHit(raycaster);
        if ( hit ) {
            this.#cpu.resetPredict();
            if (manager.gameStatus !== GameStatus.Playing) return;

            obj.effect?.(hit); // エフェクトfalseの時はやめるようにできたらいいね

          break;
        }
      }
    }
  }
  
  async asPlaying(): Promise<void> {}

  getPoint(): void {
    this.#controller.acceptMove = false;
  }

  async asGetPoint() {
    await this.game.effect.blinkingEffect(this.game.stage.wallMat);
    await this.toServing();
  }

  end(): void {
    this.#controller.acceptMove = false;
  }

  async asEnd(): Promise<void> {
    
  }
}