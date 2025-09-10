import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useMemo, useRef } from "react";
import { useStageStore, useUserSetting } from "./store";
import { BALL_SPEED, PADDLE_HALF_X, PADDLE_POSITION_Z1, PADDLE_POSITION_Z2, STAGE_WIDTH } from "./constants";
import * as THREE from "three";

export enum CPUMode {
  Easy,
  Normal,
  Hard
}

type PaddleControllerProps = {
  isP1: boolean;
  cpuMode?: null | CPUMode;
};

export function PaddleController({ isP1, cpuMode = null }: PaddleControllerProps) {
  const [_, get] = useKeyboardControls();
  const setPaddlePositionX = isP1
    ? useStageStore.getState().setP1PositionX
    : useStageStore.getState().setP2PositionX;

  const getPaddlePositionX = useCallback(
    () => (isP1 ? useStageStore.getState().p1PositionX : useStageStore.getState().p2PositionX),
    [isP1]
  );

  const paddleZ = useMemo(
    () => (isP1 ? PADDLE_POSITION_Z1 : PADDLE_POSITION_Z2),
    [isP1]
  );

  const state = useMemo(() => {
    if (cpuMode === null) {
      return isP1
        ? { speed: useUserSetting.getState().control.p1.speed }
        : { speed: useUserSetting.getState().control.p2.speed };
    }

    switch (cpuMode) {
      case CPUMode.Easy:
        return { speed: BALL_SPEED - 10, missChance: 0.5, precision: 8 };
      case CPUMode.Normal:
        return { speed: BALL_SPEED - 7.5, missChance: 0.3, precision: 6 };
      case CPUMode.Hard:
        return { speed: BALL_SPEED - 5, missChance: 0.2, precision: 4 };
    }
  }, [cpuMode, isP1]);

  const predictedTargetX = useRef<number | null>(null);
  const waitMoving = useRef<number | null>(null);

  function setTargetX() {
    if (!state.missChance && !state.precision) return;
    if (predictedTargetX.current !== null) return;

    const { ballPosition, velocity } = useStageStore.getState();

    if (velocity.length() === 0) {
      predictedTargetX.current = null;
      return;
    }

    const timeToReach = Math.abs((paddleZ - ballPosition.z) / velocity.z);
    const noise =
      Math.random() < state?.missChance ? (Math.random() - 0.5) * state?.precision : 0;
    const randomHitOffset = (Math.random() * 2 - 1) * PADDLE_HALF_X;
    const targetX = ballPosition.x + velocity.x * timeToReach + noise + randomHitOffset;

    predictedTargetX.current = targetX;
  }

  const paddleMove = useCallback(
    (move: number) => {
      const s = useStageStore.getState();
      const posX = isP1 ? s.p1PositionX : s.p2PositionX;
      const newPos = Math.min(
        Math.max(posX + move, -STAGE_WIDTH / 2 + PADDLE_HALF_X),
        STAGE_WIDTH / 2 - PADDLE_HALF_X
      );
      setPaddlePositionX(newPos);
    },
    [isP1, setPaddlePositionX]
  );

  const handleCPUControl = useCallback(() => {
    const paddleX = getPaddlePositionX();
    const { ballPosition, velocity, delta } = useStageStore.getState();

    const speed = state.speed * delta;
    const isBallMovingAway = (ballPosition.z - paddleZ) * velocity.z > 0;

    if (isBallMovingAway) {
      if (cpuMode === CPUMode.Hard) {
        const now = performance.now();
        if (waitMoving.current === null) {
          waitMoving.current = now;
        } else if (now - waitMoving.current >= 500) {
          const dx = 0 - paddleX;
          const step = Math.sign(dx) * state.speed * useStageStore.getState().delta;
          if (Math.abs(dx) <= Math.abs(step)) {
            setPaddlePositionX(0);
          } else {
            setPaddlePositionX(paddleX + step);
          }
        }
      }
    return;
  } else {
    waitMoving.current = null;
  }

    if (predictedTargetX.current === null) setTargetX();

    const direction = predictedTargetX.current! - paddleX;
    const move = THREE.MathUtils.clamp(direction, -speed, speed);

    paddleMove(move);
  }, [state, cpuMode]);

  const handlePlayerControl = isP1
    ? useCallback(() => {
        const keys = get();
        const { delta } = useStageStore.getState();
        if (keys.L1) paddleMove(-state.speed * delta);
        if (keys.R1) paddleMove(state.speed * delta);
      }, [get, state])
    : useCallback(() => {
        const keys = get();
        const { delta } = useStageStore.getState();
        if (keys.L2) paddleMove(-state.speed * delta);
        if (keys.R2) paddleMove(state.speed * delta);
      }, [get, state]);

  const handleControls = cpuMode === null ? handlePlayerControl : handleCPUControl;

  const prevVel = useRef(new THREE.Vector3());

  useFrame(() => {
    const { velocity } = useStageStore.getState();
    if (!velocity.equals(prevVel.current)) {
      predictedTargetX.current = null;
      prevVel.current.copy(velocity);
    }

    handleControls();
  });

  return null;
}
