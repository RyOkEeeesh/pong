import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { CPUMode, FramePriority, GameStatus, GOAL_1, GOAL_2, PADDLE_1, PADDLE_2, PADDLE_HEIGHT, PADDLE_POSITION_Z1, PADDLE_POSITION_Z2, PADDLE_WIDTH, SIDE_1, SIDE_2, STAGE_HEIGHT, STAGE_WIDTH, WALL_DEPTH, WALL_HEIGHT } from './constants';
import { useGameStore, coreStore } from './store';
import { PointDisplay } from './point.tsx';
import { PaddleController } from './controller.tsx';
import { CliGameCore } from './gameCore.tsx';
import { Effect, TriggerBlinkingEffect, TriggerStretchEffect } from './effect.tsx';
import { useShallow } from 'zustand/shallow';
import { OrbitControls } from '@react-three/drei';

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

type PointDisplaysPropos = {
  points: [number, number];
}

function PointDisplays({points}: PointDisplaysPropos) {
  const groupRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    if (!groupRef.current) return;
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new THREE.Vector3());
    groupRef.current.position.sub(center);
    groupRef.current.position.y = -0.5;
    groupRef.current.position.x = -5.5;
  }, []);

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={0.4}>
      <PointDisplay position={[0, 0, 0]} num={points[1]} isP1={true} />
      <PointDisplay position={[20, 0, 0]} num={points[0]} isP1={false} />
    </group>
  )
}

export default function Stage() {
  const [triggerStretchEffect, setTriggerStretchEffect] = useState<TriggerStretchEffect | null>(null);
  const [triggerBlinkingEffect, setTriggerBlinkingEffect] = useState<TriggerBlinkingEffect | null>(null);

  const wallMat = useMemo(() =>
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.3
    }), []
  );
  const stageGroup = useRef<THREE.Group>(null!);
  const ballRef = useRef<THREE.Mesh>(null!);
  const paddleRefs = [ useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!) ];
  const goalWall1Ref = useRef<THREE.Mesh>(null!);
  const goalWall2Ref = useRef<THREE.Mesh>(null!);
  const sideWallsRef = [ useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!) ];

  function toVec3(vec2: THREE.Vector2, out: THREE.Vector3 = new THREE.Vector3()) {
    return out.set(vec2.x, 0, vec2.y);
  }

  const [ points, isMatch, isEnd, hit ] = useGameStore(useShallow(s => [s.points, s.isMatch, s.isEnd, s.hit]));

  useEffect(() => {
    if (!points[0] && !points[1]) return;
    setTriggerBlinkingEffect({
      mat: [wallMat],
      end: 250,
      difference: 0.15,
      times: 2
    });
  }, [points])

  useEffect(() => {
    if(!isMatch) return;
    const mat = coreStore.pointDisplayMats[Number(coreStore.pointGetter)].filter(mat => mat.emissiveIntensity === 1);
    setTriggerBlinkingEffect({
      mat,
      end: 800,
      difference: -0.8,
      times: 4
    });
  }, [isMatch])

  useEffect(() => {
    if(!isEnd) return;
    const mat = coreStore.pointDisplayMats[Number(coreStore.pointGetter)].filter(mat => mat.emissiveIntensity === 1);
    setTriggerBlinkingEffect({
      mat,
      end: 4000,
      difference: -0.8,
      times: 16
    });
  }, [isEnd]);

  useEffect(() => {
    if (!hit) return;
    const { name } = hit;
    const point = toVec3(hit.point);
    const normal = toVec3(hit.normal);
    if (name === SIDE_1 || name === SIDE_2) {
      const wall = sideWallsRef.find(sideref => sideref.current.name === name)!.current;
      point.x = wall.position.x;
      setTriggerStretchEffect( {wall, point, normal });
      return;
    }
    const wall = name === PADDLE_1 ? goalWall1Ref.current : goalWall2Ref.current;
    point.z = wall.position.z;
    setTriggerStretchEffect({wall, point, normal});
  }, [hit])

  function setPaddlesPosition() {
    paddleRefs[0].current.position.x = coreStore.paddlesPosition[0];
    paddleRefs[1].current.position.x = coreStore.paddlesPosition[1];
  }

  function setBallPosition() {
    ballRef.current.position.set(coreStore.ballPosition.x, 0, coreStore.ballPosition.y)
  }

  function moveBall(pos: THREE.Vector2) {
    const speed = 20;
    for (const axis of ['y', 'x'] as ('x' | 'y')[]) {
      const dir = pos[axis] - coreStore.ballPosition[axis];
      if (Math.abs(dir) > 0.001) {
        const step = Math.sign(dir) * speed * coreStore.delta;
        coreStore.ballPosition[axis] += Math.abs(dir) > Math.abs(step) ? step : dir;
        return false;
      }
    }
    return true;
  }

  const sleepRef = useRef<number | null>(null);

  function setSleep(ms: number) {
    sleepRef.current = performance.now() + ms;
  }

  function sleep(): boolean {
    if (!sleepRef.current) return false;
    return performance.now() >= sleepRef.current;
  }

  function resetSleep() {
    sleepRef.current = null;
  }

  const forSaveVec2Ref = useRef<THREE.Vector2>(new THREE.Vector2());
  const saved = useRef<boolean>(false);

  function isntSaveProcess() {
    if (!saved.current) {
      saved.current = true;
      forSaveVec2Ref.current.copy(coreStore.ballPosition);
      coreStore.ballPosition.set(ballRef.current.position.x, ballRef.current.position.z);
    }
  }

  function processMoveBall() {
    if (!saved.current) return;
    if (moveBall(forSaveVec2Ref.current)) {
      saved.current = false;
      coreStore.acceptNextStatus = true;
      return true;
    }
    return false;
  }

  useFrame(() => {
    setPaddlesPosition();
    if (coreStore.gameStatus === GameStatus.First) {
      isntSaveProcess();
      processMoveBall();
    } else if (coreStore.gameStatus === GameStatus.GetPoint) {
      isntSaveProcess();
      if (!sleepRef.current) setSleep(250);
      else if (sleep())
        if(processMoveBall())
          resetSleep();
    }
    setBallPosition();
  }, FramePriority.Stage);

  return (
    <>
      <CliGameCore />
      <PaddleController isP1={false} cpuMode={CPUMode.Easy} />
      <PaddleController isP1={true} />
      <group visible={true} ref={stageGroup}>
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
      <PointDisplays points={points} />

      <Effect triggerStretchEffect={triggerStretchEffect} triggerBlinkingEffect={triggerBlinkingEffect} />
    </>
  );
}