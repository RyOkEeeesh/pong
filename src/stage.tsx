import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { forwardRef, RefObject, use, useEffect, useRef } from "react";
import * as THREE from "three";
import { fitObject } from "./ThreeModule";
import { acceleratedRaycast, MeshBVH } from "three-mesh-bvh";
import { GOAL_1, GOAL_2, PADDLE_1, PADDLE_2, SIDE, STAGE_HEIGHT, STAGE_WIDTH, WALL_DEPTH, WALL_HEIGHT } from './constants';
import { ref } from "process";
import { useGameStore } from "./store";

// --- BVH セット ---
(THREE.BufferGeometry.prototype as any).computeBoundsTree = function() {
  (this as any).boundsTree = new MeshBVH(this);
};
(THREE.BufferGeometry.prototype as any).disposeBoundsTree = function() {
  (this as any).boundsTree = null;
};
(THREE.Mesh.prototype as any).raycast = acceleratedRaycast;

// --- Props ---
type MeshProps = {
  name: string,
  position: [number, number, number],
  material: THREE.MeshStandardMaterial
}

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

// function GoalWall(props: WallProps) {
//   const meshRef = useRef<THREE.Mesh>(null!);

//   useEffect(() => {
//     meshRef.current?.geometry.computeBoundsTree();
//   }, []);

//   return (
//     <mesh ref={meshRef} {...props}>
//       <boxGeometry args={[STAGE_WIDTH + WALL_DEPTH, WALL_HEIGHT, WALL_DEPTH]} />
//     </mesh>
//   );
// }

// --- Paddle ---
const Paddle = forwardRef<THREE.Mesh, MeshProps>(({ position, material }, ref) => (
  <mesh ref={ref} position={position} material={material}>
    <boxGeometry args={[STAGE_WIDTH / 6, WALL_HEIGHT, WALL_HEIGHT]} />
  </mesh>
));

// --- Ball ---
const Ball = forwardRef<THREE.Mesh, { material: THREE.MeshStandardMaterial }>(({ material }, ref) => (
  <mesh ref={ref} material={material}>
    <boxGeometry />
  </mesh>
));

// --- Floor ---
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

// --- パドル衝突処理（BVH Raycast） ---
function handlePaddleCollision(paddleRef: RefObject<THREE.Mesh>, ballRef: RefObject<THREE.Mesh>, velocity: THREE.Vector3) {
  if (!paddleRef.current || !ballRef.current) return;

  const ballPos = ballRef.current.position;
  const direction = velocity.clone().normalize();
  const distance = velocity.length() * 1/60; // 1フレーム想定の距離

  const ray = new THREE.Raycaster(ballPos, direction, 0, distance + 0.01);
  const hits = ray.intersectObject(paddleRef.current, true);

  if (hits.length > 0) {
    const hit = hits[0];
    const normal = hit.face!.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(paddleRef.current.matrixWorld));

    // 衝突点までボールを戻す
    ballPos.copy(hit.point.add(normal.multiplyScalar(0.01)));

    // 反射角計算（X位置で角度調整）
    const paddleHalfX = (STAGE_WIDTH / 6) / 2;
    const dx = ballPos.x - paddleRef.current.position.x;
    const normalized = THREE.MathUtils.clamp(dx / paddleHalfX, -1, 1);
    const maxAngle = Math.PI / 3;
    const angle = normalized * maxAngle;
    const dzDir = paddleRef.current.position.z > 0 ? -1 : 1;

    velocity.set(
      velocity.length() * Math.sin(angle),
      0,
      dzDir * velocity.length() * Math.cos(angle)
    );

    // z方向が小さすぎる場合の補正
    if (Math.abs(velocity.z) < 0.01) {
      velocity.z = dzDir * 0.1;
      velocity.normalize().multiplyScalar(velocity.length());
    }
  }
}

// --- Stage ---
export default function Stage() {
  const { camera } = useThree();
  const stageGroup = useRef<THREE.Group>(null!);

  const ballRef = useRef<THREE.Mesh>(null!);

  const paddle1Ref = useRef<THREE.Mesh>(null!);
  const paddle2Ref = useRef<THREE.Mesh>(null!);

  const GoalWall1Ref = useRef<THREE.Mesh>(null!);
  const GoalWall2Ref = useRef<THREE.Mesh>(null!);

  const SideWallsRef = [ useRef<THREE.Mesh>(null!), useRef<THREE.Mesh>(null!) ]

  const refs = [paddle1Ref, paddle2Ref, GoalWall1Ref, GoalWall2Ref, ...SideWallsRef]

  // const velocity = useRef(new THREE.Vector3(0.1, 0, 1).normalize().multiplyScalar(28));

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3 });

  const offsets = [
    new THREE.Vector3(1/2,0,1/2), new THREE.Vector3(-1/2,0,1/2),
    new THREE.Vector3(1/2,0,-1/2), new THREE.Vector3(-1/2,0,-1/2),
    new THREE.Vector3(0,0,0)
  ];

  useEffect(() => {
    refs.forEach(ref => ref.current?.geometry.computeBoundsTree());
    useGameStore.getState().setVelocity(
      new THREE.Vector3(0.1, 0, 1).normalize().multiplyScalar(28)
    );
  }, []);

  useEffect(() => {
    if (stageGroup.current) fitObject(camera as THREE.PerspectiveCamera, stageGroup.current, 1.1);
  }, [camera]);

  useFrame((_, delta) => {
    if (!ballRef.current || refs.some(ref => !ref.current)) return;

    const gameStore = useGameStore.getState();

    const velocity = gameStore.velocity;
    console.log(velocity.length())
    const ballPos = ballRef.current.position;
    const frameVelocity = velocity.clone().multiplyScalar(delta).length();

    // 壁衝突
    for (const offset of offsets) {
      const origin = ballPos.clone().add(offset);
      const ray = new THREE.Raycaster(origin, velocity.clone().normalize(), 0, frameVelocity + 0.01);

      for (const wall of stageGroup.current.children) {
        if (!wall) continue;
        const intersects = ray.intersectObject(wall, true);
        if (intersects.length > 0) {
          const normal = intersects[0].face?.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(wall.matrixWorld));
          if (normal) velocity.reflect(normal);
        }
      }
    }

    // パドル衝突
    handlePaddleCollision(paddle1Ref, ballRef, velocity);
    handlePaddleCollision(paddle2Ref, ballRef, velocity);

    // ボール移動
    ballPos.addScaledVector(velocity, delta);
  });

  return (
    <>
      <group ref={stageGroup}>
        <SideWall ref={SideWallsRef[0]} name={SIDE} position={[ -STAGE_WIDTH/2, 0, 0 ]} material={wallMat} />
        <SideWall ref={SideWallsRef[1]} name={SIDE} position={[ STAGE_WIDTH/2, 0, 0 ]} material={wallMat} />
        <GoalWall ref={GoalWall1Ref} name={GOAL_1} position={[ 0, 0, STAGE_HEIGHT/2 ]} material={wallMat} />
        <GoalWall ref={GoalWall2Ref} name={GOAL_2} position={[ 0, 0, -STAGE_HEIGHT/2 ]} material={wallMat} />
      </group>

      <Paddle ref={paddle1Ref} name={PADDLE_1} position={[0,0,STAGE_HEIGHT/2 - 1]} material={wallMat.clone()} />
      <Paddle ref={paddle2Ref} name={PADDLE_2} position={[0,0,-STAGE_HEIGHT/2 + 1]} material={wallMat.clone()} />

      <Ball ref={ballRef} material={wallMat.clone()} />
      <Floor />
    </>
  );
}
