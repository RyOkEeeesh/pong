import * as THREE from 'three';
import { EFFECT_MATERIAL_ARGS, EFFECT_MESH_WIDTH, FramePriority, GameStatus, WALL_HEIGHT } from './constants';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from './store';
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
}

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
}

export function Effect({
  triggerStretchEffect,
  triggerBlinkingEffect,
}: EffectProps) {
  const [ effectPool, setEffectPool ] = useState<THREE.Mesh[]>(Array.from({ length: 4 }, () => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(EFFECT_MESH_WIDTH, WALL_HEIGHT),
      new THREE.MeshStandardMaterial(EFFECT_MATERIAL_ARGS)
    );
    mesh.visible = false;
    return mesh;
  }));

  useEffect(() => {
    if (!triggerStretchEffect) return;
    stretchEffect(triggerStretchEffect)
  }, [triggerStretchEffect])

  useEffect(() => {
    if (!triggerBlinkingEffect) return;
    blinkingEffect(triggerBlinkingEffect);
  }, [triggerBlinkingEffect])

  function getEffectMesh() {
    const mesh = effectPool.find(m => !m.visible);
    if (mesh) {
      mesh.visible = true;
      return mesh;
    }
    const newEffectMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(EFFECT_MESH_WIDTH, WALL_HEIGHT),
      new THREE.MeshStandardMaterial(EFFECT_MATERIAL_ARGS)
    );
    const newEffectPool = [ ...effectPool, newEffectMesh];
    setEffectPool(newEffectPool);
    return newEffectMesh;
  }

  const stretchEffectsRef = useRef<StretchEffect[]>([]);

  function stretchEffect(props: TriggerStretchEffect) {
    const {point, normal, wall} = props;
    const newEffects = ([-1, 1] as (-1 | 1)[]).map(side => {
      const mesh = getEffectMesh();
      mesh.visible = true;
      mesh.rotation.copy(wall.rotation);
      return { mesh, startTime: performance.now(), side, normal, point, wall };
    });
    stretchEffectsRef.current.push(...newEffects);
  }

  function updateStretchEffect() {
    if (!stretchEffectsRef.current.length) return;
    const duration = 450;
    const now = performance.now();
    const gameStatus = useGameStore.getState().gameStatus;

    stretchEffectsRef.current = stretchEffectsRef.current.filter(effect => {
      const elapsed = now - effect.startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1 || gameStatus === GameStatus.GetPoint) {
        effect.mesh.visible = false;
        return false;
      }

      const wallTangent = new THREE.Vector3().crossVectors(effect.normal, new THREE.Vector3(0, 1, 0)).normalize();
      const wallSize = new THREE.Vector3();
      effect.wall.geometry.computeBoundingBox();
      effect.wall.geometry.boundingBox?.getSize(wallSize);

      const wallpoint = new THREE.Vector3();
      effect.wall.getWorldPosition(wallpoint);

      const wallDirection = wallTangent.clone();
      const halfLength = wallSize.x / 2;
      const wallStart = wallpoint.clone().add(wallDirection.clone().multiplyScalar(-halfLength));
      const wallEnd = wallpoint.clone().add(wallDirection.clone().multiplyScalar(halfLength));

      const basePosition = effect.point.clone().add(effect.normal.clone().multiplyScalar(0.06));
      let effectPos = basePosition.clone().add(wallTangent.clone().multiplyScalar(6 * progress * effect.side));

      const localOffset = effectPos.clone().sub(wallStart);
      const projectedLength = localOffset.dot(wallDirection);
      const halfEffectWidth = 0.75;

      if (projectedLength < halfEffectWidth) {
        effectPos = wallStart.clone().add(wallDirection.clone().multiplyScalar(halfEffectWidth));
      } else if (projectedLength > wallSize.x - halfEffectWidth) {
        effectPos = wallEnd.clone().add(wallDirection.clone().multiplyScalar(-halfEffectWidth));
      }

      effect.mesh.position.copy(effectPos);
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
      defEmissiveIntensity: option.mat.map(m => m.emissiveIntensity)
    });
  }

  function updateBlinkingEffect() {
    if (!blinkingEffectRef.current.length) return;
    const now = performance.now();

    blinkingEffectRef.current = blinkingEffectRef.current.filter(effect => {
      const { start, end, difference, times, mat, defEmissiveIntensity } = effect;
      const elapsed = now - start!;

      if (elapsed >= end) {
        mat.forEach((m, i) => {
          m.emissiveIntensity = defEmissiveIntensity![i];
          m.needsUpdate = true;
        });
        return false;
      }

      const totalRadians = 1.75 * times * Math.PI;
      const angle = (elapsed * totalRadians) / end;
      const value = Math.sin(angle);
      const step = difference * ((value + 1) / 2);

      mat.forEach((m, i) => {
        m.emissiveIntensity = defEmissiveIntensity![i] + step;
        m.needsUpdate = true;
      });

      return true;
    });
  }

  useFrame(() => {
    updateStretchEffect();
    updateBlinkingEffect();
  }, FramePriority.Effect);

  return (
    <> {
      effectPool.map((mesh, i) => ( <primitive object={mesh} key={i} /> ))
    } </>
  )
}