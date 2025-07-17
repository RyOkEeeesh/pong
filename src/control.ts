import { Game, players } from "./g";
import { GameContext, normalize, Paddle } from "./gameCore";
import { GameStatus } from "./manager";

export type ControlSetting = {
  L: KeyboardEvent["code"],
  R: KeyboardEvent["code"],
  U: KeyboardEvent["code"],
  D: KeyboardEvent["code"],
  S: KeyboardEvent["code"],
  Q: KeyboardEvent["code"]
};

export class UserSetting {
  #control: {
    speed: number,
    effect: boolean,
    p1: ControlSetting,
    p2: ControlSetting
  } = {
    speed: 20,
    effect: true,
    p1: {
      L: 'KeyA',
      R: 'KeyD',
      U: 'KeyW',
      D: 'KeyS',
      S: 'Space',
      Q: 'Escape'
    },
    p2: {
      L: 'ArrowLeft',
      R: 'ArrowRight',
      U: 'ArrowUp',
      D: 'ArrowDown',
      S: 'Enter',
      Q: 'Escape'
    }
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

  constructor(private game: Game) {}

  init(player: players) {
    this.#paddle = player === 'p1' ? this.game.stage.p1 : this.game.stage.p2;
    this.#control = this.game.context.UserSetting.control[player];
    document.addEventListener('keydown', e => this.#keyPress[e.code] = true);
    document.addEventListener('keyup', e => this.#keyPress[e.code] = false);
    return this;
  }

  control() {
    if (this.#keyPress[this.#control.Q] && this.#prevKeyPress[this.#control.Q] !== this.#keyPress[this.#control.Q]) { // ゲーム離脱機能に変更
      
    }

    this.#prevKeyPress = { ...this.#keyPress };

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

  async serve() {
    return new Promise(resolve => {
      const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === this.#control.S) {
        this.#paddle.refectPaddle();
        cleanup();
        resolve(null);
        }
      };

      const timer = setTimeout(() => {
        this.#paddle.refectPaddle();
        cleanup();
        resolve(null);
      }, 10000);

      const cleanup = () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', onKeyDown);
      };

      document.addEventListener('keydown', onKeyDown);
    });
  }

  get acceptMove() { return this.#acceptMove; }
  set acceptMove(value: boolean) { this.#acceptMove = value; }
};