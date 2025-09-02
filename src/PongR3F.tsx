import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, OrbitControls, Html, Text, useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

/**
 * React Three Fiber port of your Pong. This is a single-file, drop-in component
 * meant as a starting point. It mirrors the structure of your original code:
 * - GameManager (timing, field size, ball speed)
 * - Mode/Status (very simplified here)
 * - Stage (walls, floor, displays)
 * - Paddle + Ball (meshes + behavior)
 * - Controls (keyboard)
 *
 * Notes:
 * - This file intentionally keeps logic close to the scene graph (r3f style):
 *   useFrame() = game loop, refs to meshes, React state for UI.
 * - Postprocessing Bloom included (like UnrealBloomPass in your code).
 * - Camera switching demo (3 cameras); keybindings Q/E.
 * - Scoring + serve flow kept minimal but compatible with expansion.
 */

// ---------------------- Constants & Helpers ----------------------
const FIELD_H = 28; // aligns with manager.ts height
const FIELD_W = (FIELD_H / 5) * 4; // aligns with manager.ts width
const PADDLE_W = 6;
const PADDLE_H = 0.8;
const WALL_THICK = 0.5;
const BALL_R = 0.45;
const DEF_SPEED = 28; // manager.ts def speed

// clamp utility (similar to normalize/move bounds in your code)
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ---------------------- Types ----------------------
type GameStatus = "Waiting" | "Serving" | "Playing" | "Point" | "End";

type ControlSetting = {
  speed: number;
  L: string; R: string; U: string; D: string; S: string; // KeyboardEvent.code
};

type UserControl = {
  effect: boolean;
  p1: ControlSetting;
  p2: ControlSetting;
  Q: string; // exit (unused)
  prevCamera: string;
  nextCamera: string;
};

const defaultControl: UserControl = {
  effect: true,
  p1: { speed: 20, L: "KeyA", R: "KeyD", U: "KeyW", D: "KeyS", S: "Space" },
  p2: { speed: 20, L: "ArrowLeft", R: "ArrowRight", U: "ArrowUp", D: "ArrowDown", S: "Enter" },
  Q: "Escape",
  prevCamera: "KeyQ",
  nextCamera: "KeyE",
};

// ---------------------- Keyboard Hook ----------------------
function useKeyboard() {
  const pressed = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) => (pressed.current[e.code] = true);
    const up = (e: KeyboardEvent) => (pressed.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);
  return pressed;
}

// ---------------------- Game State (top-level) ----------------------
function useGameManager() {
  const [status, setStatus] = useState<GameStatus>("Serving");
  const [score, setScore] = useState<[number, number]>([0, 0]); // [p2, p1]
  const [serverIsP1, setServerIsP1] = useState<boolean>(Math.random() < 0.5);
  const [speed, setSpeed] = useState<number>(DEF_SPEED);
  const [velocity, setVelocity] = useState(() => new THREE.Vector3());
  const clock = useMemo(() => new THREE.Clock(), []);

  const resetBallVelocity = useCallback((towardsP2: boolean) => {
    const angle = (Math.random() * 0.35 - 0.175) + (towardsP2 ? 0 : Math.PI); // small random spread
    const v = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize().multiplyScalar(speed);
    setVelocity(v);
  }, [speed]);

  const addPoint = useCallback((p1Gets: boolean) => {
    setScore(([p2, p1]) => (p1Gets ? [p2, p1 + 1] : [p2 + 1, p1]));
    setServerIsP1(p1Gets);
    setStatus("Point");
  }, []);

  return { status, setStatus, score, setScore, serverIsP1, setServerIsP1, speed, setSpeed, velocity, setVelocity, clock, resetBallVelocity, addPoint };
}

// ---------------------- Paddles ----------------------
function Paddle({ x, z, color = 0x9aa0a6 }: { x: number; z: number; color?: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  return (
    <mesh ref={ref} position={[x, 0, z]} castShadow receiveShadow>
      <boxGeometry args={[PADDLE_W, PADDLE_H, 1]} />
      <meshStandardMaterial color={color} metalness={0} roughness={0.3} emissive={"white"} emissiveIntensity={0.15} />
    </mesh>
  );
}

// ---------------------- Ball ----------------------
function Ball({ position, onCollideWall, onCollidePaddle, onScore }:{
  position: THREE.Vector3;
  onCollideWall: (normal: THREE.Vector3) => void;
  onCollidePaddle: (paddleCenterX: number, normal: THREE.Vector3) => void;
  onScore: (p1Gets: boolean) => void;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const { velocity, setVelocity, clock } = React.useContext(GameContext);

  // keep local pos in ref for perf
  const pos = useRef<THREE.Vector3>(position.clone());

  useFrame(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    pos.current.addScaledVector(velocity, dt);

    // Walls (left/right)
    if (pos.current.x < -FIELD_W / 2 + WALL_THICK + BALL_R) {
      pos.current.x = -FIELD_W / 2 + WALL_THICK + BALL_R;
      setVelocity(new THREE.Vector3(-velocity.x, 0, velocity.z));
      onCollideWall(new THREE.Vector3(1, 0, 0));
    } else if (pos.current.x > FIELD_W / 2 - WALL_THICK - BALL_R) {
      pos.current.x = FIELD_W / 2 - WALL_THICK - BALL_R;
      setVelocity(new THREE.Vector3(-velocity.x, 0, velocity.z));
      onCollideWall(new THREE.Vector3(-1, 0, 0));
    }

    // Net (optional)

    // Back/Front scoring (behind paddles)
    if (pos.current.z < -FIELD_H / 2 + BALL_R) {
      onScore(true); // p1 gets
      // reset for serve handled by parent
    } else if (pos.current.z > FIELD_H / 2 - BALL_R) {
      onScore(false); // p2 gets
    }

    // Apply to mesh
    if (ref.current) ref.current.position.copy(pos.current);
  });

  return (
    <mesh ref={ref} position={pos.current.toArray()} castShadow>
      <sphereGeometry args={[BALL_R, 16, 16]} />
      <meshStandardMaterial color={0xffffff} emissive={0xffffff} emissiveIntensity={0.4} metalness={0} roughness={0.25} />
    </mesh>
  );
}

// ---------------------- Stage (walls, floor, lights) ----------------------
function Stage() {
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x202225, metalness: 0.2, roughness: 0.8 }), []);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({}), []);
  return (
    <group>
      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[FIELD_W + 10, FIELD_H + 10]} />
        <meshStandardMaterial color={0x0a0b0c} roughness={1} metalness={0} />
      </mesh>

      {/* Walls */}
      <mesh position={[0, 0, -FIELD_H / 2]}>
        <boxGeometry args={[FIELD_W, WALL_THICK, WALL_THICK]} />
        <meshStandardMaterial {...(wallMat as any)} />
      </mesh>
      <mesh position={[0, 0, FIELD_H / 2]}>
        <boxGeometry args={[FIELD_W, WALL_THICK, WALL_THICK]} />
        <meshStandardMaterial {...(wallMat as any)} />
      </mesh>
      <mesh position={[-FIELD_W / 2, 0, 0]}>
        <boxGeometry args={[WALL_THICK, WALL_THICK, FIELD_H]} />
        <meshStandardMaterial {...(wallMat as any)} />
      </mesh>
      <mesh position={[FIELD_W / 2, 0, 0]}>
        <boxGeometry args={[WALL_THICK, WALL_THICK, FIELD_H]} />
        <meshStandardMaterial {...(wallMat as any)} />
      </mesh>

      {/* Mid line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0.01, -FIELD_H / 2, 0, 0.01, FIELD_H / 2]), 3]}
          />        </bufferGeometry>
        <lineBasicMaterial />
      </line>

      {/* Lights */}
      <ambientLight intensity={1} />
      <directionalLight position={[5, 10, 8]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    </group>
  );
}

// ---------------------- Score Display ----------------------
function Scoreboard({ score }: { score: [number, number] }) {
  return (
    <group position={[0, 3.5, 0]}> 
      <Text position={[-3, 0, 0]} fontSize={1.2} anchorX="center" anchorY="middle">{String(score[1]).padStart(2, "0")}</Text>
      <Text position={[3, 0, 0]} fontSize={1.2} anchorX="center" anchorY="middle">{String(score[0]).padStart(2, "0")}</Text>
    </group>
  );
}

// ---------------------- Main Scene ----------------------
const GameContext = React.createContext<ReturnType<typeof useGameManager>>(null as any);

function PaddlesAndControls({ control = defaultControl }:{ control?: UserControl }) {
  const pressed = useKeyboard();
  const { status } = React.useContext(GameContext);
  const p1Ref = useRef<THREE.Mesh>(null!);
  const p2Ref = useRef<THREE.Mesh>(null!);

  const move = useCallback((mesh: THREE.Mesh, dir: number, speed: number, dt: number) => {
    if (!mesh) return;
    const x = clamp(mesh.position.x + dir * speed * dt, -FIELD_W / 2 + WALL_THICK + PADDLE_W / 2, FIELD_W / 2 - WALL_THICK - PADDLE_W / 2);
    mesh.position.x = x;
  }, []);

  useFrame((_, delta) => {
    const dt = delta; // already small
    if (status === "Playing" || status === "Serving") {
      // P1
      if (pressed.current[control.p1.L] || pressed.current[control.p1.U]) move(p1Ref.current, -1, control.p1.speed, dt);
      if (pressed.current[control.p1.R] || pressed.current[control.p1.D]) move(p1Ref.current, 1, control.p1.speed, dt);
      // P2
      if (pressed.current[control.p2.L] || pressed.current[control.p2.U]) move(p2Ref.current, -1, control.p2.speed, dt);
      if (pressed.current[control.p2.R] || pressed.current[control.p2.D]) move(p2Ref.current, 1, control.p2.speed, dt);
    }
  });

  return (
    <group>
      <Paddle x={0} z={-FIELD_H / 2 + 2.5} />
      <Paddle x={0} z={FIELD_H / 2 - 2.5} />
      {/* attach refs after creation */}
      <primitive object={p1Ref.current ?? new THREE.Mesh()} />
      <primitive object={p2Ref.current ?? new THREE.Mesh()} />
      {/* Hidden holders replaced below using onUpdate */}
      <mesh visible={false} onUpdate={(m: any) => (p1Ref.current = m)} position={[0, 0, -FIELD_H / 2 + 2.5]}>
        <boxGeometry args={[PADDLE_W, PADDLE_H, 1]} />
        <meshStandardMaterial />
      </mesh>
      <mesh visible={false} onUpdate={(m: any) => (p2Ref.current = m)} position={[0, 0, FIELD_H / 2 - 2.5]}>
        <boxGeometry args={[PADDLE_W, PADDLE_H, 1]} />
        <meshStandardMaterial />
      </mesh>
    </group>
  );
}

function PongLogic() {
  const { status, setStatus, velocity, setVelocity, serverIsP1, resetBallVelocity, addPoint } = React.useContext(GameContext);
  const ballStart = useMemo(() => new THREE.Vector3(0, BALL_R, 0), []);
  const [ballKey, setBallKey] = useState(0); // force remount on serve

  // serve on entry / after point
  useEffect(() => {
    if (status === "Serving") {
      resetBallVelocity(serverIsP1); // if server is p1 -> ball goes to p2
    }
  }, [status, serverIsP1, resetBallVelocity]);

  const handleWall = useCallback((_normal: THREE.Vector3) => {
    // TODO: stretchEffect like your Effect.stretchEffect
  }, []);

  const handlePaddle = useCallback((cx: number, normal: THREE.Vector3) => {
    // optional: tweak bounce with contact point
  }, []);

  const onScore = useCallback((p1Gets: boolean) => {
    addPoint(p1Gets);
    // reset ball for next serve
    setStatus("Serving");
    setBallKey((k) => k + 1);
  }, [addPoint, setStatus]);

  // switch to playing automatically after a short delay like your Controller.serve()
  useEffect(() => {
    if (status === "Serving") {
      const id = setTimeout(() => setStatus("Playing"), 500);
      return () => clearTimeout(id);
    }
  }, [status, setStatus]);

  return (
    <group>
      <Ball key={ballKey} position={ballStart} onCollideWall={handleWall} onCollidePaddle={handlePaddle} onScore={onScore} />
    </group>
  );
}

function Cameras() {
  const { camera, size } = useThree();
  const [idx, setIdx] = useState(0);
  const pressed = useKeyboard();

  const cams = useMemo(() => {
    const a = new THREE.PerspectiveCamera(45, size.width / size.height, 0.1, 1000);
    a.position.set(0, 17, 10); a.lookAt(0, 0, 3.5);
    const b = a.clone(); b.position.set(0, 37, 10); b.lookAt(0, 0, 0);
    const c = a.clone(); c.position.set(0, 30, 10); c.up.set(-1, 0, 0); c.lookAt(0, 0, 0);
    return [a, b, c];
  }, [size]);

  useEffect(() => {
    const id = setInterval(() => {
      if (pressed.current[defaultControl.prevCamera]) setIdx((i) => (i + cams.length - 1) % cams.length);
      if (pressed.current[defaultControl.nextCamera]) setIdx((i) => (i + 1) % cams.length);
    }, 50);
    return () => clearInterval(id);
  }, [cams.length, pressed]);

  useEffect(() => {
    const c = cams[idx];
    camera.position.copy(c.position);
    camera.quaternion.copy(c.quaternion);
    (camera as any).updateProjectionMatrix?.();
  }, [idx, cams, camera]);

  return null;
}

// ---------------------- Root Component ----------------------
export default function PongR3F() {
  const gm = useGameManager();

  return (
    <div className="w-full h-[80vh] bg-black">
      <Canvas shadows dpr={[1, 2]}>
        <GameContext.Provider value={gm}>
          <PerspectiveCamera makeDefault fov={55} near={0.1} far={1000} position={[0, 17, 10]} />
          <Cameras />
          <Stage />
          <Scoreboard score={gm.score} />
          <PaddlesAndControls />
          <PongLogic />

          <EffectComposer>
            <Bloom intensity={0.6} mipmapBlur luminanceThreshold={0.25} luminanceSmoothing={0.65} />
          </EffectComposer>
        </GameContext.Provider>
      </Canvas>

      {/* HUD */}
      <div className="absolute left-4 bottom-4 text-white/80 text-sm space-y-1">
        <div>
          <b>Status:</b> {gm.status} &nbsp; · &nbsp;
          <b>Score:</b> P1 {gm.score[1]} – {gm.score[0]} P2 &nbsp; · &nbsp;
          <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/20" onClick={() => gm.setStatus("Serving")}>
            Serve
          </button>
        </div>
        <div>Controls · P1: WASD + Space / P2: Arrows + Enter · Camera: Q/E</div>
      </div>
    </div>
  );
}