// import { THREE } from './ThreeModule';
import { GameContext, normalize, Paddle } from "./gameCore";

export type ControlSetting = {
  L: string,
  R: string,
  U: string,
  D: string
};

export class UserSetting {
  #speed: number = 15;

  #effect: boolean = true;

  #control: ControlSetting = {
    L: 'KeyA',
    R: 'KeyD',
    U: 'KeyW',
    D: 'KeyS'
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
  #keyPress: Record<string, boolean> = {};

  constructor(private context: GameContext) {
    this.init();
  }

  init() {
    document.addEventListener('keydown', e => this.#keyPress[e.code] = true);
    document.addEventListener('keyup', e => this.#keyPress[e.code] = false);
  }

  control(paddle: Paddle) {
    const max = this.context.GameManager.width / 2;
    const min = -this.context.GameManager.width / 2;
    const setting = this.context.UserSetting;
    if (this.#keyPress[setting.control.L]) {
      const speed = normalize(-setting.speed * this.context.GameManager.deltaTime, min, max);
      paddle.move(speed);
    }
    if (this.#keyPress[setting.control.R]) {
      const speed = normalize(setting.speed * this.context.GameManager.deltaTime, min, max);
      paddle.move(speed);
    }
  }
};