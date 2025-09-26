import * as THREE from 'three';
import { BALL_SIZE, BALL_SPEED, FRICTION, GAME_POINT, GAME_POINT_MAX, GameStatus, PADDLE_1, PADDLE_2, PADDLE_HALF_X, PADDLE_HEIGHT, PADDLE_POSITION_Z1, PADDLE_POSITION_Z2, SIDE_1, SIDE_2, STAGE_HEIGHT, STAGE_WIDTH, WALL_DEPTH } from './constants.ts';

export const delta = 1 / 30;

interface Hit {
  normal: THREE.Vector2;
  hitPoint: THREE.Vector2;
}

interface ObjectHit extends Hit {
  name?: string;
}

type Context = {
  gameStatus: GameStatus;
  ballSpeed: number;
  ballPos: THREE.Vector2;
  velocity: THREE.Vector2;
  paddlePos: [number, number];
  pointGetter: boolean;
  points: [number, number];
  gamePoint: number;
  matchPoint: boolean;
  isFinish: boolean;
  serveHit: boolean;
  hit: ObjectHit | null;
}

interface GameContext {
  now: Context;
  before: Partial<Context>;

  setGameStatus: (s: GameStatus) => void;
  setBallSpeed: (s: number) => void;
  setBallPos: (pos: THREE.Vector2) => void;
  setVelocity: (v: THREE.Vector2) => void;
  setPaddlePos: (pos: [number, number]) => void;
  setPointGetter: (isP1: boolean) => void;
  setPoint: (p: [number, number]) => void;
  addPoint: () => void;
  addGamePoint: () => void;
  setMatchPoint: (s: boolean) => void;
  setIsFinish: () => void;
  setServeHit: (hit: boolean) => void;
  setHit: (hit: ObjectHit) => void;
}

const defGameContext: Context = {
  gameStatus: GameStatus.First,
  ballSpeed: BALL_SPEED,
  ballPos: new THREE.Vector2(),
  velocity: new THREE.Vector2(),
  paddlePos: [0, 1],
  pointGetter: Boolean(Math.round(Math.random())),
  points: [0, 0],
  gamePoint: GAME_POINT,
  matchPoint: false,
  isFinish: false,
  serveHit: false,
  hit: null
};

export class GameCore {
  #context: GameContext = {
    now: { ...defGameContext },
    before: {},

    setGameStatus: s => { this.#context.now.gameStatus = s; },
    setBallSpeed: s => { this.#context.now.ballSpeed = s; },
    setBallPos: pos => { this.#context.now.ballPos.copy(pos); },
    setVelocity: v => { this.#context.now.velocity.copy(v); },
    setPaddlePos: pos => { this.#context.now.paddlePos = pos; },
    setPointGetter: isP1 => { this.#context.now.pointGetter = isP1; },
    setPoint: p => { this.#context.now.points = p; },
    addPoint: () => {
      this.#context.now.points[Number(this.#context.now.pointGetter)]++;
      const max = Math.max( ...this.#context.now.points );
      if (this.#context.now.gamePoint - max === 1) {
        if (this.#context.now.points[0] === this.#context.now.points[1] && GAME_POINT_MAX - max === 1) {
          this.#context.addGamePoint();
          this.#context.setMatchPoint(false);
          return;
        } else {
          this.#context.setMatchPoint(true);
          return;
        }
      } else if (this.#context.now.gamePoint === max) {
        this.#context.setMatchPoint(false);
        this.#context.setIsFinish();
        return;
      }
    },
    addGamePoint: () => { this.#context.now.gamePoint = Math.min(this.#context.now.gamePoint + 1, GAME_POINT_MAX); },
    setMatchPoint: s => { this.#context.now.matchPoint = s; },
    setIsFinish: () => { this.#context.now.isFinish = true; },
    setServeHit: hit => { this.#context.now.serveHit = hit; },
    setHit: hit => { this.#context.now.hit = hit; }
  };

  #done: boolean = false;
  #accept: boolean = false;

  #walls: (SideWall | GoalWall)[] = [
    new SideWall(this.#context, [-STAGE_WIDTH / 2, 0]),
    new SideWall(this.#context, [STAGE_WIDTH / 2, 0]),
    new GoalWall(this.#context, [0, -STAGE_HEIGHT / 2]),
    new GoalWall(this.#context, [0, STAGE_HEIGHT / 2])
  ];

  #paddles: Paddle[] = [
    new Paddle(this.#context, [0, PADDLE_POSITION_Z2]),
    new Paddle(this.#context, [0, PADDLE_POSITION_Z1])
  ];

  #ball: Ball = new Ball(this.#context);

  #interval: NodeJS.Timeout | null = null;

  constructor() {
    this.sync();
  }

  getDiff(): Partial<Context> {
    const diff: Partial<Context> = {};
    const now = this.#context.now;
    const before = this.#context.before;

    if (now.gameStatus !== before.gameStatus) diff.gameStatus = now.gameStatus;
    if (now.ballSpeed !== before.ballSpeed) diff.ballSpeed = now.ballSpeed;
    if (!now.ballPos.equals(before.ballPos ?? new THREE.Vector2())) diff.ballPos = now.ballPos.clone();
    if (!now.velocity.equals(before.velocity ?? new THREE.Vector2())) diff.velocity = now.velocity.clone();
    if (!before.paddlePos || !now.paddlePos.every((v,i)=>v === before.paddlePos![i])) diff.paddlePos = now.paddlePos;
    if (now.pointGetter !== before.pointGetter) diff.pointGetter = now.pointGetter;
    if (!before.points || !now.points.every((v,i)=>v === before.points![i])) diff.points = [...now.points];
    if (now.gamePoint !== before.gamePoint) diff.gamePoint = now.gamePoint;
    if (now.matchPoint !== before.matchPoint) diff.matchPoint = now.matchPoint;
    if (now.isFinish !== before.isFinish) diff.isFinish = now.isFinish;
    if (now.serveHit !== before.serveHit) diff.serveHit = now.serveHit;
    if (
      (now.hit === null && before.hit !== null) ||
      (now.hit !== null && before.hit === null) ||
      (
        now.hit !== null &&
        before.hit !== null &&
        (!now.hit.normal.equals(before.hit!.normal) ||
        !now.hit.hitPoint.equals(before.hit!.hitPoint))
      )) {
        diff.hit = now.hit
          ? { normal: now.hit.normal.clone(), hitPoint: now.hit.hitPoint.clone() }
          : null;
      }

    return diff;
  }

  sync() {
    this.#context.before = {
      gameStatus: this.#context.now.gameStatus,
      ballSpeed: this.#context.now.ballSpeed,
      ballPos: this.#context.now.ballPos.clone(),
      velocity: this.#context.now.velocity.clone(),
      paddlePos: [...this.#context.now.paddlePos],
      pointGetter: this.#context.now.pointGetter,
      points: [...this.#context.now.points],
      gamePoint: this.#context.now.gamePoint,
      matchPoint: this.#context.now.matchPoint,
      isFinish: this.#context.now.isFinish,
      serveHit: this.#context.now.serveHit,
      hit: this.#context.now.hit
    };
  }

  hasService() {
    return this.#paddles[Number(!this.#context.now.pointGetter)];
  }

  moveBallForPaddle() {
    const position = this.hasService().position.clone();
    position.y -= Math.sign(position.y) * 1.2;
    this.#context.setBallPos(position);
  }

  accept() {
    this.#accept = true;
  }

  nextStatus(s: GameStatus) {
    if (this.#accept) {
      this.#done = false;
      this.#accept = false;
      this.#context.setGameStatus(s);
    }
    return this.#accept;
  }

  start() {
    this.#interval = setInterval(() => {
      // this.accept();
      // this.#context.setServeHit(true);

      console.log(this.#context.now.ballPos);

      this.#paddles[0].move();
      this.#paddles[1].move();
      if (this.#context.now.gameStatus === GameStatus.First) {
        if (!this.#done) {
          this.moveBallForPaddle();
          this.#done = true;
        }
        this.nextStatus(GameStatus.Serving);
      } else if (this.#context.now.gameStatus === GameStatus.Serving) {
        this.#ball.changeServePosition();
        if (this.#context.now.serveHit && !this.#done) {
          this.#done = true;
          this.hasService().handleHit();
          this.#ball.resetServePosition();
        }
        if (this.nextStatus(GameStatus.Playing)) {
          this.#context.setServeHit(false);
        }
      } else if (this.#context.now.gameStatus === GameStatus.Playing) {
        const newBallPos = this.#context.now.ballPos.clone();
        this.#context.setBallPos(newBallPos.addScaledVector(this.#context.now.velocity, delta));
        this.#ball.move();
        for (const obj of [ ...this.#paddles, ...this.#walls ]) {
          if (obj.onHit(this.#ball.box)) break;
        }
        this.#ball.move();
      } else if (this.#context.now.gameStatus === GameStatus.GetPoint) {
        if (this.#context.now.isFinish) {
          this.nextStatus(GameStatus.End);
        } else {
          if (!this.#done) this.moveBallForPaddle();
          this.nextStatus(GameStatus.Serving);

        }
      } else { // End
        
      }
    }, delta * 1000);
  }

  stop() {
    if (this.#interval) clearInterval(this.#interval);
    this.#interval = null;
  }

  reset() {
    this.stop();
    this.#accept = false;
    this.#done = false;
    this.#context.now = { ...defGameContext };
  }

  get context() { return this.#context; }
  get walls() { return this.#walls; }
  get paddles() { return this.#paddles; }
  get ball() { return this.#ball; }
}

function getBoxWithMargin(box: THREE.Box2, margin: number) {
  return new THREE.Box2(
    box.min.clone().subScalar(margin),
    box.max.clone().subScalar(margin)
  );
}

function intersect(a: THREE.Box2, b: THREE.Box2): Hit | undefined {
  if (!getBoxWithMargin(a, 0.09).intersectsBox(b)) return;

  // 重なり領域を計算
  const overlapMin = new THREE.Vector2(
    Math.max(a.min.x, b.min.x),
    Math.max(a.min.y, b.min.y)
  );
  const overlapMax = new THREE.Vector2(
    Math.min(a.max.x, b.max.x),
    Math.min(a.max.y, b.max.y)
  );
  const overlap = new THREE.Vector2().subVectors(overlapMax, overlapMin);

  // x衝突
  if (overlap.x < overlap.y) {
    const normal = new THREE.Vector2(a.min.x < b.min.x ? -1 : 1, 0);
    const hitPoint = new THREE.Vector2(
      normal.x > 0 ? a.max.x : a.min.x, // ボール側の面
      (overlapMin.y + overlapMax.y) / 2 // 中央
    );
    console.log(normal, hitPoint);
    return { normal, hitPoint };
  } 
  // y衝突
  else {
    const normal = new THREE.Vector2(0, a.min.y < b.min.y ? -1 : 1);
    const hitPoint = new THREE.Vector2(
      (overlapMin.x + overlapMax.x) / 2,
      normal.y > 0 ? a.max.y : a.min.y
    );
    console.log(normal, hitPoint);
    return { normal, hitPoint };
  }
}

abstract class HitObject {
  constructor(protected context: GameContext) {}
  abstract onHit(ball: THREE.Box2): boolean;
}

class SideWall extends HitObject {
  #box: THREE.Box2;
  #name: string;

  constructor(context: GameContext, pos: [number, number]) {
    super(context);
    this.#name = pos[0] < 0 ? SIDE_1 : SIDE_2 ;
    this.#box = new THREE.Box2(
      new THREE.Vector2(pos[0] - WALL_DEPTH / 2, pos[1] - STAGE_HEIGHT / 2),
      new THREE.Vector2(pos[0] + WALL_DEPTH / 2, pos[1] + STAGE_HEIGHT / 2)
    );
  }

  onHit(ball: THREE.Box2): boolean {
    const hit: ObjectHit | undefined = intersect(ball, this.#box);
    if (hit) {
      const newVel = this.context.now.velocity.clone();
      newVel.x *= -1;
      this.context.setVelocity(newVel);
      this.context.setBallPos(hit.hitPoint);
      hit.name = this.#name;
      this.context.setHit(hit);
      return true;
    }
    return false;
  }

  get box() { return this.#box; }
}

class GoalWall extends HitObject {
  #box: THREE.Box2;
  #position: [number, number]

  constructor(context: GameContext, pos: [number, number]) {
    super(context);
    this.#position = pos;
    this.#box = new THREE.Box2(
      new THREE.Vector2(pos[0] - STAGE_WIDTH / 2, pos[1] - WALL_DEPTH / 2),
      new THREE.Vector2(pos[0] + STAGE_WIDTH / 2, pos[1] + WALL_DEPTH / 2)
    )
  }

  onHit(ball: THREE.Box2): boolean {
    const hit = intersect(ball, this.#box);
    if (hit) {
      this.context.setVelocity(new THREE.Vector2());
      this.context.setBallPos(hit.hitPoint);
      this.context.setBallSpeed(BALL_SPEED);
      this.context.setPointGetter(this.#position[1] < 0);
      this.context.addPoint();
      this.context.setGameStatus(GameStatus.GetPoint);
      return true;
    }
    return false;
  }

  get box() { return this.#box; }
}

class Paddle extends HitObject {
  #box: THREE.Box2;
  #position: [number, number];
  #name: string;
  #size: THREE.Vector2 = new THREE.Vector2();

  constructor(context: GameContext, pos: [number, number]) {
    super(context);
    this.#position = pos;
    this.#name = pos[1] > 0 ? PADDLE_1 : PADDLE_2 ;
    this.#box = new THREE.Box2(
      new THREE.Vector2(pos[0] - PADDLE_HALF_X, pos[1] - PADDLE_HEIGHT / 2),
      new THREE.Vector2(pos[0] + PADDLE_HALF_X, pos[1] + PADDLE_HEIGHT / 2)
    );
    this.#box.getSize(this.#size);
  }

  move() {
    this.#position[0] = this.context.now.paddlePos[Number(this.#position[1] > 0)];
    this.#box.setFromCenterAndSize(new THREE.Vector2(this.#position[0], this.#position[1]), this.#size);
  }

  handleHit() {
    const normalized = THREE.MathUtils.clamp((this.context.now.ballPos.x - this.#position[0]) / PADDLE_HALF_X, -1 ,1);
    const maxAngle = Math.PI / 3;
    const angle = normalized * maxAngle;
    const dy = this.#position[1] > 0 ? -1 : 1;

    this.context.setVelocity(new THREE.Vector2(
      this.context.now.ballSpeed * Math.sin(angle),
      dy * this.context.now.ballSpeed * Math.cos(angle)
    ));

    if (Math.abs(this.context.now.velocity.y) < 0.01) {
      const vel = this.context.now.velocity.clone();
      vel.y = dy * 0.1;
      vel.normalize().multiplyScalar(this.context.now.ballSpeed);
      this.context.setVelocity(vel);
    }
  }

  onHit(ball: THREE.Box2): boolean {
    const hit: ObjectHit | undefined = intersect(ball, this.#box);
    if (hit) {
      this.context.setBallPos(hit.hitPoint);
      if (Math.abs(hit.normal.y) > 0.9) {
        this.handleHit();
        hit.name = this.#name;
        this.context.setHit(hit);
      } else {
        const vel = this.context.now.velocity.clone();
        vel.x *= -1;
        this.context.setVelocity(vel);
      }
      return true;
    }
    return false;
  }

  get box() { return this.#box; }
  get position() { return new THREE.Vector2(this.#position[0], this.#position[1]); }
}

class Ball {
  #box: THREE.Box2 = new THREE.Box2(
    new THREE.Vector2(-BALL_SIZE / 2, -BALL_SIZE / 2),
    new THREE.Vector2(BALL_SIZE / 2, BALL_SIZE / 2)
  );
  #size: THREE.Vector2 = new THREE.Vector2();

  #serveBeforePaddlePosition: THREE.Vector2 | null = null;
  #serveBeforeBallPosition: THREE.Vector2 | null = null;
  #servePaddleVelocity: THREE.Vector2 = new THREE.Vector2();
  #serveBallVelocity: THREE.Vector2 = new THREE.Vector2();

  constructor(private context: GameContext) {
    this.#box.getSize(this.#size);
  }

  move() {
    this.#box.setFromCenterAndSize(this.context.now.ballPos.clone(), this.#size);
  }

  changeServePosition() {
    const paddlePos = new THREE.Vector2(this.context.now.paddlePos[Number(!this.context.now.pointGetter)], 0);
    const ballPos = this.context.now.ballPos.clone();
    if (this.#serveBeforePaddlePosition === null || this.#serveBeforeBallPosition === null) {
      this.#serveBeforePaddlePosition = paddlePos.clone();
      this.#serveBeforeBallPosition = ballPos.clone();
      return;
    }
    this.#servePaddleVelocity.subVectors(paddlePos.clone(), this.#serveBeforePaddlePosition).divideScalar(delta);
    this.#serveBallVelocity.subVectors(ballPos.clone(), this.#serveBeforeBallPosition).divideScalar(delta);
    this.#serveBeforePaddlePosition.copy(paddlePos);
    this.#serveBeforeBallPosition.copy(ballPos);

    if (this.#servePaddleVelocity.x !== this.#serveBallVelocity.x) {
      this.#serveBallVelocity.multiplyScalar(FRICTION);
      if (this.#serveBallVelocity.lengthSq() < 0.0001) this.#serveBallVelocity.set(0, 0);
      ballPos.x += this.#serveBallVelocity.x * delta;
      ballPos.x = THREE.MathUtils.clamp(ballPos.x, -STAGE_WIDTH / 2 + 0.8, STAGE_WIDTH / 2 - 0.8);
    }
    ballPos.x = THREE.MathUtils.clamp(ballPos.x, paddlePos.x - PADDLE_HALF_X + BALL_SIZE / 2, paddlePos.x + PADDLE_HALF_X - BALL_SIZE / 2); 
    this.context.setBallPos(ballPos);
    this.move();
  }

  resetServePosition() {
    this.#serveBeforePaddlePosition = null;
    this.#serveBeforeBallPosition = null;
  }

  get box() { return this.#box; }
}