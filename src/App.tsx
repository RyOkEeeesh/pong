import { PerspectiveCamera } from "@react-three/drei"
import { Canvas, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import Stage from "./stage"

function CameraSetup() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  const { set } = useThree();

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.lookAt(new THREE.Vector3(0, 0, 3.5))
      cameraRef.current.updateProjectionMatrix()
      set({ camera: cameraRef.current }) // makeDefault の代わり
    }
  }, [])

  return <PerspectiveCamera makeDefault ref={cameraRef} position={[0, 17, 10]} />
}

export default function App() {
  return (
    <>
      <Canvas>
        <ambientLight color={0xffffff} intensity={1} />
        <CameraSetup />
        <Stage />
      </Canvas>
    </>
  )
}