"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GameCore } from "./server";
import { Context } from "./serverCore";
import { GameStatus } from "./constants";

export default function PongTest() {
  const coreRef = useRef<GameCore>(new GameCore());

  useEffect(() => {
    coreRef.current.start();
    Context.gameStatus = GameStatus.Playing;
    Context.setVelocity(new THREE.Vector3(0, 0, -1));

    return () => coreRef.current.stop();
  }, []);

  return (
    <Canvas camera={{ position: [0, 20, 30], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <OrbitControls />

      {/* ボール */}
      {coreRef.current && (
        <primitive object={coreRef.current.ball.mesh} >
          <meshStandardMaterial color="white" />
        </primitive>
      )}

      {/* パドル */}
      {coreRef.current &&
        coreRef.current.paddles.map((p: any, i: number) => (
          <primitive key={i} object={p.mesh}>
            <meshStandardMaterial color="deepskyblue" />
          </primitive>
        ))}

      {/* 壁 */}
      {coreRef.current &&
        coreRef.current.walls.map((w: any, i: number) => (
          <primitive key={i} object={w.mesh}>
            <meshStandardMaterial
              color="gray"
              transparent
              opacity={0.5}
            />
          </primitive>
        ))}
    </Canvas>
  );
}
