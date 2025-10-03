import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CPUMode, EFFECT_MATERIAL_ARGS, EFFECT_MESH_WIDTH, FramePriority, GameStatus, GOAL_1, GOAL_2, PADDLE_1, PADDLE_2, PADDLE_HEIGHT, PADDLE_POSITION_Z1, PADDLE_POSITION_Z2, PADDLE_WIDTH, SIDE_1, SIDE_2, STAGE_HEIGHT, STAGE_WIDTH, WALL_DEPTH, WALL_HEIGHT } from './constants';
import { useCameraStore, useGameStore, useStageStore } from './store';
import { PointDisplay } from './point.tsx';
import { PaddleController } from './controller.tsx';
import { fitObject } from './CameraControl.tsx';
import { CliGameCore } from './gameCore.tsx';
import { TriggerBlinkingEffect, TriggerStretchEffect } from './effect.tsx';

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
    <boxGeometry args={[PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_HEIGHT]} />
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
  const texture = useLoader(THREE.TextureLoader, './texture/floor.png');
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.5}>
      <planeGeometry args={[STAGE_WIDTH, STAGE_HEIGHT]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

function PointDisplays() {
  const point1 = useGameStore(s => s.points[1]);
  const point2 = useGameStore(s => s.points[0]);

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
      <PointDisplay position={[0, 0, 0]} num={point1} isP1={true} />
      <PointDisplay position={[20, 0, 0]} num={point2} isP1={false} />
    </group>
  )
}

type StageProps = {
  isResizing: boolean
}

export default function Stage({isResizing}: StageProps) {
  const { camera } = useThree();
  const { setIsObjectFit } = useCameraStore.getState();
  const [triggerStretchEffect, setTriggerStretchEffect] = useState<TriggerStretchEffect | null>(null);
  const [triggerBlinkingEffect, setTriggerBlinkingEffect] = useState<TriggerBlinkingEffect | null>(null);
  const stageGroup = useRef<THREE.Group>(null!);
  const ballRef = useRef<THREE.Mesh>(null!);
  const paddleRefs = [ useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!) ];
  const goalWall1Ref = useRef<THREE.Mesh>(null!);
  const goalWall2Ref = useRef<THREE.Mesh>(null!);
  const sideWallsRef = [useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!)];

  const tmpVec2 = useRef<THREE.Vector2>(new THREE.Vector2());
  const tmpVec3 = useRef<THREE.Vector3>(new THREE.Vector3());
  const saved = useRef<boolean>(false);

  function toVec3(vec2: THREE.Vector2) {
    return tmpVec3.current.set(vec2.x, 0, vec2.y);
  }

  function toVec2(vec3: THREE.Vector3) {
    return tmpVec2.current.set(vec3.x, vec3.z);
  }


  const wallMat = useMemo(() =>
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.3
    }), []
  );

  useEffect(() => {
    if (!stageGroup.current) return;
    if (isResizing) return setIsObjectFit(false);
    fitObject(camera as THREE.PerspectiveCamera, stageGroup.current, 1.1);
    setIsObjectFit(true);
  }, [isResizing, camera]);



  function moveBall(pos: THREE.Vector2) {
    const speed = 20;
    const { ballPosition, setBallPosition, delta } = useStageStore.getState();

    for (const axis of ['y', 'x'] as ('x' | 'y')[]) {
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

  const sleepRef = useRef<number | null>(null); // ms
  function setSleep(ms: number) {
    sleepRef.current = performance.now() + ms;
  }
  function sleep() {
    if(!sleepRef.current) return false;
    return sleepRef.current <= performance.now();
  }

  useFrame(() => {
    const { delta, ballPosition, setBallPosition, velocity, paddlesPosition, pointDisplayMats } = useStageStore.getState();
    const { gameStatus, matchPoint, isFinish, serveHit, setServeHit, pointGetter, points, setAcceptNextStatus } = useGameStore.getState();

    paddleRefs[0].current.position.x = paddlesPosition[0];
    paddleRefs[1].current.position.x = paddlesPosition[1];

    if (gameStatus === GameStatus.First) {
      if (!saved.current) tmpVec2.current.copy(ballPosition);
      if (moveBall(tmpVec2.current)) {
        saved.current = false;
        setAcceptNextStatus(true);
      }
    } else if (gameStatus === GameStatus.GetPoint) {
      if (sleep()) {
        if (!saved.current) tmpVec2.current.copy(ballPosition);
        if (moveBall(tmpVec2.current)) {
          saved.current = false;
          setAcceptNextStatus(true);
        }
      } else if (sleepRef.current === null) {
        setSleep(250);
      }
    }

    ballRef.current.position.copy(toVec3(ballPosition))
  }, FramePriority.Stage);

  return (
    <>
      <CliGameCore />
      <PaddleController isP1={false} cpuMode={CPUMode.Easy} />
      <PaddleController isP1={true} />
      <group ref={stageGroup}>
        <SideWall
          ref={sideWallsRef[0]}
          name={SIDE_1}
          position={[-STAGE_WIDTH / 2, 0, 0]}
          material={wallMat}
        />
        <SideWall
          ref={sideWallsRef[1]}
          name={SIDE_2}
          position={[STAGE_WIDTH / 2, 0, 0]}
          material={wallMat}
        />
        <GoalWall
          ref={goalWall1Ref}
          name={GOAL_1}
          position={[0, 0, STAGE_HEIGHT / 2]}
          material={wallMat}
        />
        <GoalWall
          ref={goalWall2Ref}
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