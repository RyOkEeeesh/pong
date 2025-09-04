import { PerspectiveCamera } from "@react-three/drei"
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Canvas, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import Stage from "./stage"
import { trackingLookAt } from "./ThreeModule"

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
      <Vignette
        eskil={false}
        offset={0.1}
        darkness={0.9}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}

export default function App() {
  return (
    <>
      <Canvas dpr={window.devicePixelRatio}>
        <CameraSetup />
        <ambientLight color={0xffffff} intensity={1} />
        <Stage />

        <ComposerSetup />
      </Canvas>
    </>
  )
}