import { create } from 'zustand';
import * as THREE from 'three';
import { BALL_SPEED, GAME_POINT, GAME_POINT_MAX, GameMode, GameStatus, RoleStatus } from './constants';

type StageStore = {
  ballSpeed: number,
  ballPosition: THREE.Vector3;
  velocity: THREE.Vector3;

  paddlePosition: [number, number];

  delta: number;

  pointDisplayMats: THREE.MeshStandardMaterial[][];

  setBallSpeed: (sp?: number) => void;
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
  gameMode: GameMode;
  gameStatus: GameStatus;
  role: RoleStatus;

  point1: number;
  point2: number;

  gamePoint: number;

  matchPoint: boolean;
  isFinish: boolean;

  pointGetter: boolean;

  serveHit: boolean;

  setGameMode: (gameMode: GameMode) => void;
  setGameStatus: (gameStatus: GameStatus) => void;
  setRole: (role: RoleStatus) => void;

  setPoint1: (num: number) => void;
  setPoint2: (num: number) => void;
  addPoint: (isP1: boolean) => void;
  resetPoint: () => void;

  processAddPoint: () => void;

  setPointGetter: (isP1: boolean) => void;

  setServeHit: (serveHit: boolean) => void;
}

// レンダー用
export const useGameStore = create<GameStore>(set => ({
  gameMode: GameMode.Selecting,
  gameStatus: GameStatus.First,
  role: RoleStatus.Spectator,

  point1: 0,
  point2: 0,

  gamePoint: GAME_POINT,

  matchPoint: false,
  isFinish: false,

  pointGetter: Boolean(Math.round(Math.random())),

  serveHit: false,

  setGameMode: gameMode => set({gameMode}),
  setGameStatus: gameStatus => set({gameStatus}),
  setRole: role => set({role}),

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

  processAddPoint: () =>
    set(s => {
      const max = Math.max(s.point1, s.point2);
      if (s.gamePoint - max === 1) {
        if (s.point1 === s.point2 && GAME_POINT_MAX - max !== 1) { // デュース
          return ({
            gamePoint: Math.min(s.gamePoint + 1, GAME_POINT_MAX),
            matchPoint: false
          });
        } else {
          return ({ matchPoint: true });
        }
      } else if (s.gamePoint === max) {
        return ({
          matchPoint: false,
          isFinish: true
        });
      }
      return ({ matchPoint: false });
    }),

  setPointGetter: isP1 =>
    set({pointGetter: isP1}),

  setServeHit: serveHit =>
    set({ serveHit }),
}));

// camera

export enum CameraWork {
  Motion,
  Orbit
}

type CameraStore = {
  cameras: THREE.PerspectiveCamera[];
  camNo: number;
  motionCamera: THREE.PerspectiveCamera;
  camWork: CameraWork;

  setCamNo: (camNo: number) => void;
  setComWork: (camWork: CameraWork) => void;
}

export const useCameraStore = create<CameraStore>(set => ({
  cameras: [
    new THREE.PerspectiveCamera(),
    new THREE.PerspectiveCamera(),
    new THREE.PerspectiveCamera()
  ],
  camNo: 0,
  motionCamera: new THREE.PerspectiveCamera(),
  camWork: CameraWork.Motion,

  setCamNo: camNo => set({camNo}),
  setComWork: camWork => set({camWork})
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