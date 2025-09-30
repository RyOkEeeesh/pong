import * as THREE from 'three';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { BALL_SIZE, GOAL_1, GOAL_2, PADDLE_1, PADDLE_2, PADDLE_DEPTH, PADDLE_HALF_X, PADDLE_POSITION_Z1, PADDLE_POSITION_Z2, SIDE_1, SIDE_2, STAGE_HEIGHT, STAGE_WIDTH, WALL_DEPTH, WALL_HEIGHT } from './constants';
import { useGameStore, useStageStore } from './store';

type Position2d = [number, number];

type Object2d = { name: string; ref: React.RefObject<THREE.Box2> }

type ObjectProps = {
  position?: Position2d;
  args: ConstructorParameters<typeof THREE.Box2>;
}

function move(box: THREE.Box2, position: Position2d) {
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

function CliGameCore () {
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
          <Box2 ref={paddles[i].ref} args={paddleArgs} position={position as Position2d} />
        )
      } { // walls
        [
          [-STAGE_WIDTH / 2, 0],
          [STAGE_WIDTH / 2, 0],
          [0, -STAGE_HEIGHT / 2],
          [0, STAGE_HEIGHT / 2]
        ].map((position, i) =>
          <Box2 ref={walls[i].ref} args={(i < 2 ? sideWallArgs : goalWallArgs)} position={position as Position2d} />
        )
      }
    </>
  )
}

