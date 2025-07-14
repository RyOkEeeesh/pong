import { GameStatus } from "./manager";
import { Game } from "./g";
import { CPU, CPUMode } from "./cpu";
import { THREE } from "./ThreeModule";

export abstract class GameModeHandler {
  constructor(protected game: Game) {}
  async toServing() {
    await this.game.stage.ball.animateServePosition(this.game.hasService());
  }
  abstract update(): void;
  abstract servingControl(): void;
  abstract serving(): Promise<void>;
  abstract playing(): void;
  abstract getPoint(): Promise<void>;
  abstract pause(): Promise<void>;
  abstract end(): void;
}


export class SingleMode extends GameModeHandler {
  #cpu = new CPU(this.game.context.GameManager).init(this.game.stage.p2); 

  constructor(game: Game ) { 
    super(game);
    this.init();
  }

  init() {
    // パドル初期化
    // p1 自分 p2 cpu に変更
  }

  initCPU(m: CPUMode) { this.#cpu.setMode(m); }

  update(): void {
    // ゲームの状態更新
  }

  servingControl(): void {
    this.game.controller.control();
    this.game.stage.ball.changeServePosition(this.game.hasService());
  }

  async serving(): Promise<void> {
    if ( this.game.context.PointManager.pointGetter ) await this.#cpu.serve();
    else await this.game.controller.serve();
    this.game.stage.ball.resetServePosition();
  }

  playing() {
    this.game.stage.ball.add();
    this.game.controller.control();
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

  async getPoint() {
    await this.game.effect.blinkingEffect(this.game.stage.wallMat);
    await this.toServing();
  }

  async pause(): Promise<void> {
    
  }

  end(): void {
    
  }
}