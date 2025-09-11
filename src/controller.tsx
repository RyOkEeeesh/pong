import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useGameStore, useStageStore, useUserSetting } from "./store";
import { BALL_SPEED, CPUMode, GameStatus, PADDLE_HALF_X, PADDLE_POSITION_Z1, PADDLE_POSITION_Z2, STAGE_WIDTH } from "./constants";
import * as THREE from "three";



type PaddleControllerProps = {
  isP1: boolean;
  cpuMode?: null | CPUMode;
};

export function PaddleController({ isP1, cpuMode = null }: PaddleControllerProps) {
  const [_, get] = useKeyboardControls();
  const { setPaddlePosition } = useStageStore.getState();

  function getPaddlePosition() { return useStageStore.getState().paddlePosition[Number(isP1)] };

  const paddleZ = isP1 ? PADDLE_POSITION_Z1 : PADDLE_POSITION_Z2;

  const state = (() => {
    if (cpuMode === null) {
      return isP1 ? { speed: useUserSetting(s => s.control.p1.speed) } : { speed: useUserSetting(s => s.control.p2.speed) };
    }

    switch (cpuMode) {
      case CPUMode.Easy:
        return { speed: BALL_SPEED - 10, missChance: 0.5, precision: 8 };
      case CPUMode.Normal:
        return { speed: BALL_SPEED - 7.5, missChance: 0.3, precision: 6 };
      case CPUMode.Hard:
        return { speed: BALL_SPEED - 5, missChance: 0.2, precision: 4 };
    }
  })();


  const { setServeHit } = useGameStore.getState();
  const serveTime = useRef<NodeJS.Timeout | null>(null);

  function triggerServe() {
    setServeHit(true);
    if(serveTime.current) clearTimeout(serveTime.current);
    serveTime.current = null;
  }

  function handlePlayerServe() {
    const { pointGetter } = useGameStore.getState();
    if(pointGetter === isP1) return;
    const keys = get();

    if(serveTime.current === null) serveTime.current = setTimeout(triggerServe, 10000);

    if ((isP1 && keys.S1) || (!isP1 && keys.S2)) {
      triggerServe();
    }
    handlePlayerControl();
  };

  function handleCPUServe() {
    const { pointGetter } = useGameStore.getState();
    if(
      !moveCenter() ||
      pointGetter === isP1 ||
      serveTime.current !== null ||
      useGameStore.getState().serveHit
    ) return;
    serveTime.current = setTimeout(triggerServe, Math.random() * 1000 + 50);
  }


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

  function paddleMove(move: number) {
    const posX = getPaddlePosition();
    const newPos = Math.min(
      Math.max(posX + move, -STAGE_WIDTH / 2 + PADDLE_HALF_X),
      STAGE_WIDTH / 2 - PADDLE_HALF_X
    );
    setPaddlePosition(isP1, newPos);
  }

  function moveCenter(speed?: number) {
    const paddleX = getPaddlePosition();
    const dx = 0 - paddleX;
    if(!dx) return true;
    const s = speed ?? 20;
    const step = Math.sign(dx) * s * useStageStore.getState().delta;
    if (Math.abs(dx) <= Math.abs(step)) {
      setPaddlePosition(isP1, 0);
      return true;
    }
    setPaddlePosition(isP1, paddleX + step);
    return false;
  }

  function handleCPUControl() {
    const paddleX = getPaddlePosition();
    const { ballPosition, velocity, delta } = useStageStore.getState();

    const speed = state.speed * delta;
    const isBallMovingAway = (ballPosition.z - paddleZ) * velocity.z > 0;

    if (isBallMovingAway) {
      if (cpuMode === CPUMode.Hard) {
        const now = performance.now();
        if (waitMoving.current === null) {
          waitMoving.current = now;
        } else if (now - waitMoving.current >= 500) {
          moveCenter(state.speed);
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
  }

  const handlePlayerControl = isP1
    ? function() {
        const keys = get();
        const { delta } = useStageStore.getState();
        if (keys.L1) paddleMove(-state.speed * delta);
        if (keys.R1) paddleMove(state.speed * delta);
      }
    : function() {
        const keys = get();
        const { delta } = useStageStore.getState();
        if (keys.L2) paddleMove(-state.speed * delta);
        if (keys.R2) paddleMove(state.speed * delta);
      };


  const [handleControls, handleServe] = cpuMode === null ? [handlePlayerControl, handlePlayerServe] : [handleCPUControl, handleCPUServe];

  const prevVel = useRef(new THREE.Vector3());

  useFrame(() => {
    const { velocity } = useStageStore.getState();
    const { gameStatus } = useGameStore.getState();
    if (!velocity.equals(prevVel.current)) {
      predictedTargetX.current = null;
      prevVel.current.copy(velocity);
    }

    switch (gameStatus) {
      case GameStatus.Waiting:
        break;
      case GameStatus.First:
        break;
      case GameStatus.Serving:
        handleServe();
        break;
      case GameStatus.Playing:
        if (serveTime.current) {
          clearTimeout(serveTime.current);
          serveTime.current = null;
        }
        handleControls();
        break;
      case GameStatus.GetPoint:
        break;
      case GameStatus.End:
        break;
      case GameStatus.Pause:
        break;
    }
  });

  return null;
}
