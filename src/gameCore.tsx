import * as THREE from 'three';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { ACCELERATION, BALL_SIZE, BALL_SPEED_MAX, FramePriority, FRICTION, GameStatus, GOAL_1, GOAL_2, PADDLE_1, PADDLE_2, PADDLE_DEPTH, PADDLE_HALF_X, PADDLE_POSITION_Z1, PADDLE_POSITION_Z2, SIDE_1, SIDE_2, STAGE_HEIGHT, STAGE_WIDTH, WALL_DEPTH, WALL_HEIGHT } from './constants';
import { useGameStore, useStageStore } from './store';
import { Hit, intersect } from './core';

function SetDelta() {
  const { setDelta } = useStageStore.getState();
  useFrame((_, delta) => { setDelta(delta) }, FramePriority.SetDelta);
  return null;
}

type Object2d = { name: string; ref: React.RefObject<THREE.Box2> }

type ObjectProps = {
  args: ConstructorParameters<typeof THREE.Box2>;
}

function move(obj: Object2d, position: THREE.Vector2) {
  const size = new THREE.Vector2();
  obj.ref.current.getSize(size);
  obj.ref.current.setFromCenterAndSize(position, size);
}

const Box2 = forwardRef<THREE.Box2, ObjectProps>((props, ref) => 
  <box2 ref={ref} {...props} />
);

function ballArgs(): ConstructorParameters<typeof THREE.Box2> {
  return [
    new THREE.Vector2(-BALL_SIZE / 2, -BALL_SIZE / 2),
    new THREE.Vector2(BALL_SIZE / 2, BALL_SIZE / 2)
  ];
}

function paddleArgs(): ConstructorParameters<typeof THREE.Box2> {
  return [
    new THREE.Vector2(-PADDLE_HALF_X, -PADDLE_DEPTH / 2),
    new THREE.Vector2(PADDLE_HALF_X, PADDLE_DEPTH / 2)
  ];
}

function sideWallArgs(): ConstructorParameters<typeof THREE.Box2> {
  return [
    new THREE.Vector2(-WALL_DEPTH / 2, -STAGE_HEIGHT / 2),
    new THREE.Vector2(WALL_DEPTH / 2, STAGE_HEIGHT / 2)
  ];
}

function goalWallArgs(): ConstructorParameters<typeof THREE.Box2>{
  return [
    new THREE.Vector2(-STAGE_WIDTH / 2, -WALL_DEPTH / 2),
    new THREE.Vector2(STAGE_WIDTH / 2, WALL_DEPTH / 2)
  ];
}

const argsList = [
  ballArgs(),
  paddleArgs(),
  paddleArgs(),
  sideWallArgs(),
  sideWallArgs(),
  goalWallArgs(),
  goalWallArgs()
];

function handleHitPaddle() {
  const { ballSpeed, ballPosition, paddlesPosition, setBallSpeed, setVelocity } = useStageStore.getState();
  const paddlePos = paddlesPosition[Number(ballPosition.y > 0)];

  const normalized = THREE.MathUtils.clamp(
    (ballPosition.x - paddlePos) / PADDLE_HALF_X,
    -1,
    1
  );
  const maxAngle = Math.PI / 3;
  const angle = normalized * maxAngle;
  const newVelocity = new THREE.Vector2(
    ballSpeed * Math.sin(angle),
    -Math.sign(ballPosition.y) * ballSpeed * Math.cos(angle)
  );
  setBallSpeed(Math.min(ballSpeed + ACCELERATION, BALL_SPEED_MAX));
  setVelocity(newVelocity);
}

function handleHitSideWall() {
  const { velocity, setVelocity } = useStageStore.getState();
  const v = velocity.clone();
  v.x *= -1;
  setVelocity(v);
}

function handleHitGoalWall() {
  const { ballPosition, setVelocity } = useStageStore.getState();
  const { setGameStatus, addPoint, processAddPoint, setPointGetter } = useGameStore.getState();
  const pointGetter = ballPosition.y < 0;
  setVelocity(new THREE.Vector2());
  setPointGetter(pointGetter);
  addPoint();
  processAddPoint();
  setGameStatus(GameStatus.GetPoint);
}

function handleHit(obj: Object2d, hit: Hit) {
  const { isFinish, setHit } = useGameStore.getState();
  if (obj.name === PADDLE_1 || obj.name === PADDLE_2) {
    if (Math.abs(hit.normal.y) > 0.9) {
      handleHitPaddle();
      setHit(obj.name, hit.point, hit.normal);
    return;
    }
    handleHitSideWall();
    return;
  }
  if (obj.name === SIDE_1 || obj.name === SIDE_2) {
    handleHitSideWall();
    setHit(obj.name, hit.point, hit.normal);
    return;
  }
  handleHitGoalWall();
}

function onHit(ball: THREE.Box2, obj: Object2d): boolean {
  const hit = intersect(ball, obj.ref.current);
  if (hit) {
    handleHit(obj, hit);
    return true;
  }
  return false;
}

export function CliGameCore() {
  const ball: Object2d = { name: 'ball', ref: useRef<THREE.Box2>(null!) };
  const paddles: [Object2d, Object2d] = [
    { name: PADDLE_2, ref: useRef<THREE.Box2>(null!) },
    { name: PADDLE_1, ref: useRef<THREE.Box2>(null!) }
  ];
  const walls: [Object2d, Object2d, Object2d, Object2d] = [
    { name: SIDE_1, ref: useRef<THREE.Box2>(null!) },
    { name: SIDE_2, ref: useRef<THREE.Box2>(null!) },
    { name: GOAL_1, ref: useRef<THREE.Box2>(null!) },
    { name: GOAL_2, ref: useRef<THREE.Box2>(null!) }
  ];

  useEffect(() => {
    if (
      !paddles[0].ref.current ||
      !paddles[1].ref.current ||
      !walls[0].ref.current ||
      !walls[1].ref.current ||
      !walls[2].ref.current ||
      !walls[3].ref.current
    ) return;
    move(paddles[0], new THREE.Vector2(0, PADDLE_POSITION_Z2));
    move(paddles[1], new THREE.Vector2(0, PADDLE_POSITION_Z1));
    move(walls[0], new THREE.Vector2(-STAGE_WIDTH / 2, 0));
    move(walls[1], new THREE.Vector2(STAGE_WIDTH / 2, 0));
    move(walls[2], new THREE.Vector2(0, -STAGE_HEIGHT / 2));
    move(walls[3], new THREE.Vector2(0, STAGE_HEIGHT / 2));
  }, []);

  const done = useRef<boolean>(false);

  function accept(): boolean {
    const { acceptNextStatus, setAcceptNextStatus } = useGameStore.getState();
    if (acceptNextStatus) {
      setAcceptNextStatus(false);
      done.current = false;
      return true;
    }
    return false;
  }

  const tmpVec2 = useRef<THREE.Vector2>(new THREE.Vector2());

  function moveBallForPaddle() {
    const { paddlesPosition, setBallPosition } = useStageStore.getState();
    const { pointGetter } = useGameStore.getState();
    const posY = pointGetter ? PADDLE_POSITION_Z2 : PADDLE_POSITION_Z1;
    setBallPosition(tmpVec2.current.set(
      paddlesPosition[Number(!pointGetter)],
      posY - Math.sign(posY) * 1.2
    ));
  }

  const beforeBallPosition = useRef<THREE.Vector2 | null>(null);
  const beforePaddlePosition = useRef<THREE.Vector2 | null>(null);
  const ballVelocity = useRef<THREE.Vector2>(new THREE.Vector2());
  const paddleVelocity = useRef<THREE.Vector2>(new THREE.Vector2());

  function changeServePosition() {
    const { delta, ballPosition, paddlesPosition, setBallPosition } = useStageStore.getState();
    const newBallPos = ballPosition.clone();
    const paddlePos = new THREE.Vector2(paddlesPosition[Number(!useGameStore.getState().pointGetter)], 0);

    if ( !beforeBallPosition.current || !beforePaddlePosition.current ) {
      beforeBallPosition.current = newBallPos;
      beforePaddlePosition.current = paddlePos;
      return;
    }

    ballVelocity.current.subVectors(newBallPos, beforeBallPosition.current).divideScalar(delta);
    paddleVelocity.current.subVectors(paddlePos, beforePaddlePosition.current!).divideScalar(delta);
    beforeBallPosition.current?.copy(ballPosition);
    beforePaddlePosition.current?.copy(paddlePos);

    if (paddleVelocity.current.x !== ballVelocity.current.x) {
      ballVelocity.current.multiplyScalar(FRICTION);
      if(ballVelocity.current.lengthSq() < 0.0001) ballVelocity.current.set(0, 0);
      newBallPos.x += ballVelocity.current.x * delta;
      newBallPos.x = THREE.MathUtils.clamp(newBallPos.x, -STAGE_WIDTH / 2 + 0.8, STAGE_WIDTH / 2 - 0.8);
    }

    newBallPos.x = THREE.MathUtils.clamp(
      newBallPos.x,
      paddlePos.x - PADDLE_HALF_X + BALL_SIZE / 2,
      paddlePos.x + PADDLE_HALF_X - BALL_SIZE / 2
    );
    setBallPosition(newBallPos);
  }

  function resetBeforePositions() {
    beforeBallPosition.current = null;
    beforePaddlePosition.current = null;
  }

  useFrame(() => {
    const { delta, ballPosition, velocity, paddlesPosition, setBallSpeed, setBallPosition } = useStageStore.getState();
    const { gameStatus, isFinish, serveHit, setGameStatus, setServeHit } = useGameStore.getState();

    move(paddles[0], tmpVec2.current.set(paddlesPosition[0] ,PADDLE_POSITION_Z2));
    move(paddles[1], tmpVec2.current.set(paddlesPosition[1] ,PADDLE_POSITION_Z1));

    if (gameStatus === GameStatus.First) {
      if (!done.current) {
        done.current = true;
        moveBallForPaddle();
      } else if (accept()) {
        setGameStatus(GameStatus.Serving);
      }
    } else if (gameStatus === GameStatus.Serving) {
      changeServePosition();
      if(serveHit) {
        setServeHit(false);
        handleHitPaddle();
        resetBeforePositions();
        setGameStatus(GameStatus.Playing);
      }
    } else if (gameStatus === GameStatus.Playing) {
      setBallPosition( ballPosition.clone().addScaledVector(velocity, delta) );
      move(ball, useStageStore.getState().ballPosition);
      for (const obj of [ ...paddles, ...walls ]) {
        if (onHit(ball.ref.current, obj)) break;
      }
      if (useGameStore.getState().gameStatus === GameStatus.GetPoint) {
        if (!done.current) {
          done.current = true;
          setBallSpeed();
          isFinish
            ? setBallPosition(tmpVec2.current.set(0, 0))
            : moveBallForPaddle();
        }
      }
    } else if (gameStatus === GameStatus.GetPoint) {
      if (accept()) setGameStatus(isFinish ? GameStatus.End : GameStatus.Serving);
    } else { // GameStatus.End
      if (accept()) {
        // reset all してから
        // setGameStatus(GameStatus.First);
      }
    }

    move(ball, useStageStore.getState().ballPosition);
  }, FramePriority.GameCore);

  return (
    <>
      <SetDelta />
      {[ball, ...paddles, ...walls].map((obj, i) =>
        <Box2 key={i} ref={obj.ref} args={argsList[i]} />
      )}
    </>
  )
}

