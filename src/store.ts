import { create } from 'zustand';
import * as THREE from 'three';
import { BALL_SPEED, GameStatus } from './constants';

type StageStore = {
  ballSpeed: number,
  ballPosition: THREE.Vector3;
  velocity: THREE.Vector3;

  paddlePosition: [number, number];

  delta: number;

  pointDisplayMats: THREE.MeshStandardMaterial[][];

  setBallSpeed: (sp: number) => void;
  setBallPosition: (pos: THREE.Vector3) => void;
  setVelocity: (vel: THREE.Vector3) => void;
  setPaddlePosition: (isP1: boolean, position: number) => void;
  setDelta: (time: number) => void;
  pushPointDisplayMats: (isP1: boolean, mats: THREE.MeshStandardMaterial[]) => void;
};

// 非レンダー用
export const useStageStore = create<StageStore>(set => ({
  ballSpeed: BALL_SPEED,
  ballPosition: new THREE.Vector3(),
  velocity: new THREE.Vector3(),

  paddlePosition: [0, 0], // [ p2Position, p1Position ]

  delta: 0,

  pointDisplayMats: [[], []],

  setBallSpeed: (sp = BALL_SPEED) =>
    set(s => ({
      ballSpeed: sp,
      velocity: s.velocity.clone().normalize().multiplyScalar(sp)
    })),

  setBallPosition: pos =>
    set({ ballPosition: pos.clone() }),

  setVelocity: vel =>
    set({ velocity: vel.clone() }),

  setPaddlePosition: (isP1, position) =>
    set(s => {
      const paddlePosition = s.paddlePosition.slice();
      paddlePosition[Number(isP1)] = position;
      return ({ paddlePosition: (paddlePosition as [number, number]) })
    }),

  setDelta: time =>
    set({ delta: Math.min(time, 1000 / 24) }),

  pushPointDisplayMats: (isP1, mats) =>
    set(s => {
      const mat = s.pointDisplayMats.slice();
      mat[Number(isP1)].push(...mats);
      return ({ pointDisplayMats: mat });
    })
}));

type GameStore = {
  gameStatus: GameStatus;

  point1: number;
  point2: number;

  pointGetter: boolean;

  serveHit : boolean;


  setGameStatus: (gameStatus: GameStatus) => void;

  setPoint1: (num: number) => void;
  setPoint2: (num: number) => void;
  addPoint: (isP1: boolean) => void;
  resetPoint: () => void;

  setPointGetter: (isP1: boolean) => void;

  setServeHit: (serveHit: boolean) => void;
}

// レンダー用
export const useGameStore = create<GameStore>(set => ({
  gameStatus: GameStatus.First,

  point1: 0,
  point2: 0,

  pointGetter: Boolean(Math.round(Math.random())),

  serveHit: false,

  setGameStatus: gameStatus =>
    set({gameStatus}),

  setPoint1: num => set({point1: num}),
  setPoint2: num => set({point2: num}),
  addPoint: isP1 => set(s => {
    const key = isP1 ? "point1" : "point2";
    return { [key]: s[key] + 1 };
  }),
  resetPoint: () => set({
    point1: 0,
    point2: 0
  }),

  setPointGetter: isP1 =>
    set({pointGetter: isP1}),

  setServeHit: serveHit =>
    set({ serveHit }),
}))

// controller

function deepAssignWithoutUndefined<T extends object>(target: T, source: Partial<T>): T {
  const result: any = Array.isArray(target) ? [...target] : { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;

    const targetValue = (target as any)[key];

    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof targetValue === "object" &&
      targetValue !== null
    ) {
      result[key] = deepAssignWithoutUndefined(targetValue, value as any);
    } else {
      result[key] = value;
    }
  }
  return result;
}

type Key = KeyboardEvent["code"];

type ControlSetting = {
  speed: number;
  L: [Key, Key];
  R: [Key, Key];
  S: [Key];
}

type UserControlSetting = {
  effect: boolean;
  p1: ControlSetting;
  p2: ControlSetting;
  quit: [Key];
  prevCamera: [Key];
  nextCamera: [Key];
}

export const defSetting: UserControlSetting = {
  effect: true,
  p1: {
    speed: 20,
    L: ['KeyA', 'KeyW'],
    R: ['KeyD', 'KeyS'],
    S: ['Space']
  },
  p2: {
    speed: 20,
    L: ['ArrowLeft', 'ArrowUp'],
    R: ['ArrowRight', 'ArrowDown'],
    S: ['Enter']
  },
  quit: ['Escape'],
  prevCamera: ['KeyQ'],
  nextCamera: ['KeyE'],
};

type UserSetting = {
  control: UserControlSetting;

  setControl: (setting: Partial<UserControlSetting>) => void;
}

export const useUserSetting = create<UserSetting>(set => ({
  control: defSetting,

  setControl: setting =>
    set(s => {
      const newSetting = deepAssignWithoutUndefined({...s.control}, setting);
      return ({control: newSetting});
    }),
}));