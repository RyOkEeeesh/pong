import { create } from 'zustand';
import * as THREE from 'three';
import { BALL_SPEED } from './constants';

type GameState = {
  ballSpeed: number,
  ballPosition: THREE.Vector3;
  velocity: THREE.Vector3;

  p1PositionZ: number;
  p2PositionZ: number;

  setBallSpeed: (sp: number) => void;
  setBallPosition: (pos: THREE.Vector3) => void;
  setVelocity: (vel: THREE.Vector3) => void;
  setP1PositionZ: (posZ: number) => void;
  setP2PositionZ: (posZ: number) => void;
};

export const useGameStore = create<GameState>((set) => ({
  ballSpeed: BALL_SPEED,
  ballPosition: new THREE.Vector3(),
  velocity: new THREE.Vector3(),

  p1PositionZ: 0,
  p2PositionZ: 0,

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
    set(() => ({p2PositionZ: pos}))
}));