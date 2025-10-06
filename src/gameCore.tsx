import * as THREE from 'three';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { ACCELERATION, BALL_SIZE, BALL_SPEED_MAX, FramePriority, FRICTION, GameStatus, GOAL_1, GOAL_2, PADDLE_1, PADDLE_2, PADDLE_DEPTH, PADDLE_HALF_X, PADDLE_POSITION_Z1, PADDLE_POSITION_Z2, SIDE_1, SIDE_2, STAGE_HEIGHT, STAGE_WIDTH, WALL_DEPTH, WALL_HEIGHT } from './constants';
import { Position, useGameStore, useStageStore } from './store';
import { Hit, intersect } from './core';

type Object2d = { name: string; ref: React.RefObject<THREE.Box2> }

type ObjectProps = {
  position?: Position;
  args: ConstructorParameters<typeof THREE.Box2>;
}

const sizeMap: <{
  name: string;
  size: THREE.Vector2;
}[]> = [];

function getSize(obj: Object2d): THREE.Vector2 {
  const objSize = sizeMap.filter(s => s.name === obj.name)[0];
  if (!objSize) {
    const sz = new THREE.Vector2();
    obj.ref.current.getSize(sz);
    sizeMap.push({name: obj.name, size: sz});
    return sz;
  }
  return objSize.size
}

function move(obj: Object2d, position: THREE.Vector2) {
  const size = getSize(obj);
  box.setFromCenterAndSize(position, size);
}

const Box2 = forwardRef<THREE.Box2, ObjectProps>((props, ref) => {
  const boxRef = useRef<THREE.Box2>(null!);
  useImperativeHandle(ref, () => boxRef.current);

  useEffect(() => {
    if (!boxRef.current) return;
    if (props.position) move(boxRef.current, new THREE.Vector2(props.position[0], props.position[1]));
  }, []);

  return <box2 ref={boxRef} {...props} />;
});

const ballArgs: ConstructorParameters<typeof THREE.Box2> = [
  new THREE.Vector2(-BALL_SIZE / 2, -BALL_SIZE / 2),
  new THREE.Vector2(BALL_SIZE / 2, BALL_SIZE / 2)
];

const paddleArgs: ConstructorParameters<typeof THREE.Box2> = [
  new THREE.Vector2(-PADDLE_HALF_X, -PADDLE_DEPTH / 2),
  new THREE.Vector2(PADDLE_HALF_X, PADDLE_DEPTH / 2)
];

const sideWallArgs: ConstructorParameters<typeof THREE.Box2> = [
  new THREE.Vector2(-WALL_DEPTH / 2, -STAGE_HEIGHT / 2),
  new THREE.Vector2(WALL_DEPTH / 2, STAGE_HEIGHT / 2)
];

const goalWallArgs: ConstructorParameters<typeof THREE.Box2> = [
  new THREE.Vector2(-STAGE_WIDTH / 2, -WALL_DEPTH / 2),
  new THREE.Vector2(STAGE_WIDTH / 2, WALL_DEPTH / 2)
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
  console.log('onHit')
  const hit = intersect(ball, obj.ref.current);
  if (hit) {
    handleHit(obj, hit);
    return true;
  }
  return false;
}

export function CliGameCore() {
  const ballRef = useRef<THREE.Box2>(null!);
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

  useFrame((_, delta) => {
    const { ballPosition, velocity, paddlesPosition, setBallSpeed, setDelta, setBallPosition } = useStageStore.getState();
    const { gameStatus, isFinish, serveHit, setGameStatus, setServeHit } = useGameStore.getState();
    if (gameStatus === GameStatus.Pause) {
      setDelta(0);
      return;
    }

    setDelta(delta);
    move(paddles[0].ref.current, tmpVec2.current.set(paddlesPosition[0] ,PADDLE_POSITION_Z2));
    move(paddles[1].ref.current, tmpVec2.current.set(paddlesPosition[1] ,PADDLE_POSITION_Z1));

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
      move(ballRef.current, useStageStore.getState().ballPosition);
      for (const obj of [ ...paddles, ...walls ]) {
        if (onHit(ballRef.current, obj)) {
          console.log('hit');
          break;
        };
      }
    } else if (gameStatus === GameStatus.GetPoint) {
      if (!done.current) {
        done.current = true;
        setBallSpeed();
        isFinish
          ? setBallPosition(tmpVec2.current.set(0, 0))
          : moveBallForPaddle();
      } else if (accept()) {
        setGameStatus(isFinish ? GameStatus.End : GameStatus.Serving);
      }
    } else { // GameStatus.End
      if (accept()) {
        // reset all してから
        // setGameStatus(GameStatus.First);
      }
    }

    move(ballRef.current, useStageStore.getState().ballPosition);
  }, FramePriority.GameCore);

  return (
    <>
      <Box2 ref={ballRef} args={ballArgs} />
      { // paddles
        [
          [0, PADDLE_POSITION_Z2],
          [0, PADDLE_POSITION_Z1]
        ].map((position, i) =>
          <Box2 key={i} ref={paddles[i].ref} args={paddleArgs} position={position as Position} />
        )
      } { // walls
        [
          [-STAGE_WIDTH / 2, 0],
          [STAGE_WIDTH / 2, 0],
          [0, -STAGE_HEIGHT / 2],
          [0, STAGE_HEIGHT / 2]
        ].map((position, i) =>
          <Box2 key={i} ref={walls[i].ref} args={(i < 2 ? sideWallArgs : goalWallArgs)} position={position as Position} />
        )
      }
    </>
  )
}

