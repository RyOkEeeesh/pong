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
  Wainting,
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
  #points: Point[] = [ new Point(), new Point() ]; // [ p2, p1 ]
  #pointGetter: boolean = Boolean(Math.round(Math.random()));

  #pointMax: number = 20; // 20
  #defPointMacth: number = 11; // 11
  #pointMatch: number = this.#defPointMacth;
  #isEnd: boolean = false;

  #acceptResetPoints: boolean = false;

  #times!: NodeJS.Timeout;

  constructor() {}

  async matchPointEffect() {
    const mat = this.#points[Number(this.#pointGetter)].display.dis() ;
    if (mat.length === 0) return;
    await blinkingEffect(
      mat, {
      endtime: 0.8,
      difference: -0.8,
      times: 4
    });
  }

  async endPointEffect() {
    const mat = this.#points[Number(this.#pointGetter)].display.dis() ;
    if (mat.length === 0) return;
    await blinkingEffect(
      mat, {
      endtime: 4,
      difference: -0.8,
      times: 16
    });
  }

  pointGet(player: boolean) {
    this.#pointGetter = player;
    this.#points[Number(this.#pointGetter)].add();
    console.log(`p1 : ${this.#points[1].point}, p2 : ${this.#points[0].point}`);
    const max = Math.max( this.#points[0].point, this.#points[1].point );
    if ( this.#pointMatch - max === 1 ) {
      if ( this.#points[0].point === this.#points[1].point && !( this.#pointMax - max === 1 ) ) { // デュース 
        this.#pointMatch = Math.min(this.#pointMatch + 1, this.#pointMax);
      } else if ( max === (this.#points[Number(this.#pointGetter)].point) ) { // マッチポイント
        this.matchPointEffect();
      }
    } else if (this.#pointMatch === max) {
      this.#isEnd = true;
    }
  }

  reset() {
    if (!this.#acceptResetPoints) throw new Error('ポイントリセットが許可されていません');
    this.#points.forEach(p => p.reset());
    this.#points[0].reset();
    this.#points[1].reset();
    this.#pointMatch = this.#defPointMacth;
    this.#isEnd = false;
  }

  startTime() {
    const time = () => {
      const time = new Date();
      this.#points[0].set(time.getMinutes());
      this.#points[1].set(time.getHours());
    };
    this.reset();
    time();
    this.#times = setInterval(() => time(), 1000);
  }

  stopTime() {
    this.reset();
    clearInterval(this.#times);
  }

  get points() { return this.#points; }
  get pointGetter() { return this.#pointGetter; }
  get isEnd() { return this.#isEnd; }
  get acceptResetPoints() { return this.#acceptResetPoints; }
  set acceptResetPoints( value: boolean ) { this.#acceptResetPoints = value; }
}

export class Point {
  #point: number = 0;
  #display: PointDisplay = new PointDisplay();

  constructor() {}

  add() {
    this.#display.set(++this.#point);
  }

  reset() {
    this.#display.set(this.#point = 0);
  }

  set(num: number) {
    this.#display.set(this.#point = num);
  }

  get point() { return this.#point; }
  get display() { return this.#display; }
}