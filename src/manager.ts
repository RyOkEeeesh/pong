import { blinkingEffect } from './effect';
import { Ball } from './gameCore';
import { PointDisplay } from './point';
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
  End
};

export class GameManager {
  #clock: THREE.Clock = new THREE.Clock;
  #deltaTime: number = this.#clock.getDelta();

  #gameStatus: GameStatus = GameStatus.First;

  #height: number = 28;
  #width: number = this.#height / 5 * 4;

  #ball!: Ball;

  #defBallSpeed = 28;
  #ballSpeed: number = this.#defBallSpeed;
  #ballVelocity: THREE.Vector3 = new THREE.Vector3();
  #acceleration: number = 0.2;

  constructor() {}

  initBall(ball: Ball) { if(!this.#ball) this.#ball = ball; }

  get clock() { return this.#clock; }

  get gameStatus() { return this.#gameStatus; }
  set gameStatus(value: GameStatus) { this.#gameStatus = value; }

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
  #pointGetter: boolean = Boolean(Math.round(Math.random()));

  #pointMax: number = 20;
  #pointMatch: number = 2;
  #isEnd: boolean = false;

  constructor() {}

  async matchPointEffect() {
    const mat = this.#pointGetter ? this.#p1.display.dis() : this.#p2.display.dis() ;
    if (mat.length === 0) return;
    await blinkingEffect(
      mat, {
      endtime: 0.8,
      difference: -0.8,
      times: 4
    });
  }

  async endPointEffect() {
    const mat = this.#pointGetter ? this.#p1.display.dis() : this.#p2.display.dis() ;
    if (mat.length === 0) return;
    await blinkingEffect(
      mat, {
      endtime: 3,
      difference: -0.8,
      times: 12
    });
  }

  pointGet(player: boolean) { 
    this.#pointGetter = player;
    this.#pointGetter ? this.#p1.add() : this.#p2.add() ;
    if ( this.#pointMatch - Math.max(this.p1.point, this.p2.point) === 1 ) {
      if ( this.p1.point === this.p2.point && !( this.#pointMax - Math.max(this.p1.point, this.p2.point) === 1 ) ) {
        this.#pointMatch = Math.min(this.#pointMatch + 1, this.#pointMax)
      } else if ( Math.max(this.p1.point, this.p2.point) === (this.#pointGetter ? this.p1.point : this.p2.point)) {
        this.matchPointEffect();
      }
    } else if (this.#pointMatch === Math.max(this.p1.point, this.p2.point)) {
      this.#isEnd = true;
      this.endPointEffect();
    }
  }

  get p1() { return this.#p1; }
  get p2() { return this.#p2; }
  get pointGetter() { return this.#pointGetter; }
  get isEnd() { return this.#isEnd; }
}

export class Point {
  #point: number = 0;
  #display: PointDisplay = new PointDisplay();

  constructor() {}

  add() {
    this.#display.set(++this.#point);
  }

  get point() { return this.#point; }
  get display() { return this.#display; }
}