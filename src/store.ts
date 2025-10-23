import { create } from 'zustand';
import * as THREE from 'three';
import { BALL_SPEED, GAME_POINT, GAME_POINT_MAX, GameMode, GameStatus, RoleStatus } from './constants';

export type Position = [number, number];

type CoreStore = {
  gameStatus: GameStatus;
  ballSpeed: number;
  ballPosition: THREE.Vector2;
  velocity: THREE.Vector2;
  paddlesPosition: Position;
  delta: number;
  pointDisplayMats: THREE.MeshStandardMaterial[][];
  gamePoint: number;
  pointGetter: boolean;
  serveHit: boolean;
  acceptNextStatus: boolean;
};


// 非レンダー用
export const coreStore: CoreStore = {
  gameStatus: GameStatus.First,
  ballSpeed: BALL_SPEED,
  ballPosition: new THREE.Vector2(),
  velocity: new THREE.Vector2(),
  paddlesPosition: [0, 0] as Position, // [ p2Position, p1Position ]
  delta: 0,
  pointDisplayMats: [[], []],
  gamePoint: GAME_POINT,
  pointGetter: Boolean(Math.round(Math.random())),
  serveHit: false,
  acceptNextStatus: false
};

type GameStore = {
  gameMode: GameMode;
  role: RoleStatus;
  points: Position;
  isMatch: boolean;
  isEnd: boolean;
  hit: {
    name: string;
    point: THREE.Vector2;
    normal: THREE.Vector2;
  } | null;

  setGameMode: (gameMode: GameMode) => void;
  setRole: (role: RoleStatus) => void;
  addPoint: () => void;
  resetPoint: () => void;
  setIsMatch: (isMatch: boolean) => void;
  setIsEnd: () => void;
  setHit: (name: string, point: THREE.Vector2, normal: THREE.Vector2) => void;
  resetHit: () => void;
  resetAll: () => void;
}

// レンダー用
export const useGameStore = create<GameStore>(set => ({
  gameMode: GameMode.Selecting,
  role: RoleStatus.Spectator,
  points: [0, 0] as Position,
  isMatch: false,
  isEnd: false,
  hit: null,

  setGameMode: gameMode => set({ gameMode }),
  setRole: role => set({ role }),
  addPoint: () => set(s => {
    const points = [ ...s.points ] as Position;
    points[Number(coreStore.pointGetter)]++; 
    return { points };
  }),
  resetPoint: () => set({ points: [0, 0] }),
  setIsMatch: isMatch => set({ isMatch }),
  setIsEnd: () => set({
    isMatch: false,
    isEnd: true
  }),
  setHit: (name, point, normal) => set({
    hit: {
      name,
      point: point.clone(),
      normal: normal.clone()
    }
  }),
  resetHit: () => set({ hit: null }),
  resetAll: () => set({
    points: [0, 0] as Position,
    isMatch: false,
    isEnd: false,
    hit: null,
  })
}));

// camera

type CameraStore = {
  cameras: THREE.PerspectiveCamera[];
  camNo: number;
  motionCamera: THREE.PerspectiveCamera;
  isObjectFit: boolean;

  pushCamera: (...cams: THREE.PerspectiveCamera[]) => void;
  setCamNo: (camNo: number) => void;
  setMotionCamera: (motionCamera: THREE.PerspectiveCamera) => void;
  setIsObjectFit: (isObjectFit: boolean) => void;
}

export const useCameraStore = create<CameraStore>(set => ({
  cameras: [],
  camNo: 0,
  motionCamera: null!,
  isObjectFit: false,

  pushCamera: (...cams) => set(s => ({ cameras: [...s.cameras, ...cams] })),
  setCamNo: camNo => set({camNo}),
  setMotionCamera: motionCamera => set({ motionCamera }),
  setIsObjectFit: isObjectFit => set({ isObjectFit })
}));

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