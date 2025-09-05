import { create } from 'zustand';
import * as THREE from 'three';
import { BALL_SPEED } from './constants';

type StageStore = {
  ballSpeed: number,
  ballPosition: THREE.Vector3;
  velocity: THREE.Vector3;

  p1PositionZ: number;
  p2PositionZ: number;

  delta: number;

  setBallSpeed: (sp: number) => void;
  setBallPosition: (pos: THREE.Vector3) => void;
  setVelocity: (vel: THREE.Vector3) => void;
  setP1PositionZ: (posZ: number) => void;
  setP2PositionZ: (posZ: number) => void;
  setDelta: (time: number) => void;
};

// 非レンダー用
export const useStageStore = create<StageStore>(set => ({
  ballSpeed: BALL_SPEED,
  ballPosition: new THREE.Vector3(),
  velocity: new THREE.Vector3(),

  p1PositionZ: 0,
  p2PositionZ: 0,

  delta: 0,

  setBallSpeed: (sp = BALL_SPEED) =>
    set(s => ({
      ballSpeed: sp,
      velocity: s.velocity.clone().normalize().multiplyScalar(sp),
    })),

  setBallPosition: pos =>
    set(() => ({ ballPosition: pos.clone() })),

  setVelocity: vel =>
    set(() => ({ velocity: vel.clone() })),

  setP1PositionZ: pos =>
    set(() => ({p1PositionZ: pos})),

  setP2PositionZ: pos =>
    set(() => ({p2PositionZ: pos})),

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
  Wainting,
  First,
  Serving,
  Playing,
  GetPoint,
  End
};

type GameStore = {
  gameStatus: GameStatus;

  setGameStatus: (sutatus: GameStatus) => void;
}

// レンダー用
const useGameStore = create<GameStore>(set => ({
  gameStatus: GameStatus.Wainting,

  setGameStatus: status =>
    set(() => ({gameStatus: status}))

}))