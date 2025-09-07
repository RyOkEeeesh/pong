import { create } from 'zustand';
import * as THREE from 'three';
import { BALL_SPEED } from './constants';
import { platform } from 'os';

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

  setGameStatus: (status: GameStatus) => void;

  setPoint1: (num: number) => void;
  setPoint2: (num: number) => void;
  addPoint: (player: boolean) => void;
  resetPoint: () => void;
}

// レンダー用
export const useGameStore = create<GameStore>(set => ({
  gameStatus: GameStatus.Waiting,

  point1: 0,
  point2: 0,

  setGameStatus: status =>
    set(() => ({gameStatus: status})),

  setPoint1: num => set(() => ({point1: num})),
  setPoint2: num => set(() => ({point2: num})),
  addPoint: player => set(s => {
    const key = player ? "point1" : "point2";
    return { [key]: s[key] + 1 };
  }),
  resetPoint: () => set(() => ({
    point1: 0,
    point2: 0
  }))
}))