import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useMemo, useRef, useState } from "react";
import { useStageStore, useUserSetting } from "./store";
import { BALL_SPEED, PADDLE_HALF_X, STAGE_WIDTH } from "./constants";
import * as THREE from 'three';

export enum CPUMode {
  Easy,
  Normal,
  Hard
};

type PaddleControllerProps = {
  isP1: boolean;
  cpuMode?: null | CPUMode;
};

export function PaddleController({ isP1, cpuMode = null }: PaddleControllerProps) {
  const [_, get] = useKeyboardControls();
  const setPaddlePositionX = isP1
    ? useStageStore.getState().setP1PositionX
    : useStageStore.getState().setP2PositionX;

  const stage = useStageStore();

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

  const [predictedTargetX, setPredictedTargetX] = useState<number | null>(null);

  const velocity = useStageStore(s => s.velocity);

  function setTargetX() {
    if(!state.missChance && !state.precision) return;
    if(predictedTargetX !== null) return;

    const { ballPosition } = useStageStore.getState();
    const paddlePositionZ = isP1
      ? useStageStore.getState().p1PositionX
      : useStageStore.getState().p2PositionX ;

    if (velocity.length() === 0) {
      setPredictedTargetX(null);
      return;
    }

    const timeToReach = Math.abs((paddlePositionZ - ballPosition.z) / velocity.z);
    const noise = Math.random() < state?.missChance
      ? (Math.random() - 0.5) * state?.precision
      : 0 ;
    const targetX = ballPosition.x + velocity.x * timeToReach + noise;

    console.log(targetX);

    setPredictedTargetX(targetX); 
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

  const moveLeft = useCallback(
    () => paddleMove(-state.speed * stage.delta),
    [state, stage.delta]
  );

  const moveRight = useCallback(
    () => paddleMove(state.speed * stage.delta),
    [state, stage.delta]
  );

  const handleControls = useCallback(() => {
    if (!cpuState) {
      const keys = get();
      if (isP1) {
        if (keys.L1) moveLeft();
        if (keys.R1) moveRight();
      } else {
        if (keys.L2) moveLeft();
        if (keys.R2) moveRight();
      }
    } else {
      if (predictedTargetX && velocity.z) {
        const posX = isP1 ? stage.p1PositionX : stage.p2PositionX;
        if (posX < predictedTargetX - cpuState.precision) {
          moveRight();
        } else if (posX > predictedTargetX + cpuState.precision) {
          moveLeft();
        }
      }
    }
  }, [get, isP1, cpuState, predictedTargetX, moveLeft, moveRight, stage]);

  const prevVel = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!velocity.equals(prevVel.current)) {
      setPredictedTargetX(null);
      prevVel.current.copy(velocity);
    }

    if (cpuMode !== null) setTargetX();
    handleControls();
  });

  return null;
}
