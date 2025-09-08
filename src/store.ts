import { create } from 'zustand';
import * as THREE from 'three';
import { BALL_SPEED } from './constants';

type StageStore = {
  ballSpeed: number,
  ballPosition: THREE.Vector3;
  velocity: THREE.Vector3;

  p1PositionX: number;
  p2PositionX: number;

  delta: number;

  setBallSpeed: (sp: number) => void;
  setBallPosition: (pos: THREE.Vector3) => void;
  setVelocity: (vel: THREE.Vector3) => void;
  setP1PositionX: (posZ: number) => void;
  setP2PositionX: (posZ: number) => void;
  setDelta: (time: number) => void;
};

// 非レンダー用
export const useStageStore = create<StageStore>(set => ({
  ballSpeed: BALL_SPEED,
  ballPosition: new THREE.Vector3(),
  velocity: new THREE.Vector3(),

  p1PositionX: 1,
  p2PositionX: 0,

  delta: 0,

  setBallSpeed: (sp = BALL_SPEED) =>
    set(s => ({
      ballSpeed: sp,
      velocity: s.velocity.clone().normalize().multiplyScalar(sp)
    })),

  setBallPosition: pos =>
    set(() => ({ ballPosition: pos.clone() })),

  setVelocity: vel =>
    set(() => ({ velocity: vel.clone() })),

  setP1PositionX: pos =>
    set(() => ({p1PositionX: pos})),

  setP2PositionX: pos =>
    set(() => ({p2PositionX: pos})),

  setDelta: time =>
    set(() => ({delta: time})),
}));

export enum GameMode {
  Selecting,
  Single,
  Duo,
  Multi
};

export enum GameStatus {
  Waiting,
  First,
  Serving,
  Playing,
  GetPoint,
  End
};

type GameStore = {
  gameStatus: GameStatus;

  point1: number;
  point2: number;

  pointGetter: boolean;

  setGameStatus: (status: GameStatus) => void;

  setPoint1: (num: number) => void;
  setPoint2: (num: number) => void;
  addPoint: (isP1: boolean) => void;
  resetPoint: () => void;

  setPointGetter: (isP1: boolean) => void;
}

// レンダー用
export const useGameStore = create<GameStore>(set => ({
  gameStatus: GameStatus.Waiting,

  point1: 0,
  point2: 0,

  pointGetter: Boolean(Math.round(Math.random())),

  setGameStatus: status =>
    set(() => ({gameStatus: status})),

  setPoint1: num => set(() => ({point1: num})),
  setPoint2: num => set(() => ({point2: num})),
  addPoint: isP1 => set(s => {
    const key = isP1 ? "point1" : "point2";
    return { [key]: s[key] + 1 };
  }),
  resetPoint: () => set(() => ({
    point1: 0,
    point2: 0
  })),

  setPointGetter: isP1 =>
    set(() => ({pointGetter: isP1})),
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

// CPU

export enum CPUMode {
  Easy,
  Normal,
  Hard
};

type CPUState = {
  mode: CPUMode;
  predictedTargetX: number | null;
  waitMoving: number | null;
  speed: number;
  missChance: number;
  precision: number;

  setPredictedTargetX: (targetX: number) => void;
  setMode: (mode: CPUMode) => void;
  resetPredict: () => void;
};

export const useCPUStore = create<CPUState>((set) => ({
  mode: CPUMode.Normal,
  predictedTargetX: null,
  waitMoving: null,
  speed: 10,
  missChance: 0.3,
  precision: 6,

  setPredictedTargetX: targetX => set({predictedTargetX: targetX}),
  setMode: (mode) => {
    switch (mode) {
      case CPUMode.Easy:
        set({ speed: BALL_SPEED - 10, missChance: 0.5, precision: 8, mode });
        break;
      case CPUMode.Normal:
        set({ speed: BALL_SPEED - 7.5, missChance: 0.3, precision: 6, mode });
        break;
      case CPUMode.Hard:
        set({ speed: BALL_SPEED - 5, missChance: 0.2, precision: 4, mode });
        break;
    }
  },
  resetPredict: () => set({ predictedTargetX: null })
}));