import { Ball } from './gameCore';
import { THREE } from './ThreeModule';

export class UserManager {
  // ユーザ名など　検討中
  #name: string = 'Guest';
  #id: string | null = null; // multi用
}

export enum GameMode {
  Selecting,
  Single,
  Duo,
  Multi
};

export class ModeManager {
  #mode = GameMode.Selecting;

  constructor() {}

  get mode():GameMode { return this.#mode; }
  set mode(value: GameMode) { this.#mode = value; }
};

export enum GameStatus {
  First,
  Serving,
  Playing,
  GetPoint,
  Pause,
  End
};

export class GameManager {
  #clock: THREE.Clock = new THREE.Clock;
  #deltaTime: number = this.#clock.getDelta();

  #gameStatus: GameStatus = GameStatus.First;

  #height: number = 28;
  #width: number = this.#height / 5 * 4;

  #ball!: Ball;

  #defBallSpeed = 25;
  #ballSpeed: number = this.#defBallSpeed;
  #ballVelocity: THREE.Vector3 = new THREE.Vector3(0.1, 0, 0.1).normalize().multiplyScalar(this.#ballSpeed);
  #acceleration: number = 0.2;

  constructor() {}

  initBall(ball: Ball) { if(!this.#ball) this.#ball = ball; }

  get clock() { return this.#clock; }

  get gameStatus() { return this.#gameStatus }
  set gameStatus(value: GameStatus) { this.#gameStatus = value }

  get deltaTime(): number { return this.#deltaTime; }
  set deltaTime(value: number) { this.#deltaTime = value; }

  get width() { return this.#width; }

  get height() { return this.#height; }

  get ball() { return this.#ball; }

  get defSpeed() { return this.#defBallSpeed }

  get speed() { return this.#ballSpeed }
  set speed(value: number) {
    if (value < 0) throw new Error('Don\'t set negative value');
    this.#ballSpeed = value;
  }

  get acceleration() { return this.#acceleration; }

  get velocity() { return this.#ballVelocity; }
  set velocity(value: THREE.Vector3) { this.#ballVelocity = value.clone(); }

};

export class PointManager {
  #p1: Point = new Point();
  #p2: Point = new Point();
  #pointGetter: boolean = Boolean(Math.round(Math.random()))

  constructor() {}

  pointGet(player: boolean) { 
    this.#pointGetter = player;
    this.#pointGetter ? this.#p1.add() : this.#p2.add() ;
  }

  get p1() { return this.#p1; }
  get p2() { return this.#p2; }
  get pointGetter() { return this.#pointGetter; }
}

export class Point {
  #point: number = 0;

  constructor() {}

  add() { this.#point++ }

  get point() { return this.#point; }
}

export enum TaskStatus {
  Pending,
  Running,
  Done
};

export class TaskManager {
  #status: TaskStatus = TaskStatus.Pending;

  constructor() {}

  get status() { return this.#status; }
  set status(value: TaskStatus) { this.#status = value; }
}