import {} from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useStageStore } from './store';

const digitMap = [
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
  [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1]
];

const DIGIT_WIDTH = 5;
const DIGIT_HEIGHT = 10;
const INTERVAL = 4;

type DigitMeshProps = {
  position: [number, number, number];
  material: THREE.MeshStandardMaterial;
}

const sharedSphereGeometry = new THREE.SphereGeometry(0.25, 8, 8);

function DigitMesh(props: DigitMeshProps) {
  return <mesh {...props} geometry={sharedSphereGeometry} />
}

type DisplayProps = {
  num: number;
  position: [number, number, number];
  isP1: boolean;
}

function DigitDisplay({num, position, isP1}: DisplayProps) {
  const materialMap = useMemo(() =>
      Array.from({ length: 13 }, () =>
        new THREE.MeshStandardMaterial({
          color: 0x5b5d62,
          emissive: 0xffffff,
          emissiveIntensity: 0,
          metalness: 0,
          roughness: 0
        })
      ),
    []
  );

  useEffect(() => {
    useStageStore.getState().pushPointDisplayMats(isP1, materialMap);
  }, []);

  const positionMap = useMemo(() => [
    [[0, DIGIT_HEIGHT, 0]],
    Array.from({ length: INTERVAL }, (_, i) => [(DIGIT_WIDTH / (INTERVAL + 1)) * (i + 1), DIGIT_HEIGHT, 0]),
    [[DIGIT_WIDTH, DIGIT_HEIGHT, 0]],
    Array.from({ length: INTERVAL }, (_, i) => [0, DIGIT_HEIGHT / 2 + (DIGIT_HEIGHT / 2 / (INTERVAL + 1)) * (i + 1), 0]),
    Array.from({ length: INTERVAL }, (_, i) => [DIGIT_WIDTH, DIGIT_HEIGHT / 2 + (DIGIT_HEIGHT / 2 / (INTERVAL + 1)) * (i + 1), 0]),
    [[0, DIGIT_HEIGHT / 2, 0]],
    Array.from({ length: INTERVAL }, (_, i) => [(DIGIT_WIDTH / (INTERVAL + 1)) * (i + 1), DIGIT_HEIGHT / 2, 0]),
    [[DIGIT_WIDTH, DIGIT_HEIGHT / 2, 0]],
    Array.from({ length: INTERVAL }, (_, i) => [0, (DIGIT_HEIGHT / 2 / (INTERVAL + 1)) * (i + 1), 0]),
    Array.from({ length: INTERVAL }, (_, i) => [DIGIT_WIDTH, (DIGIT_HEIGHT / (INTERVAL + 1)) * (i + 1) / 2, 0]),
    [[0, 0, 0]],
    Array.from({ length: INTERVAL }, (_, i) => [(DIGIT_WIDTH / (INTERVAL + 1)) * (i + 1), 0, 0]),
    [[DIGIT_WIDTH, 0, 0]]
  ], []);

  const digit = digitMap[num];

  useEffect(() => {
    digit.forEach((on, i) => {
      materialMap[i].emissiveIntensity = on;
    });
  }, [num]);

  return (
    <group position={position}>
      {
        positionMap.map((positions, i) => 
          positions.map((pos, j) => 
            <DigitMesh key={`DigitMesh${i}-${j}`} position={(pos as [number, number, number])} material={materialMap[i]} />
          )
        )
      }
    </group>
  )
}

type PointDisplayProps = {
  num: number;
  position: [number, number, number];
  isP1: boolean;
};

export function PointDisplay({num, position, isP1}: PointDisplayProps) {
  const nums = num.toString().padStart(2, '0').split('').map(Number);

  return (
    <group position={position}>
      {
        nums.map((num, i) =>
          <DigitDisplay key={i} num={num} position={[7.5 * i, 0, 0]} isP1={isP1} />
        )
      }
    </group>
  )
}