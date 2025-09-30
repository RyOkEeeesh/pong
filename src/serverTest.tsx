"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import React, { useRef } from "react";
import * as THREE from "three";
import { SerGameCore } from "./serverCore";

// Box2 の中心とサイズを取得
function box2ToCenterSize(box: THREE.Box2) {
  const size = new THREE.Vector2();
  const center = new THREE.Vector2();
  box.getSize(size);
  box.getCenter(center);

  return { center, size };
}

// Box2 を3Dで可視化するコンポーネント
function Box2View({ box, color = "yellow" }: { box: THREE.Box2; color?: string }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    const { center, size } = box2ToCenterSize(box);
    ref.current.position.set(center.x, 0, center.y);
    ref.current.scale.set(size.x, 1, size.y);
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  );
}

function PongScene({ coreRef }: { coreRef: React.RefObject<SerGameCore> }) {
  useFrame((_, delta) => {
    coreRef.current.process(delta);
  });

  return (
    <>
      {coreRef.current.walls.map((w, i) => (
        <Box2View key={i} box={w.box} color="lime" />
      ))}
      {coreRef.current.paddles.map((p, i) => (
        <Box2View key={i} box={p.box} color="cyan" />
      ))}
      <Box2View box={coreRef.current.ball.box} color="magenta" />
    </>
  );
}

// メインコンポーネント
export default function PongTest() {
  const coreRef = useRef<SerGameCore>(new SerGameCore());

  return (
    <Canvas camera={{ position: [0, 20, 30], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <OrbitControls />
      <PongScene coreRef={coreRef} />
    </Canvas>
  );
}
