import { PerspectiveCamera, KeyboardControls } from "@react-three/drei"
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Canvas, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import Stage from "./stage"
import { trackingLookAt } from "./ThreeModule"
import { useUserSetting } from "./store";

function CameraSetup() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);

  useEffect(() => {
    if (cameraRef.current) {
      trackingLookAt(cameraRef.current);
      cameraRef.current.lookAt(0, 0, 3.5)
      ;
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
  const [isResizing, setIsResizing] = useState<boolean>(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    function handleResize() {
      setIsResizing(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsResizing(false);
      }, 1000 / 24);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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
          <Stage isResizing={isResizing} />

          <ComposerSetup />
        </Canvas>
      </ KeyboardControls>
    </>
  )
}