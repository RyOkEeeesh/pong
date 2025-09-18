import * as THREE from 'three';
import { BALL_SPEED, GAME_POINT, GAME_POINT_MAX, GameStatus, STAGE_HEIGHT, STAGE_WIDTH, WALL_DEPTH } from './constants';

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
}

const defGameContext: Context = {
  gameStatus: GameStatus.First,
  ballSpeed: BALL_SPEED,
  ballPos: new THREE.Vector2(),
  velocity: new THREE.Vector2(),
  paddlePos: [0, 0],
  pointGetter: Boolean(Math.round(Math.random())),
  points: [0, 0],
  gamePoint: GAME_POINT,
  matchPoint: false,
  isFinish: false,
  serveHit: false
}

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
  };

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
      serveHit: this.#context.now.serveHit
    };
  }
}

interface Hit {
  normal: THREE.Vector2;
  hitPosition: THREE.Vector2;
}

abstract class HitObject {
  constructor(protected context: GameContext) {}
  abstract onHit(): void;
}

class SideWall extends HitObject {
  #box: THREE.Box2;

  constructor(context: GameContext, pos: [number, number]) {
    super(context);
    this.#box = new THREE.Box2(
      new THREE.Vector2(pos[0] - WALL_DEPTH / 2, pos[1] - STAGE_HEIGHT / 2),
      new THREE.Vector2(pos[0] + WALL_DEPTH / 2, pos[1] + STAGE_HEIGHT / 2)
    );
  }

  onHit(): void {
    const newVel = this.context.now.velocity.clone();
    newVel.x *= -1;
    this.context.setVelocity(newVel);
  }

  get box() { return this.#box; }
}

class GOalWall extends HitObject {
  #box: THREE.Box2;

  constructor(context: GameContext, pos: [number, number]) {
    super(context);
    this.#box = new THREE.Box2(
      new THREE.Vector2(pos[0] - STAGE_WIDTH / 2, pos[1] - STAGE_HEIGHT / 2 - WALL_DEPTH / 2),
      new THREE.Vector2(pos[0] + STAGE_WIDTH / 2, pos[1] + STAGE_HEIGHT / 2 + WALL_DEPTH / 2)
    )
  }

  onHit(): void {
    
  }

  get box() { return this.#box; }
}