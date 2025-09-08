import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback } from "react";
import { CPUMode, useStageStore, useUserSetting } from "./store";
import { PADDLE_HALF_X, STAGE_WIDTH } from "./constants";

type PaddleControllerProps = {
  isP1: boolean;
  cpuStatus?: null | CPUMode;
}

export function PaddleController({ isP1, cpuStatus = null }: PaddleControllerProps) {
  const [_, get] = useKeyboardControls();
  const setPaddlePositionZ = isP1 ? useStageStore.getState().setP1PositionX : useStageStore.getState().setP2PositionX ;
  const speed = isP1 ? useUserSetting.getState().control.p1.speed : useUserSetting.getState().control.p2.speed ;

  const paddleMove = useCallback((move: number) => {
    const state = useStageStore.getState();
    const positionZ = isP1 ? state.p1PositionX : state.p2PositionX;
    const newPositionZ = Math.min(Math.max(positionZ + move, -STAGE_WIDTH / 2 + PADDLE_HALF_X), STAGE_WIDTH / 2 - PADDLE_HALF_X);
    setPaddlePositionZ(newPositionZ);
  }, [isP1])

  const moveLeft = useCallback(() => {
    paddleMove(-speed * useStageStore.getState().delta);
  }, [speed])

  const moveRight = useCallback(() => {
    paddleMove(speed * useStageStore.getState().delta);
  }, [speed])

  const handleControls = useCallback(() => {
    const keys = get();
    if (isP1) {
      if (keys.L1) moveLeft();
      if (keys.R1) moveRight();
    } else {
      if (keys.L2) moveLeft();
      if (keys.R2) moveRight();
    }
  }, [isP1, get]);

  useFrame(() => {
    handleControls();
  });

  return null;
}
