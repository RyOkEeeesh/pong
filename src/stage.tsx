import React, { useState } from "react";
import { RootState, useFrame, useLoader, useThree } from "@react-three/fiber";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { fitObject, fitObjectFast } from "./ThreeModule";
import { acceleratedRaycast, MeshBVH } from "three-mesh-bvh";
import {
  BALL_SPEED,
  GOAL_1,
  GOAL_2,
  PADDLE_1,
  PADDLE_2,
  PADDLE_HALF_X,
  SIDE,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  WALL_DEPTH,
  WALL_HEIGHT
} from "./constants";
import { useGameStore, useStageStore } from "./store";
import { PointDisplay } from "./point.tsx";
import { PaddleController } from "./control.tsx"

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
  const store = useStageStore.getState();
  const v = store.velocity.clone();
  v.z *= -1;
  store.setVelocity(v);
  useGameStore.getState().addPoint(playre);
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

type StageProps = {
  isResizing: boolean
}

export default function Stage({isResizing}: StageProps) {
  const { camera } = useThree();
  const stageGroup = useRef<THREE.Group>(null!);

  const ballRef = useRef<THREE.Mesh>(null!);
  const paddle1Ref = useRef<THREE.Mesh>(null!);
  const paddle2Ref = useRef<THREE.Mesh>(null!);
  const GoalWall1Ref = useRef<THREE.Mesh>(null!);
  const GoalWall2Ref = useRef<THREE.Mesh>(null!);
  const SideWallsRef = [useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!)];

  const refs = [
    paddle1Ref,
    paddle2Ref,
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

    // 後で消してね
    useStageStore
      .getState()
      .setVelocity(new THREE.Vector3(0, 0, 1).normalize().multiplyScalar(BALL_SPEED));
  }, []);

  useEffect(() => { // 画面リサイズ処理
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
  }

  function checkBallCollision(store: ReturnType<typeof useStageStore.getState>) {
    const frameVelocity = store.velocity.clone().multiplyScalar(store.delta).length();
    for (const offset of offsets) {
      const origin = store.ballPosition.clone().add(offset);
      const ray = new THREE.Raycaster(
        origin,
        store.velocity.clone().normalize(),
        0,
        frameVelocity + 0.09
      );

      for (const objRef of refs) {
        const obj = objRef.current;
        const normal = checkHit(ray, obj);
        if (normal) {
          handleHitObj(obj, normal);

          const pushBack = normal.clone().multiplyScalar(0.25);
          const newPos = store.ballPosition.clone().add(pushBack);
          store.setBallPosition(newPos);

          return;
        }
      }
    }
  }

  useFrame((state: RootState, delta: number) => {
    const store = useStageStore.getState();
    store.setDelta(delta);

    let newPos = store.ballPosition.clone().addScaledVector(store.velocity, delta);
    store.setBallPosition(newPos);

    checkBallCollision(store);

    paddle1Ref.current.position.x = store.p1PositionX;
    paddle2Ref.current.position.x = store.p2PositionX;

    ballRef.current.position.copy(store.ballPosition);
  });

  return (
    <>
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
        ref={paddle1Ref}
        name={PADDLE_1}
        position={[0, 0, STAGE_HEIGHT / 2 - 1]}
        material={wallMat.clone()}
      />
      <Paddle
        ref={paddle2Ref}
        name={PADDLE_2}
        position={[0, 0, -STAGE_HEIGHT / 2 + 1]}
        material={wallMat.clone()}
      />

      <Ball ref={ballRef} material={wallMat.clone()} />
      <Floor />

      <PointDisplays />
    </>
  );
}