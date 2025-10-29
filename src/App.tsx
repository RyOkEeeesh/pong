import { PerspectiveCamera, KeyboardControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Stage from './stage';
import { useCameraStore, useGameStore, useUserSetting } from './store';
import { trackingLookAt } from './CameraControl';
import { FramePriority, RoleStatus, STAGE_WIDTH } from './constants';
import { useShallow } from 'zustand/shallow';

declare const __APP_VERSION__: string;

function CameraSetup() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);

  useEffect(() => {
    if (cameraRef.current) {
      trackingLookAt(cameraRef.current);
      cameraRef.current.lookAt(0, 0, 3.5);
    }
  }, []);

  return <PerspectiveCamera makeDefault ref={cameraRef} position={[0, 17, 10]} fov={75} />;
}

function ComposerSetup() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.8}
        radius={0.5}
        luminanceThreshold={0.65}
        luminanceSmoothing={0.0}
        height={window.innerHeight}
      />
    </EffectComposer>
  )
}

export default function App() {
  const setting = useUserSetting(s => s.control);
  const keyMap = [
    { name: 'L1', keys: setting.p1.L },
    { name: 'R1', keys: setting.p1.R },
    { name: 'S1', keys: setting.p1.S },

    { name: 'L2', keys: setting.p2.L },
    { name: 'R2', keys: setting.p2.R },
    { name: 'S2', keys: setting.p2.S },

    { name: 'quit', keys: setting.quit },
    { name: 'prevCam', keys: setting.prevCamera },
    { name: 'nextCam', keys: setting.nextCamera }
  ];

  return (
    <>
      <KeyboardControls map={keyMap}>
        <Canvas dpr={window.devicePixelRatio}>
          <CameraSetup />
          <ambientLight color={0xffffff} intensity={1} />
          <Stage />

          <ComposerSetup />
        </Canvas>
      </ KeyboardControls>
    </>
  )
}