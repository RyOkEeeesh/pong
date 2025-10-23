import * as THREE from 'three';
import { EFFECT_MATERIAL_ARGS, EFFECT_MESH_WIDTH, FramePriority, GameStatus, WALL_HEIGHT } from './constants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { coreStore } from './store';
import { useFrame } from '@react-three/fiber';

type StretchEffect = {
  mesh: THREE.Mesh;
  startTime: number;
  side: -1 | 1;
  normal: THREE.Vector3;
  point: THREE.Vector3;
  wall: THREE.Mesh;
};

type BlinkingEffect = {
  mat: THREE.MeshStandardMaterial[];
  start: number;
  end: number;
  difference: number;
  times: number;
  defEmissiveIntensity: number[];
};

export type TriggerStretchEffect = {
  wall: THREE.Mesh;
  point: THREE.Vector3;
  normal: THREE.Vector3;
};

export type TriggerBlinkingEffect = {
  mat: THREE.MeshStandardMaterial[];
  end: number;
  difference: number;
  times: number;
};

type EffectProps = {
  triggerStretchEffect: TriggerStretchEffect | null;
  triggerBlinkingEffect: TriggerBlinkingEffect | null;
};

const INITIAL_MESH_AMOUNT = 8;

export function Effect({ triggerStretchEffect, triggerBlinkingEffect }: EffectProps) {
  const [_, setUpdate] = useState<number>(0);

  const planeGeometry = useMemo(() => new THREE.PlaneGeometry(EFFECT_MESH_WIDTH, WALL_HEIGHT), []);
  useEffect(() => () => planeGeometry.dispose(), [planeGeometry]);

  const materialPoolRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const effectMeshPoolRef = useRef<THREE.Mesh[]>([]);


  useEffect(() => {
    if (effectMeshPoolRef.current.length > 0) return;
    for (let i = 0; i < INITIAL_MESH_AMOUNT; i++) {
      if (i % 2 === 0)
        materialPoolRef.current.push(new THREE.MeshStandardMaterial(EFFECT_MATERIAL_ARGS));
      const mesh = new THREE.Mesh(
        planeGeometry,
        materialPoolRef.current[Math.floor(i / 2)]
      );
      mesh.visible = true;
      mesh.position.set(9999, 9999, 9999);
      effectMeshPoolRef.current.push(mesh);
    }
    
    requestAnimationFrame(() => {
      effectMeshPoolRef.current.forEach(mesh => (mesh.visible = false));
    });
  }, []);

  const stretchEffectsRef = useRef<StretchEffect[]>([]);

  function getEffectMesh() {
    const mesh = effectMeshPoolRef.current.find(m => !m.visible);
    if (mesh) {
      mesh.visible = true;
      return mesh;
    }

    if (!materialPoolRef.current[Math.floor((effectMeshPoolRef.current.length) / 2)])
      materialPoolRef.current.push(new THREE.MeshStandardMaterial(EFFECT_MATERIAL_ARGS));

    const newMesh = new THREE.Mesh(
      planeGeometry,
      materialPoolRef.current[Math.floor((effectMeshPoolRef.current.length) / 2)]
    );
    newMesh.visible = true;
    effectMeshPoolRef.current.push(newMesh);

    setUpdate(v => v + 1);
    return newMesh;
  }

  function stretchEffect(props: TriggerStretchEffect) {
    const { point, normal, wall } = props;
    const newEffects = ([-1, 1] as (-1 | 1)[]).map(side => {
      const mesh = getEffectMesh();
      mesh.rotation.copy(wall.rotation);
      return { mesh, startTime: performance.now(), side, normal, point, wall };
    });
    stretchEffectsRef.current.push(...newEffects);
  }

  function updateStretchEffect() {
    const duration = 450;
    const now = performance.now();

    stretchEffectsRef.current = stretchEffectsRef.current.filter((effect, i) => {
      const elapsed = now - effect.startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1 || coreStore.gameStatus === GameStatus.GetPoint) {
        effect.mesh.visible = false;
        return false;
      }

      const wallTangent = new THREE.Vector3().crossVectors(effect.normal, new THREE.Vector3(0, 1, 0)).normalize();
      const wallSize = new THREE.Vector3();
      effect.wall.geometry.computeBoundingBox();
      effect.wall.geometry.boundingBox?.getSize(wallSize);

      const wallPos = new THREE.Vector3();
      effect.wall.getWorldPosition(wallPos);

      const wallDir = wallTangent.clone();
      const halfLength = wallSize.x / 2;
      const wallStart = wallPos.clone().add(wallDir.clone().multiplyScalar(-halfLength));
      const wallEnd = wallPos.clone().add(wallDir.clone().multiplyScalar(halfLength));

      const basePos = effect.point.clone().add(effect.normal.clone().multiplyScalar(0.06));
      let effectPos = basePos.clone().add(wallTangent.clone().multiplyScalar(6 * progress * effect.side));

      const localOffset = effectPos.clone().sub(wallStart);
      const projectedLength = localOffset.dot(wallDir);
      const halfEffectWidth = 0.75;

      if (projectedLength < halfEffectWidth) {
        effectPos = wallStart.clone().add(wallDir.clone().multiplyScalar(halfEffectWidth));
      } else if (projectedLength > wallSize.x - halfEffectWidth) {
        effectPos = wallEnd.clone().add(wallDir.clone().multiplyScalar(-halfEffectWidth));
      }

      effect.mesh.position.copy(effectPos);

      if (stretchEffectsRef.current[i - 1]?.mesh.material === effect.mesh.material) return true;

      const material = effect.mesh.material as THREE.MeshStandardMaterial;
      material.opacity = 1 - progress;
      material.emissiveIntensity = 3 * (1 - progress);

      return true;
    });
  }

  const blinkingEffectRef = useRef<BlinkingEffect[]>([]);

  function blinkingEffect(option: TriggerBlinkingEffect) {
    blinkingEffectRef.current.push({
      ...option,
      start: performance.now(),
      defEmissiveIntensity: option.mat.map(m => m.emissiveIntensity),
    });
  }

  function updateBlinkingEffect() {
    const now = performance.now();

    blinkingEffectRef.current = blinkingEffectRef.current.filter(effect => {
      const { start, end, difference, times, mat, defEmissiveIntensity } = effect;
      const elapsed = now - start;
      if (elapsed >= end) {
        mat.forEach((m, i) => {
          m.emissiveIntensity = defEmissiveIntensity[i];
          m.needsUpdate = true;
        });
        return false;
      }

      const totalRadians = 1.75 * times * Math.PI;
      const angle = (elapsed * totalRadians) / end;
      const value = Math.sin(angle);
      const step = difference * ((value + 1) / 2);

      mat.forEach((m, i) => {
        m.emissiveIntensity = defEmissiveIntensity[i] + step;
        m.needsUpdate = true;
      });
      return true;
    });
  }

  useEffect(() => {
    if (triggerStretchEffect) stretchEffect(triggerStretchEffect);
  }, [triggerStretchEffect]);

  useEffect(() => {
    if (triggerBlinkingEffect) blinkingEffect(triggerBlinkingEffect);
  }, [triggerBlinkingEffect]);

  useFrame(() => {
    updateStretchEffect();
    updateBlinkingEffect();
  }, FramePriority.Effect);

  return (
    <>
      {effectMeshPoolRef.current.map((mesh, i) => (
        <primitive object={mesh} key={i} />
      ))}
    </>
  );
}