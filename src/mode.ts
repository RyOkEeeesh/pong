import { GameStatus } from "./manager";
import { Game } from "./game";
import { CPU, CPUMode } from "./cpu";
import { THREE } from "./ThreeModule";
import { Controller } from "./control";
import { blinkingEffect } from "./effect";

export abstract class GameModeHandler {
  constructor(protected game: Game) {}
  async toServing() { await this.game.stage.ball.animatePosition( this.isEnd() ? null : this.game.hasService() ); }
  async WallBlinkingEffect() {
    await blinkingEffect([ 
      this.game.stage.wallMat
    ],{
      endtime: 0.25,
      difference: 0.15,
      times: 2
    });
  }
  isEnd() {
    if (this.game.context.PointManager.isEnd) {
      this.game.setStatus(GameStatus.End);
      return true;
    }
    return false;
  }
  async fnAsGetPoint() {
    await this.WallBlinkingEffect();
    if (this.isEnd()) await Promise.all([this.game.context.PointManager.endPointEffect(), this.toServing()]);
    else await this.toServing();
  }

  abstract update(): void;
  abstract waiting(): void;
  abstract asWainting(): Promise<void>;
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

export class SelectingMode extends GameModeHandler {
  #cpus: [CPU, CPU] = [new CPU(this.game.context.GameManager).init(this.game.stage.p1), new CPU(this.game.context.GameManager).init(this.game.stage.p2)]; 

  constructor(game: Game ) { 
    super(game);
    this.init();
  }

  init() {
    this.#cpus[0].setMode(CPUMode.Normal);
    this.#cpus[1].setMode(CPUMode.Normal);
  }

  override update(): void {}

  override waiting(): void {}

  override async asWainting(): Promise<void> {
    this.game.context.PointManager.acceptResetPoints = true;
    this.game.context.PointManager.reset();
    await new Promise(resolve => setTimeout(() => resolve(null), 1500));
  }

  override first(): void { this.game.context.PointManager.acceptResetPoints = false; }

  override async asFirst(): Promise<void> {
    await new Promise(resolve => setTimeout(() => resolve(null), 1000));
    await this.toServing();
  }

  override serving(): void { this.game.stage.ball.changeServePosition(this.game.hasService()); }

  override async asServing(): Promise<void> {
    await this.#cpus[Number(this.game.context.PointManager.pointGetter)].serve();
    this.game.stage.ball.resetServePosition();
  }

  override playing() {
    if (this.isEnd()) return;
    this.game.stage.ball.add();
    this.#cpus[0].move();
    this.#cpus[1].move();
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
            this.#cpus.forEach(cpu => cpu.resetPredict());
            if (manager.gameStatus !== GameStatus.Playing) return;
            obj.effect?.(hit); // エフェクトfalseの時はやめるようにできたらいいね
          break;
        }
      }
    }
  }

  override async asPlaying(): Promise<void> {}

  override getPoint(): void {}

  override async asGetPoint() { await this.fnAsGetPoint(); }

  override end(): void {}

  override async asEnd(): Promise<void> {}
}

export class SingleMode extends GameModeHandler {
  #player!: Controller;
  #cpu = new CPU(this.game.context.GameManager).init(this.game.stage.p2); 

  constructor(game: Game ) { 
    super(game);
    this.init();
  }

  init() { this.#player = new Controller(this.game).init('p1'); }

  initCPU(m: CPUMode) { this.#cpu.setMode(m); }

  override update(): void {
    this.#player.control();
  }

  override waiting(): void {}

  override async asWainting(): Promise<void> {
    this.game.context.PointManager.acceptResetPoints = true;
    this.game.context.PointManager.startTime();
    await this.#player.anyKeyDown();
    this.game.context.PointManager.stopTime();
  }

  override first(): void {
    this.game.context.PointManager.acceptResetPoints = false;
    this.#player.acceptMove = false;
  }

  override async asFirst(): Promise<void> {
    await new Promise(resolve => setTimeout(() => resolve(null), 1000));
    await this.toServing();
  }

  override serving(): void {
    this.#player.acceptMove = true;
    this.game.stage.ball.changeServePosition(this.game.hasService());
  }

  override async asServing(): Promise<void> {
    this.game.context.PointManager.pointGetter ? 
      await this.#cpu.serve():
      await this.#player.serve();
    this.game.stage.ball.resetServePosition();
  }

  override playing() {
    if (this.isEnd()) return;

    this.#player.acceptMove = true;
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
  
  override async asPlaying(): Promise<void> {}

  override getPoint(): void {
    if (this.isEnd()) return;
    this.#player.acceptMove = false;
  }

  override async asGetPoint() {
    await this.fnAsGetPoint();
  }

  override end(): void { this.#player.acceptMove = false; }

  override async asEnd(): Promise<void> {}
}

export class DuoMode extends GameModeHandler {
  #players!: [Controller, Controller]

  constructor(game: Game ) { 
    super(game);
    this.init();
  }

  init() {
    this.#players = [new Controller(this.game).init('p1'), new Controller(this.game).init('p2')];
    this.#players[0].camChange = false;
    this.game.setCamera(2)
  }

  override update(): void {
    this.#players[0].control();
    this.#players[1].control();
  }

  override waiting(): void {}

  override async asWainting(): Promise<void> {
    this.game.context.PointManager.acceptResetPoints = true;
    this.game.context.PointManager.startTime();
    await this.#players[0].anyKeyDown();
    this.game.context.PointManager.stopTime();
  }

  override first(): void {
    this.#players.forEach(p => { if (p.acceptMove) p.acceptMove = false; });
  }

  override async asFirst(): Promise<void> {
    this.game.context.PointManager.acceptResetPoints = false;
    await new Promise(resolve => setTimeout(() => resolve(null), 1000));
    await this.toServing();
  }

  override serving(): void {
    this.#players.forEach(p => { if (!p.acceptMove) p.acceptMove = true; });
    this.game.stage.ball.changeServePosition(this.game.hasService());
  }

  override async asServing(): Promise<void> {
    await this.#players[Number(this.game.context.PointManager.pointGetter)].serve();
    this.game.stage.ball.resetServePosition();
  }

  override playing() {
    if (this.isEnd()) return;

    this.#players[0].acceptMove = this.#players[1].acceptMove = true;
    this.game.stage.ball.add();
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
            if (manager.gameStatus !== GameStatus.Playing) return;

            obj.effect?.(hit); // エフェクトfalseの時はやめるようにできたらいいね

          break;
        }
      }
    }
  }

  override async asPlaying(): Promise<void> {}

  override getPoint(): void { this.#players[0].acceptMove = this.#players[1].acceptMove = false; }

  override async asGetPoint() { await this.fnAsGetPoint(); }

  override end(): void {}

  override async asEnd(): Promise<void> { this.#players[0].acceptMove = this.#players[1].acceptMove = false; }
}