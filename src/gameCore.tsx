import * as THREE from 'three';
import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ACCELERATION, BALL_SIZE, BALL_SPEED, BALL_SPEED_MAX, FramePriority, FRICTION, GameStatus, GOAL_1, GOAL_2, PADDLE_1, PADDLE_2, PADDLE_DEPTH, PADDLE_HALF_X, PADDLE_POSITION_Z1, PADDLE_POSITION_Z2, SIDE_1, SIDE_2, STAGE_HEIGHT, STAGE_WIDTH, WALL_DEPTH, WALL_HEIGHT } from './constants';
import { useGameStore, coreStore } from './store';
import { Hit, intersect } from './core';

function SetDelta() {
  useFrame((_, delta) => { coreStore.delta = delta }, FramePriority.SetDelta);
  return null;
}

type Object2d = { name: string; ref: React.RefObject<THREE.Box2> };

type ObjectProps = {
  args: ConstructorParameters<typeof THREE.Box2>;
};

function move(obj: Object2d, position: THREE.Vector2) {
  const size = new THREE.Vector2();
  obj.ref.current.getSize(size);
  obj.ref.current.setFromCenterAndSize(position, size);

  const center = new THREE.Vector2();
  obj.ref.current.getCenter(center);
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

function handleHitPaddle() {
  const paddlePos = coreStore.paddlesPosition[Number(coreStore.ballPosition.y > 0)];

  const normalized = THREE.MathUtils.clamp(
    (coreStore.ballPosition.x - paddlePos) / PADDLE_HALF_X,
    -1,
    1
  );
  const maxAngle = Math.PI / 3;
  const angle = normalized * maxAngle;
  coreStore.velocity.set(
    coreStore.ballSpeed * Math.sin(angle),
    -Math.sign(coreStore.ballPosition.y) * coreStore.ballSpeed * Math.cos(angle)
  );
  coreStore.ballSpeed = Math.min(coreStore.ballSpeed + ACCELERATION, BALL_SPEED_MAX);
}

function handleHitSideWall() {
  coreStore.velocity.x *= -1;
}

function handleHitGoalWall() {
  const { setGameStatus, addPoint, processAddPoint, setPointGetter } = useGameStore.getState();
  const pointGetter = coreStore.ballPosition.y < 0;
  coreStore.velocity.set(0, 0);
  setPointGetter(pointGetter);
  addPoint();
  processAddPoint();
  setGameStatus(GameStatus.GetPoint);
}

function handleHit(obj: Object2d, hit: Hit) {
  const { setHit } = useGameStore.getState();
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
    if (obj.name !== PADDLE_1 && obj.name !== PADDLE_2)
      coreStore.ballPosition.copy(hit.point);
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
    { name: GOAL_1, ref: useRef<THREE.Box2>(null!) },
    { name: GOAL_2, ref: useRef<THREE.Box2>(null!) },
    { name: SIDE_1, ref: useRef<THREE.Box2>(null!) },
    { name: SIDE_2, ref: useRef<THREE.Box2>(null!) }
  ];

  const argsList = useMemo(() => [
    ballArgs(),
    paddleArgs(),
    paddleArgs(),
    goalWallArgs(),
    goalWallArgs(),
    sideWallArgs(),
    sideWallArgs()
  ], []);

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
    move(walls[0], new THREE.Vector2(0, STAGE_HEIGHT / 2));
    move(walls[1], new THREE.Vector2(0, -STAGE_HEIGHT / 2));
    move(walls[2], new THREE.Vector2(-STAGE_WIDTH / 2, 0));
    move(walls[3], new THREE.Vector2(STAGE_WIDTH / 2, 0));
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
    const { pointGetter } = useGameStore.getState();
    const posY = pointGetter ? PADDLE_POSITION_Z2 : PADDLE_POSITION_Z1;
    coreStore.ballPosition.copy(
      tmpVec2.current.set(
        coreStore.paddlesPosition[Number(!pointGetter)],
        posY - Math.sign(posY) * 1.2
      )
    );
  }

  const beforeBallPosition = useRef<THREE.Vector2 | null>(null);
  const beforePaddlePosition = useRef<THREE.Vector2 | null>(null);
  const ballVelocity = useRef<THREE.Vector2>(new THREE.Vector2());
  const paddleVelocity = useRef<THREE.Vector2>(new THREE.Vector2());

  function changeServePosition() {
    const newBallPos = coreStore.ballPosition.clone();
    const paddlePos = new THREE.Vector2(coreStore.paddlesPosition[Number(!useGameStore.getState().pointGetter)], 0);

    if ( !beforeBallPosition.current || !beforePaddlePosition.current ) {
      beforeBallPosition.current = newBallPos;
      beforePaddlePosition.current = paddlePos;
      return;
    }

    ballVelocity.current.subVectors(newBallPos, beforeBallPosition.current).divideScalar(coreStore.delta);
    paddleVelocity.current.subVectors(paddlePos, beforePaddlePosition.current!).divideScalar(coreStore.delta);
    beforeBallPosition.current.copy(coreStore.ballPosition);
    beforePaddlePosition.current.copy(paddlePos);

    if (paddleVelocity.current.x !== ballVelocity.current.x) {
      ballVelocity.current.multiplyScalar(FRICTION);
      if(ballVelocity.current.lengthSq() < 0.0001) ballVelocity.current.set(0, 0);
      newBallPos.x += ballVelocity.current.x * coreStore.delta;
      newBallPos.x = THREE.MathUtils.clamp(newBallPos.x, -STAGE_WIDTH / 2 + 0.8, STAGE_WIDTH / 2 - 0.8);
    }

    newBallPos.x = THREE.MathUtils.clamp(
      newBallPos.x,
      paddlePos.x - PADDLE_HALF_X + BALL_SIZE / 2,
      paddlePos.x + PADDLE_HALF_X - BALL_SIZE / 2
    );
    coreStore.ballPosition.copy(newBallPos);
  }

  function resetBeforePositions() {
    beforeBallPosition.current = null;
    beforePaddlePosition.current = null;
  }

  function updatePaddlesPosition() {
    move(paddles[0], tmpVec2.current.set(coreStore.paddlesPosition[0] ,PADDLE_POSITION_Z2));
    move(paddles[1], tmpVec2.current.set(coreStore.paddlesPosition[1] ,PADDLE_POSITION_Z1));
  }

  function updateBallPosition() {
    move(ball, coreStore.ballPosition);
  }

  useFrame(() => {
    const { gameStatus, isFinish, serveHit, setGameStatus, setServeHit } = useGameStore.getState();
    updatePaddlesPosition();

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
      coreStore.ballPosition.addScaledVector(coreStore.velocity, coreStore.delta);
      updateBallPosition();
      for (const obj of [ ...walls, ...paddles ])
        if (onHit(ball.ref.current, obj)) break;
      if (useGameStore.getState().gameStatus === GameStatus.GetPoint) {
        if (!done.current) {
          done.current = true;
          coreStore.ballSpeed = BALL_SPEED;
          isFinish
            ? coreStore.ballPosition.copy(tmpVec2.current.set(0, 0))
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

    updateBallPosition();
  }, FramePriority.GameCore);

  return (
    <>
      <SetDelta />
      {[ ball, ...paddles, ...walls ].map((obj, i) => 
        <Box2 key={obj.name} ref={obj.ref} args={argsList[i]} />
      )}
    </>
  )
}

