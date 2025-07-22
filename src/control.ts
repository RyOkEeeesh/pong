import { resolve } from "path";
import { Game, players } from "./game";
import { normalize, Paddle } from "./gameCore";
// import { GameStatus } from "./manager";

export type ControlSetting = {
  L: KeyboardEvent["code"],
  R: KeyboardEvent["code"],
  U: KeyboardEvent["code"],
  D: KeyboardEvent["code"],
  S: KeyboardEvent["code"],
};

export class UserSetting {
  #control: {
    speed: number,
    effect: boolean,
    p1: ControlSetting,
    p2: ControlSetting,
    Q: KeyboardEvent["code"],
    prevCamera: KeyboardEvent["code"],
    nextCamera: KeyboardEvent["code"]
  } = {
    speed: 20,
    effect: true,
    p1: {
      L: 'KeyA',
      R: 'KeyD',
      U: 'KeyW',
      D: 'KeyS',
      S: 'Space',
    },
    p2: {
      L: 'ArrowLeft',
      R: 'ArrowRight',
      U: 'ArrowUp',
      D: 'ArrowDown',
      S: 'Enter',
    },
    Q: 'Escape',
    prevCamera: 'KeyQ',
    nextCamera: 'KeyE',
  };

  constructor() {
    // cookieからの情報をがったい
  }

  setControl(op: { [key in players]: Partial<ControlSetting> }) {
    if (Object.keys(op).length === 0) return;
    for (const player in op) {
      const settings = op[player as players];
      for (const key in settings) {
        const value = settings[key as keyof ControlSetting];
        if (value !== undefined) this.#control[player as players][key as keyof ControlSetting] = value;
      }
    }
  }

  get control() { return this.#control; }
};

export class Controller {
  #keyPress: Record<KeyboardEvent["code"], boolean> = {};
  #prevKeyPress: Record<KeyboardEvent["code"], boolean> = {};

  #paddle!: Paddle;
  #control!: ControlSetting;

  #acceptMove: boolean = false;

  #isP1: boolean = false;
  camChange: boolean = true;

  constructor(private game: Game) {}

  init(player: players) {
    if (player === 'p1') {
      this.#isP1 = true;
      this.#paddle = this.game.stage.p1;
    } else this.#paddle = this.game.stage.p2;

    this.#control = this.game.context.UserSetting.control[player];
    document.addEventListener('keydown', e => this.#keyPress[e.code] = true);
    document.addEventListener('keyup', e => this.#keyPress[e.code] = false);
    return this;
  }

  control() {
    if (this.#isP1) this.p1Control();
    if (!this.#acceptMove) return;
    const max = this.game.context.GameManager.width / 2;
    const min = -this.game.context.GameManager.width / 2;
    if (this.#keyPress[this.#control.L] || this.#keyPress[this.#control.U]) {
      const speed = normalize(-this.game.context.UserSetting.control.speed * this.game.context.GameManager.deltaTime, min, max);
      this.#paddle.move(speed);
    }
    if (this.#keyPress[this.#control.R] || this.#keyPress[this.#control.D]) {
      const speed = normalize(this.game.context.UserSetting.control.speed * this.game.context.GameManager.deltaTime, min, max);
      this.#paddle.move(speed);
    }
  }

  private p1Control() {
    if (!this.#isP1) return;
    const control = this.game.context.UserSetting.control;
    if (this.#keyPress[control.Q] && this.#prevKeyPress[control.Q] !== this.#keyPress[control.Q]) { // ゲーム離脱機能に変更
      return;
    }
    if (!this.camChange) return;
    if (this.#keyPress[control.prevCamera] && this.#prevKeyPress[control.prevCamera] !== this.#keyPress[control.prevCamera]) { // ゲーム離脱機能に変更
      this.game.setCamera(-1);
    }
    if (this.#keyPress[control.nextCamera] && this.#prevKeyPress[control.nextCamera] !== this.#keyPress[control.nextCamera]) { // ゲーム離脱機能に変更
      this.game.setCamera(1);
    }
    this.#prevKeyPress = { ...this.#keyPress };
  }

  async serve() {
    return new Promise(resolve => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.code === this.#control.S) {
          this.#paddle.refectPaddle();
          cleanup();
          resolve(null);
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', onKeyDown);
      };

      const timer = setTimeout(() => {
        this.#paddle.refectPaddle();
        cleanup();
        resolve(null);
      }, 10000);

      document.addEventListener('keydown', onKeyDown);
    });
  }

  async anyKeyDown() {
    return new Promise(resolve => {
      const cleanup = () => {
        document.removeEventListener('keydown', onKeyDown );
        document.removeEventListener('mousedown', onKeyDown );
      }

      const onKeyDown = () => {
        cleanup();
        resolve(null);
      }

      document.addEventListener('keydown', onKeyDown );
      document.addEventListener('mousedown', onKeyDown );
    });
  }

  get acceptMove() { return this.#acceptMove; }
  set acceptMove(value: boolean) { this.#acceptMove = value; }
};