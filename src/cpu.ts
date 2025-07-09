import { THREE } from './ThreeModule';
import { normalize, Paddle } from "./gameCore";
import { GameManager, GameStatus } from './manager';

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
    predictedTargetX: number | null,
    waitMoving: number | null
  } = {
    speed: 0,
    missChance: 0,
    precision: 0,
    serviceToMoveCenter: false,
    predictedTargetX: null,
    waitMoving: null
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
        this.#CPUStatus.speed = this.manager.defSpeed - 10;
        this.#CPUStatus.missChance = 0.5;
        this.#CPUStatus.precision = 8;
        break;
      
      case CPUMode.Normal:
        this.#CPUStatus.speed = this.manager.defSpeed - 7.5;
        this.#CPUStatus.missChance = 0.3;
        this.#CPUStatus.precision = 6;
        break;
      
      case CPUMode.Hard:
        this.#CPUStatus.speed = this.manager.defSpeed - 5;
        this.#CPUStatus.missChance = 0.2;
        this.#CPUStatus.precision = 4;
        break;
    }
  }

  centar(dt?: number) {
    if (this.#paddle.position.x === 0) return true;
    const targetX = 0;
    const deltaTime = dt ?? this.manager.deltaTime;
    const dx = targetX - this.#paddle.position.x;
    const moveX = Math.sign(dx);
    const speed = this.manager.gameStatus === GameStatus.Serving ? 15 : this.#CPUStatus.speed;
    const step = moveX * speed * deltaTime;

    if (Math.abs(dx) <= Math.abs(step)) {
      this.#paddle.position.x = 0;
      return true;
    } else {
      this.#paddle.position.x += step;
      return false;
    }
  }

  move() {
    const speed = this.#CPUStatus.speed * this.manager.deltaTime;
    const paddleZ = this.#paddle.position.z;
    const ballZ = this.manager.ball.position.z;
    const velocityZ = this.manager.velocity.z;

    if (velocityZ >= 0) {
      if (this.#mode === CPUMode.Hard) {
        const now = performance.now();
        if (this.#CPUStatus.waitMoving === null) this.#CPUStatus.waitMoving = now;
        else if (now - this.#CPUStatus.waitMoving >= 500 && this.centar()) this.#CPUStatus.waitMoving = null;
      }
      return;
    } else {
      this.#CPUStatus.waitMoving = null;
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

  async moveCenter() { 
    this.#CPUStatus.serviceToMoveCenter = true;
    let time = performance.now();
    await new Promise(resolve => {
      const animate = (now: number) => {
        const deltaTime = (now - time) / 1000;
        time = now;
        this.centar(deltaTime) ? resolve(null) : requestAnimationFrame(animate);
      };
      animate(performance.now());
     });
  }

  async serve() {
    await this.moveCenter();
    await new Promise(resolve => setTimeout(() => resolve(null), Math.random() * 1000));
    this.#paddle.refectPaddle();
  }

  resetPredict() { this.#CPUStatus.predictedTargetX = null; }
}