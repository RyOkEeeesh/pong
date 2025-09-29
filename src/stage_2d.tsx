import * as THREE from 'three';
import { forwardRef, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { GameCore } from './gameCore';

type Box2ToMeshProps = {
  name: string;
  material: THREE.MeshStandardMaterial;
};

const Box2ToMesh = forwardRef<THREE.Mesh, Box2ToMeshProps>((props, ref) => {
  // ここから
  return (
    <mesh>
    </mesh>
  )
})

export function Stage() {
  const coreRef = useRef<GameCore>(new GameCore());
  // const 
}