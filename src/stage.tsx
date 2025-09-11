import React, { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { fitObject } from "./ThreeModule";
import { acceleratedRaycast, MeshBVH } from "three-mesh-bvh";
import {
  BALL_SIZE,
  BALL_SPEED,
  CPUMode,
  GameStatus,
  GOAL_1,
  GOAL_2,
  PADDLE_1,
  PADDLE_2,
  PADDLE_HALF_X,
  PADDLE_POSITION_Z1,
  PADDLE_POSITION_Z2,
  SIDE,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  WALL_DEPTH,
  WALL_HEIGHT
} from "./constants";
import { useGameStore, useStageStore } from "./store";
import { PointDisplay } from "./point.tsx";
import { PaddleController } from "./controller.tsx";

(THREE.BufferGeometry.prototype as any).computeBoundsTree = function () {
  (this as any).boundsTree = new MeshBVH(this);
};
(THREE.BufferGeometry.prototype as any).disposeBoundsTree = function () {
  (this as any).boundsTree = null;
};
(THREE.Mesh.prototype as any).raycast = acceleratedRaycast;

type MeshProps = {
  name: string;
  position: [number, number, number];
  material: THREE.MeshStandardMaterial;
};

const SideWall = forwardRef<THREE.Mesh, MeshProps>((props, ref) => (
  <mesh ref={ref} {...props} rotation={[0, Math.PI / 2, 0]}>
    <boxGeometry args={[STAGE_HEIGHT - WALL_DEPTH, WALL_HEIGHT, WALL_DEPTH]} />
  </mesh>
));

const GoalWall = forwardRef<THREE.Mesh, MeshProps>((props, ref) => (
  <mesh ref={ref} {...props}>
    <boxGeometry args={[STAGE_WIDTH + WALL_DEPTH, WALL_HEIGHT, WALL_DEPTH]} />
  </mesh>
));

const Paddle = forwardRef<THREE.Mesh, MeshProps>((props, ref) => (
  <mesh ref={ref} {...props}>
    <boxGeometry args={[STAGE_WIDTH / 6, WALL_HEIGHT, WALL_HEIGHT]} />
  </mesh>
));

const Ball = forwardRef<THREE.Mesh, { material: THREE.MeshStandardMaterial }>(
  ({ material }, ref) => (
    <mesh ref={ref} material={material}>
      <boxGeometry />
    </mesh>
  )
);

function Floor() {
  const texture = useLoader(THREE.TextureLoader, "./texture/floor.png");
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.5}>
      <planeGeometry args={[STAGE_WIDTH, STAGE_HEIGHT]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

function handleHitSideWall() {
  const store = useStageStore.getState();
  const v = store.velocity.clone();
  v.x *= -1;
  store.setVelocity(v);
}

function handleHitGoalWall(playre: boolean) {
  useStageStore.getState().setVelocity(new THREE.Vector3());
  const { setGameStatus, addPoint, setPointGetter } = useGameStore.getState();
  addPoint(playre);
  setPointGetter(playre);
  setGameStatus(GameStatus.GetPoint);
}

function handleHitPaddle(mesh: THREE.Mesh, normal: THREE.Vector3) {
  const store = useStageStore.getState();
  if (Math.abs(normal.z) > 0.9) {
    const normalized = THREE.MathUtils.clamp(
      (store.ballPosition.clone().x - mesh.position.clone().x) / PADDLE_HALF_X,
      -1,
      1
    );
    const maxAngle = Math.PI / 3;
    const angle = normalized * maxAngle;
    const dz = mesh.position.z > 0 ? -1 : 1;
    const newVelocity = new THREE.Vector3(
      store.ballSpeed * Math.sin(angle),
      0,
      dz * store.ballSpeed * Math.cos(angle)
    );
    store.setVelocity(newVelocity);
  } else {
    handleHitSideWall();
  }
}

function PointDisplays() {
  const point1 = useGameStore(s => s.point1);
  const point2 = useGameStore(s => s.point2);

  const groupRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x = -Math.PI / 2;
    groupRef.current.rotation.z = Math.PI / 2;
    groupRef.current.scale.set(0.4, 0.4, 0.4);
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new THREE.Vector3());
    groupRef.current.position.sub(center);
    groupRef.current.position.y = -0.5;
    groupRef.current.position.x = -5.5;
  }, []);

  return (
    <group ref={groupRef}>
      <PointDisplay position={[0, 0, 0]} num={point1} />
      <PointDisplay position={[20, 0, 0]} num={point2} />
    </group>
  )
}

const serviceHit = new THREE.Vector3(0, 0, 1);

type StageProps = {
  isResizing: boolean
}

export default function Stage({isResizing}: StageProps) {
  const { camera } = useThree();
  const { setGameStatus } = useGameStore.getState();

  const stageGroup = useRef<THREE.Group>(null!);

  const ballRef = useRef<THREE.Mesh>(null!);
  const paddleRefs = [ useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!) ]; // [ p2, p1 ]
  const GoalWall1Ref = useRef<THREE.Mesh>(null!);
  const GoalWall2Ref = useRef<THREE.Mesh>(null!);
  const SideWallsRef = [useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!)];

  const refs = [
    ...paddleRefs,
    GoalWall1Ref,
    GoalWall2Ref,
    ...SideWallsRef
  ];

  const wallMat = useMemo(() =>
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.3
    }), []
  );

  const offsets = useMemo(() => [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.5, 0, 0.5),
      new THREE.Vector3(-0.5, 0, 0.5),
      new THREE.Vector3(0.5, 0, -0.5),
      new THREE.Vector3(-0.5, 0, -0.5)
    ], []
  );

  const normalMatrix = useMemo(() => new THREE.Matrix3(), []);

  useEffect(() => {
    refs.forEach(ref => ref.current?.geometry.computeBoundsTree());
  }, []);

  useEffect(() => {
    if (!stageGroup.current) return;
    if (!isResizing) fitObject(camera as THREE.PerspectiveCamera, stageGroup.current, 1.1);
  }, [isResizing, camera]);

  function handleHitObj(mesh: THREE.Mesh, normal: THREE.Vector3) {
    switch (mesh.name) {
      case PADDLE_1:
      case PADDLE_2:
        handleHitPaddle(mesh, normal);
        break;
      case SIDE:
        handleHitSideWall();
        break;
      case GOAL_1:
        handleHitGoalWall(false);
        break;
      case GOAL_2:
        handleHitGoalWall(true);
        break;
    }
  }

  function checkHit(ray: THREE.Raycaster, obj: THREE.Mesh) {
    const intersects = ray.intersectObject(obj, true);
    if (intersects.length > 0) {
      return intersects[0].face?.normal
        .clone()
        .applyMatrix3(normalMatrix.getNormalMatrix(obj.matrixWorld));
    }
    return undefined;
  }

  function checkBallCollision() {
    const { velocity, delta, ballPosition, setBallPosition } = useStageStore.getState();
    const frameVelocity = velocity.clone().multiplyScalar(delta).length();
    for (const offset of offsets) {
      const origin = ballPosition.clone().add(offset);
      const ray = new THREE.Raycaster(
        origin,
        velocity.clone().normalize(),
        0,
        frameVelocity + 0.09
      );

      for (const objRef of refs) {
        const obj = objRef.current;
        if (!obj) continue;
        const normal = checkHit(ray, obj);
        if (normal) {
          handleHitObj(obj, normal);

          const pushBack = normal.clone().multiplyScalar(0.25);
          const newPos = ballPosition.clone().add(pushBack);
          setBallPosition(newPos);

          return;
        }
      }
    }
  }

  function moveBall(pos: THREE.Vector3) {
    const speed = 20;
    const { ballPosition, setBallPosition, delta } = useStageStore.getState();

    const axes: ('z' | 'x')[] = ['z', 'x'];

    for (const axis of axes) {
      const dir = pos[axis] - ballPosition[axis];
      if (Math.abs(dir) > 0.001) {
        const step = Math.sign(dir) * speed * delta;
        ballPosition[axis] += Math.abs(dir) > Math.abs(step) ? step : dir;
        setBallPosition(ballPosition);
        return false;
      }
    }

    return true;
  }

  function moveBallForPaddle() {
    const { pointGetter } = useGameStore.getState();
    const ref = paddleRefs[Number(!pointGetter)].current;
    if (!ref) return true;
    const position = ref.position.clone();
    position.z = position.z - Math.sign(position.z) * 1.2;
    return moveBall(position);
  }

  const beforeBallPosition = useRef<THREE.Vector3 | null>(null);
  const beforePaddlePosition = useRef<THREE.Vector3 | null>(null);
  const ballVelocity = useRef<THREE.Vector3>(new THREE.Vector3());
  const paddleVelocity = useRef<THREE.Vector3>(new THREE.Vector3());

  function moveBallForServe() {
    const paddle = paddleRefs[Number(!useGameStore.getState().pointGetter)];
    const { delta, ballPosition, setBallPosition } = useStageStore.getState();

    if (!beforeBallPosition.current || !beforePaddlePosition.current || !paddle.current) {
      beforeBallPosition.current = ballPosition.clone();
      if (paddle.current) beforePaddlePosition.current = paddle.current.position.clone();
      return;
    }

    ballVelocity.current.subVectors(ballPosition.clone(), beforeBallPosition.current!).divideScalar(delta);
    paddleVelocity.current.subVectors(paddle.current.position.clone(), beforePaddlePosition.current!).divideScalar(delta);
    beforeBallPosition.current?.copy(ballPosition);
    beforePaddlePosition.current?.copy(paddle.current.position);

    const friction = 0.965;
    const newPos = ballPosition.clone();

    if (paddleVelocity.current.x !== ballVelocity.current.x) {
      ballVelocity.current.multiplyScalar(friction);
      if(ballVelocity.current.lengthSq() < 0.0001) ballVelocity.current.set(0, 0, 0);
      newPos.x += ballVelocity.current.x * delta;
      newPos.x = THREE.MathUtils.clamp(newPos.x, -STAGE_WIDTH / 2 + 0.8, STAGE_WIDTH / 2 - 0.8);
    }

    newPos.x = THREE.MathUtils.clamp(
      newPos.x,
      paddle.current.position.x - PADDLE_HALF_X + BALL_SIZE / 2,
      paddle.current.position.x + PADDLE_HALF_X - BALL_SIZE / 2
    );
    setBallPosition(newPos);
  }

  function resetBeforePositions() {
    beforeBallPosition.current = null;
    beforePaddlePosition.current = null;
  }

  useFrame((_, delta: number) => {
    const { setDelta, ballPosition, setBallPosition, velocity, paddlePosition } = useStageStore.getState();
    const { gameStatus, serveHit, setServeHit, pointGetter } = useGameStore.getState();
    setDelta(delta);

    switch (gameStatus) {
      case GameStatus.Waiting:
        break;
      case GameStatus.First:
        {
          if(moveBallForPaddle()) setGameStatus(GameStatus.Serving);
        }
        break;
      case GameStatus.Serving:
        {
          moveBallForServe();
          if(serveHit) {
            setServeHit(false);
            handleHitPaddle(paddleRefs[Number(!pointGetter)].current, serviceHit);
            resetBeforePositions();
            setGameStatus(GameStatus.Playing);
          }
        }
        break;
      case GameStatus.Playing:
        { // playing
          const newPos = ballPosition.clone().addScaledVector(velocity, delta);
          setBallPosition(newPos);

          checkBallCollision();
        }
        break;
      case GameStatus.GetPoint:
        {
          // エフェクト実装
          if(moveBallForPaddle()) setGameStatus(GameStatus.Serving);
        }
        break;
      case GameStatus.End:
      case GameStatus.Pause:
        break;
    }

    paddleRefs[0].current.position.x = paddlePosition[0];
    paddleRefs[1].current.position.x = paddlePosition[1];

    ballRef.current.position.copy(ballPosition)
  });

  return (
    <>
      <PaddleController isP1={false} cpuMode={CPUMode.Easy} />
      <PaddleController isP1={true} />
      <group ref={stageGroup}>
        <SideWall
          ref={SideWallsRef[0]}
          name={SIDE}
          position={[-STAGE_WIDTH / 2, 0, 0]}
          material={wallMat}
        />
        <SideWall
          ref={SideWallsRef[1]}
          name={SIDE}
          position={[STAGE_WIDTH / 2, 0, 0]}
          material={wallMat}
        />
        <GoalWall
          ref={GoalWall1Ref}
          name={GOAL_1}
          position={[0, 0, STAGE_HEIGHT / 2]}
          material={wallMat}
        />
        <GoalWall
          ref={GoalWall2Ref}
          name={GOAL_2}
          position={[0, 0, -STAGE_HEIGHT / 2]}
          material={wallMat}
        />
      </group>

      <Paddle
        ref={paddleRefs[1]}
        name={PADDLE_1}
        position={[0, 0, PADDLE_POSITION_Z1]}
        material={wallMat.clone()}
      />
      <Paddle
        ref={paddleRefs[0]}
        name={PADDLE_2}
        position={[0, 0, PADDLE_POSITION_Z2]}
        material={wallMat.clone()}
      />

      <Ball ref={ballRef} material={wallMat.clone()} />
      <Floor />

      <PointDisplays />
    </>
  );
}
