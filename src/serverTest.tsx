"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GameCore } from "./serverCore";

function box2ToCenterSize(box: THREE.Box2) {
  const size = new THREE.Vector2();
  const center = new THREE.Vector2();
  box.getSize(size);
  box.getCenter(center);

  return { center, size };
}

function Box2View({ box, color = "yellow" }: { box: THREE.Box2, color?: string }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    const { center, size } = box2ToCenterSize(box);
    ref.current.position.set(center.x, 0, center.y); // Box2 の y → 3D では z に置き換える
    ref.current.scale.set(size.x, 1, size.y);        // 高さは固定 1
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  );
}

export default function PongTest() {
  const coreRef = useRef<GameCore>(new GameCore());

  useEffect(() => {
    coreRef.current.start();
    return () => coreRef.current.stop();
  }, []);

  return (
    <Canvas camera={{ position: [0, 20, 30], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <OrbitControls />

      {coreRef.current.walls.map((w, i) => (
        <Box2View key={i} box={w.box} color="lime" />
      ))}
      {coreRef.current.paddles.map((p, i) => (
        <Box2View key={i} box={p.box} color="cyan" />
      ))}
      <Box2View box={coreRef.current.ball.box} color="magenta" />
    </Canvas>
  );
}
