import { GameContext, normalize, Paddle } from "./gameCore";

export type ControlSetting = {
  L: KeyboardEvent["code"],
  R: KeyboardEvent["code"],
  U: KeyboardEvent["code"],
  D: KeyboardEvent["code"],
  S: KeyboardEvent["code"]
};

export class UserSetting {
  #speed: number = 15;

  #effect: boolean = true;

  #control: ControlSetting = {
    L: 'KeyA',
    R: 'KeyD',
    U: 'KeyW',
    D: 'KeyS',
    S: 'Space'
  };

  setControl(op: Partial<ControlSetting>) {
    if (Object.keys(op).length === 0) return;
    Object.keys(op).forEach(key => {
      const k = key as keyof ControlSetting;
      this.#control[k] = op[k]!;
    });
  }

  get control() { return this.#control; }
  get speed() { return this.#speed; }

  get effect() { return this.#effect; }
  set effect(value: boolean) { this.#effect = value; }
};

export class Controller {
  #keyPress: Record<KeyboardEvent["code"], boolean> = {};

  #paddle!: Paddle;

  constructor(private context: GameContext) {}

  init(paddle: Paddle) {
    this.#paddle = paddle;
    document.addEventListener('keydown', e => this.#keyPress[e.code] = true);
    document.addEventListener('keyup', e => this.#keyPress[e.code] = false);
    return this;
  }

  control() {
    const max = this.context.GameManager.width / 2;
    const min = -this.context.GameManager.width / 2;
    const setting = this.context.UserSetting;
    if (this.#keyPress[setting.control.L]) {
      const speed = normalize(-setting.speed * this.context.GameManager.deltaTime, min, max);
      this.#paddle.move(speed);
    }
    if (this.#keyPress[setting.control.R]) {
      const speed = normalize(setting.speed * this.context.GameManager.deltaTime, min, max);
      this.#paddle.move(speed);
    }
  }

  async serve() {
    return new Promise(resolve => {
      const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === this.context.UserSetting.control.S) {
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

};