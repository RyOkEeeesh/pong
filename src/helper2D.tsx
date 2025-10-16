import * as THREE from 'three';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

type DebugBox2Props = {
  box: THREE.Box2
  color?: string
  z?: number
}

export function DebugBox2({ box, color = 'red', z = 0 }: DebugBox2Props) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (!box) return
    const center = new THREE.Vector2()
    const size = new THREE.Vector2()
    box.getCenter(center)
    box.getSize(size)
    ref.current.position.set(center.x, center.y, z)
    ref.current.scale.set(size.x, size.y, 1)
  })

  return (
    <mesh ref={ref}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  )
}