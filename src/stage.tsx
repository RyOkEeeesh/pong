import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh';
import {
  ACCELERATION,
  BALL_SIZE,
  BALL_SPEED_MAX,
  CPUMode,
  EFFECT_MATERIAL_ARGS,
  EFFECT_MESH_WIDTH,
  FRICTION,
  GameStatus,
  GOAL_1,
  GOAL_2,
  PADDLE_1,
  PADDLE_2,
  PADDLE_HALF_X,
  PADDLE_HEIGHT,
  PADDLE_POSITION_Z1,
  PADDLE_POSITION_Z2,
  PADDLE_WIDTH,
  SIDE_1,
  SIDE_2,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  WALL_DEPTH,
  WALL_HEIGHT
} from './constants';
import { useCameraStore, useGameStore, useStageStore } from './store';
import { PointDisplay } from './point.tsx';
import { PaddleController } from './controller.tsx';
import { fitObject } from './CameraControl.tsx';

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

function handleHitSideWall() {
  const { velocity, setVelocity } = useStageStore.getState();
  const v = velocity.clone();
  v.x *= -1;
  setVelocity(v);
}

function handleHitGoalWall(player: boolean) {
  useStageStore.getState().setVelocity(new THREE.Vector3());
  const { setGameStatus, addPoint, processAddPoint, setPointGetter } = useGameStore.getState();
  addPoint(player);
  processAddPoint();
  setPointGetter(player);
  setGameStatus(GameStatus.GetPoint);
}

function handleHitPaddle(mesh: THREE.Mesh) {
  const { ballSpeed, ballPosition, setBallSpeed, setVelocity } = useStageStore.getState();
  const normalized = THREE.MathUtils.clamp(
    (ballPosition.clone().x - mesh.position.clone().x) / PADDLE_HALF_X,
    -1,
    1
  );
  const maxAngle = Math.PI / 3;
  const angle = normalized * maxAngle;
  const dz = mesh.position.z > 0 ? -1 : 1;
  const newVelocity = new THREE.Vector3(
    ballSpeed * Math.sin(angle),
    0,
    dz * ballSpeed * Math.cos(angle)
  );
  setBallSpeed(Math.min(ballSpeed + ACCELERATION, BALL_SPEED_MAX));
  setVelocity(newVelocity);
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

type StretchEffect = {
  mesh: THREE.Mesh;
  startTime: number;
  side: -1 | 1;
  normal: THREE.Vector3;
  center: THREE.Vector3;
  wall: THREE.Mesh;
};

type BlinkingEffect = {
  mat: THREE.MeshStandardMaterial[];
  start?: number;
  end: number;
  difference: number;
  times: number;
  defEmissiveIntensity?: number[];
}

export default function Stage({isResizing}: StageProps) {
  const { camera } = useThree();
  const { setGameStatus } = useGameStore.getState();
  const { setBallSpeed } = useStageStore.getState();
  const { setIsObjectFit } = useCameraStore.getState();

  useEffect(() => {
    if (!stageGroup.current) return;
    if (isResizing) return setIsObjectFit(false);
    fitObject(camera as THREE.PerspectiveCamera, stageGroup.current, 1.1);
    setIsObjectFit(true);
  }, [isResizing, camera]);

  const stageGroup = useRef<THREE.Group>(null!);

  const ballRef = useRef<THREE.Mesh>(null!);
  const paddleRefs = [ useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!) ]; // [ p2, p1 ]
  const goalWall1Ref = useRef<THREE.Mesh>(null!);
  const goalWall2Ref = useRef<THREE.Mesh>(null!);
  const sideWallsRef = [useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!)];

  const refs = [
    ...paddleRefs,
    goalWall1Ref,
    goalWall2Ref,
    ...sideWallsRef
  ];

  useEffect(() => {
    refs.forEach(ref => ref.current?.geometry.computeBoundsTree());
  }, []);

  const [effectPool, setEffectPool] = useState<THREE.Mesh[]>(Array.from({ length: 4 }, () => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(EFFECT_MESH_WIDTH, WALL_HEIGHT),
      new THREE.MeshStandardMaterial(EFFECT_MATERIAL_ARGS)
    );
    mesh.visible = false;
    return mesh;
  }));

  function getEffectMesh() {
    const mesh = effectPool.find(m => !m.visible);
    if (mesh) {
      mesh.visible = true;
      return mesh;
    }
    const newEffectMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(EFFECT_MESH_WIDTH, WALL_HEIGHT),
      new THREE.MeshStandardMaterial(EFFECT_MATERIAL_ARGS)
    );
    const newEffectPool = [ ...effectPool, newEffectMesh];
    setEffectPool(newEffectPool);
    return newEffectMesh;
  }

  const stretchEffectsRef = useRef<StretchEffect[]>([]);

  function stretchEffect(center: THREE.Vector3, normal: THREE.Vector3, wall: THREE.Mesh) {
    const sideOptions: (-1 | 1)[] = [-1, 1];

    const newEffects = sideOptions.map(side => {
      const mesh = getEffectMesh();
      mesh.visible = true;
      mesh.rotation.copy(wall.rotation);

      return { mesh, startTime: performance.now(), side, normal, center, wall };
    });

    stretchEffectsRef.current.push(...newEffects);
  }

  function updateStretchEffect() {
    if (!stretchEffectsRef.current.length) return;
    const duration = 450;
    const now = performance.now();
    const gameStatus = useGameStore.getState().gameStatus;

    stretchEffectsRef.current = stretchEffectsRef.current.filter(effect => {
      const elapsed = now - effect.startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1 || gameStatus === GameStatus.GetPoint) {
        effect.mesh.visible = false;
        return false;
      }

      const wallTangent = new THREE.Vector3().crossVectors(effect.normal, new THREE.Vector3(0, 1, 0)).normalize();
      const wallSize = new THREE.Vector3();
      effect.wall.geometry.computeBoundingBox();
      effect.wall.geometry.boundingBox?.getSize(wallSize);

      const wallCenter = new THREE.Vector3();
      effect.wall.getWorldPosition(wallCenter);

      const wallDirection = wallTangent.clone();
      const halfLength = wallSize.x / 2;
      const wallStart = wallCenter.clone().add(wallDirection.clone().multiplyScalar(-halfLength));
      const wallEnd = wallCenter.clone().add(wallDirection.clone().multiplyScalar(halfLength));

      const basePosition = effect.center.clone().add(effect.normal.clone().multiplyScalar(0.06));
      let effectPos = basePosition.clone().add(wallTangent.clone().multiplyScalar(6 * progress * effect.side));

      const localOffset = effectPos.clone().sub(wallStart);
      const projectedLength = localOffset.dot(wallDirection);
      const halfEffectWidth = 0.75;

      if (projectedLength < halfEffectWidth) {
        effectPos = wallStart.clone().add(wallDirection.clone().multiplyScalar(halfEffectWidth));
      } else if (projectedLength > wallSize.x - halfEffectWidth) {
        effectPos = wallEnd.clone().add(wallDirection.clone().multiplyScalar(-halfEffectWidth));
      }

      effect.mesh.position.copy(effectPos);
      const material = effect.mesh.material as THREE.MeshStandardMaterial;
      material.opacity = 1 - progress;
      material.emissiveIntensity = 3 * (1 - progress);

      return true;
    });
  }

  const blinkingEffectRef = useRef<BlinkingEffect[]>([]);

  function blinkingEffect(option: BlinkingEffect) {
    blinkingEffectRef.current.push({
      ...option,
      start: performance.now(),
      defEmissiveIntensity: option.mat.map(m => m.emissiveIntensity)
    });
  }

  function updateBlinkingEffect() {
    if (!blinkingEffectRef.current.length) return;
    const now = performance.now();

    blinkingEffectRef.current = blinkingEffectRef.current.filter(effect => {
      const { start, end, difference, times, mat, defEmissiveIntensity } = effect;
      const elapsed = now - start!;

      if (elapsed >= end) {
        mat.forEach((m, i) => {
          m.emissiveIntensity = defEmissiveIntensity![i];
          m.needsUpdate = true;
        });
        return false;
      }

      const totalRadians = 1.75 * times * Math.PI;
      const angle = (elapsed * totalRadians) / end;
      const value = Math.sin(angle);
      const step = difference * ((value + 1) / 2);

      mat.forEach((m, i) => {
        m.emissiveIntensity = defEmissiveIntensity![i] + step;
        m.needsUpdate = true;
      });

      return true;
    });
  }

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

  const normalMatrix = new THREE.Matrix3();

  function handleHitObj(mesh: THREE.Mesh, hitPoint: THREE.Vector3, normal: THREE.Vector3) {
    if (mesh.name === PADDLE_1 || mesh.name === PADDLE_2) {
      if (Math.abs(normal.z) > 0.9) {
        const forEffect = mesh.name === PADDLE_1
          ? goalWall1Ref.current
          : goalWall2Ref.current ;
        const hit = hitPoint.clone();
        hit.z = forEffect.position.z;
        stretchEffect(hit, normal, forEffect);
        handleHitPaddle(mesh);
      } else {
        handleHitSideWall();
      }
      return;
    }
    if (mesh.name === SIDE_1 || mesh.name === SIDE_2) {
      stretchEffect(hitPoint, normal, mesh);
      handleHitSideWall();
      return;
    }
    handleHitGoalWall(mesh.name === GOAL_2);
    blinkingEffect({
      mat: [wallMat],
      end: 250,
      difference: 0.15,
      times: 2
    });
  }

  function checkHit(ray: THREE.Raycaster, obj: THREE.Mesh) {
    const intersects = ray.intersectObject(obj, true);
    if (intersects.length > 0) {
      return [
        intersects[0].point.clone(),
        intersects[0].face?.normal
          .clone()
          .applyMatrix3(normalMatrix.getNormalMatrix(obj.matrixWorld))
      ];
    }
    return [undefined, undefined];
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
        const [ hitPoint ,normal ] = checkHit(ray, obj);
        if (hitPoint && normal) {
          handleHitObj(obj, hitPoint, normal);

          // const pushBack = normal.clone().multiplyScalar(0.1);
          // const newPos = ballPosition.clone().add(pushBack);
          // setBallPosition(newPos);

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

    const newPos = ballPosition.clone();

    if (paddleVelocity.current.x !== ballVelocity.current.x) {
      ballVelocity.current.multiplyScalar(FRICTION);
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

  const sleepRef = useRef<number | null>(null); // ms

  function sleep() {
    if(!sleepRef.current) return false;
    return sleepRef.current <= performance.now();
  }

  useFrame((_, delta: number) => {
    const { setDelta, ballPosition, setBallPosition, velocity, paddlePosition, pointDisplayMats } = useStageStore.getState();
    const { gameStatus, matchPoint, isFinish, serveHit, setServeHit, pointGetter, points } = useGameStore.getState();
    setDelta(delta);

    if (gameStatus === GameStatus.Waiting) {

    } else if (gameStatus === GameStatus.First) {
      if(moveBallForPaddle())
        setGameStatus(GameStatus.Serving);
    } else if (gameStatus === GameStatus.Serving) {
      moveBallForServe();
      if(serveHit) {
        setServeHit(false);
        handleHitPaddle(paddleRefs[Number(!pointGetter)].current);
        resetBeforePositions();
        setGameStatus(GameStatus.Playing);
      }
    } else if (gameStatus === GameStatus.Playing) {
      const newPos = ballPosition.clone().addScaledVector(velocity, delta);
      setBallPosition(newPos);
      checkBallCollision();
    } else if (gameStatus === GameStatus.GetPoint) {
      if(sleepRef.current && sleep()) {
        if(moveBallForPaddle()) {
          sleepRef.current = null;
          setGameStatus(isFinish ? GameStatus.End :GameStatus.Serving);
        }
      } else if (sleepRef.current === null) {
        setBallSpeed();
        sleepRef.current = performance.now() + 250;
        if ( Math.max(...points) === points[Number(pointGetter)] && (matchPoint || isFinish) ) {
          const mats = pointDisplayMats[Number(pointGetter)].filter(mat => mat.emissiveIntensity === 1);
          const option = isFinish
            ? {
              mat: mats,
              end: 4000,
              difference: -0.8,
              times: 16
            } : {
              mat: mats,
              end: 800,
              difference: -0.8,
              times: 4
            };
          blinkingEffect(option);
        }
      }
    } else if (gameStatus === GameStatus.End) {

    } else { // GameStatus.Pause
      
    }


    updateStretchEffect();
    updateBlinkingEffect();

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

      {effectPool.map((mesh, i) => (
        <primitive object={mesh} key={i} />
      ))}
    </>
  );
}