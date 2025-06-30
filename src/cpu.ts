import { THREE } from './ThreeModule';
import { normalize, GameManager, Paddle } from "./gameCore";

export enum CPUMode {
  Easy,
  Normal,
  Hard
};

export enum CPUStatus {
  Waiting,
  Moving,
  Serving
};

export class CPU {
  #mode!: CPUMode;
  #paddle!: Paddle;

  #CPUStatus: {
    speed: number,
    missChance: number,
    precision: number,
    serviceToMoveCenter: boolean,
    predictedTargetX: number | null
  } = {
    speed: 0,
    missChance: 0,
    precision: 0,
    serviceToMoveCenter: false,
    predictedTargetX: null
  }

  constructor(private manager: GameManager) {}

  init(paddle: Paddle) { 
    this.#paddle = paddle;
    return this;
  }

  setMode(mode: CPUMode) {
    this.#mode = mode;
    switch (mode) {
      case CPUMode.Easy:
        this.#CPUStatus.speed = this.manager.speed - 10;
        this.#CPUStatus.missChance = 0.5;
        this.#CPUStatus.precision = 8;
        break;
      
      case CPUMode.Normal:
        this.#CPUStatus.speed = this.manager.speed - 7.5;
        this.#CPUStatus.missChance = 0.3;
        this.#CPUStatus.precision = 6;
        break;
      
      case CPUMode.Hard:
        this.#CPUStatus.speed = this.manager.speed - 5;
        this.#CPUStatus.missChance = 0.1;
        this.#CPUStatus.precision = 4;
        break;
    }
  }

  move() {
    const speed = this.#CPUStatus.speed * this.manager.deltaTime;
    const paddleZ = this.#paddle.position.z;
    const ballZ = this.manager.ball.position.z;
    const velocityZ = this.manager.velocity.z;

    if (velocityZ >= 0) {
      this.#CPUStatus.predictedTargetX = null;
      // ハードモードは真ん中に戻る処理追加
      if (this.#mode === CPUMode.Hard) {

      }
      return;
    }

    if (this.#CPUStatus.predictedTargetX === null) {
      const timeToReach = Math.abs((paddleZ - ballZ) / velocityZ);
      const noise = Math.random() < this.#CPUStatus.missChance ? (Math.random() - 0.5) * this.#CPUStatus.precision : 0 ;
      const randomHitOffset = (Math.random() * 2 - 1) * this.#paddle.halfX();
      this.#CPUStatus.predictedTargetX = this.manager.ball.position.x + this.manager.velocity.x * timeToReach + noise + randomHitOffset;
    }

    const direction = this.#CPUStatus.predictedTargetX - this.#paddle.position.x;
    const clampMove = THREE.MathUtils.clamp(direction, -speed, speed);
    this.#paddle.move(normalize(clampMove, -this.manager.width / 2, this.manager.width / 2));

  }

  resetPredict() { this.#CPUStatus.predictedTargetX = null; }
}