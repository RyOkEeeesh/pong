import * as THREE from 'three';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { ACCELERATION, BALL_SIZE, BALL_SPEED_MAX, GameStatus, GOAL_1, GOAL_2, PADDLE_1, PADDLE_2, PADDLE_DEPTH, PADDLE_HALF_X, PADDLE_POSITION_Z1, PADDLE_POSITION_Z2, SIDE_1, SIDE_2, STAGE_HEIGHT, STAGE_WIDTH, WALL_DEPTH, WALL_HEIGHT } from './constants';
import { Position, useGameStore, useStageStore } from './store';
import { Hit, intersect } from './core';

type Object2d = { name: string; ref: React.RefObject<THREE.Box2> }

type ObjectProps = {
  position?: Position;
  args: ConstructorParameters<typeof THREE.Box2>;
}

function move(box: THREE.Box2, position: Position) {
  const size = new THREE.Vector2();
  box.getSize(size);
  box.setFromCenterAndSize(new THREE.Vector2(position[0], position[1]), size);
}

const Box2 = forwardRef<THREE.Box2, ObjectProps>((props, ref) => {
  const ballRef = useRef<THREE.Box2>(null!);
  useImperativeHandle(ref, () => ballRef.current);

  useEffect(() => {
    if (!ballRef.current) return;
    if (props.position) move(ballRef.current, props.position);
  }, []);

  return <box2 {...props} />;
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
    (ballPosition.clone().x - paddlePos) / PADDLE_HALF_X,
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
      setHit(obj.name, hit.hitPoint);
    return;
    }
    handleHitSideWall();
    return;
  }
  if (obj.name === SIDE_1 || obj.name === SIDE_2) {
    handleHitSideWall();
    setHit(obj.name, hit.hitPoint);
    return;
  }
  handleHitGoalWall();
}

function onHit(ball: THREE.Box2, obj: Object2d): boolean {
  const hit = intersect(ball, obj.ref.current);
  if (hit) {
    handleHit(obj, hit)
    return true;
  }
  return false;
}

function CliGameCore() {
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

  function accept(): Boolean {
    const { acceptNextStatus, setAcceptNextStatus } = useGameStore.getState();
    if (acceptNextStatus) {
      setAcceptNextStatus(false);
      done.current = false;
      return true;
    }
    return false;
  }

  useFrame((_, delta) => {
    const { setDelta } = useStageStore.getState();
    setDelta(delta);

    // 処理続きから
  })

  return (
    <>
      <Box2 ref={ballRef} args={ballArgs} />
      { // paddles
        [
          [0, PADDLE_POSITION_Z2],
          [0, PADDLE_POSITION_Z1]
        ].map((position, i) =>
          <Box2 ref={paddles[i].ref} args={paddleArgs} position={position as Position} />
        )
      } { // walls
        [
          [-STAGE_WIDTH / 2, 0],
          [STAGE_WIDTH / 2, 0],
          [0, -STAGE_HEIGHT / 2],
          [0, STAGE_HEIGHT / 2]
        ].map((position, i) =>
          <Box2 ref={walls[i].ref} args={(i < 2 ? sideWallArgs : goalWallArgs)} position={position as Position} />
        )
      }
    </>
  )
}

