import { GameManager, GameStatus } from "./manager";
import { THREE } from "./ThreeModule";

export class Effect {
  #stretchEffectPool: THREE.Mesh[] = [];
  #scene!: THREE.Scene;
  
  constructor(private manager: GameManager ) {}

  init(scene: THREE.Scene) {
    this.#scene = scene;
    return this;
  }

  getEffectMesh() {
    const mesh = this.#stretchEffectPool.find(m => !m.visible);

    if (mesh) {
      mesh.visible = true;
      return mesh;
    }

    const geometry = new THREE.PlaneGeometry(1.5, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const newMesh = new THREE.Mesh(geometry, material);
    this.#scene.add(newMesh);
    this.#stretchEffectPool.push(newMesh);
    return newMesh;
  }

  async stretchEffect(center: THREE.Vector3, normal: THREE.Vector3, wall: THREE.Mesh) {
    const duration = 450;
    const maxOffset = 6;
    const depthOffset = 0.06;

    const wallTangent = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize();

    wall.geometry.computeBoundingBox();
    const wallSize = new THREE.Vector3();
    wall.geometry.boundingBox?.getSize(wallSize);
    wall.updateMatrixWorld();

    const wallCenter = new THREE.Vector3();
    wall.getWorldPosition(wallCenter);

    const wallDirection = wallTangent.clone();
    const halfLength = wallSize.x / 2;
    const wallStart = wallCenter.clone().add(wallDirection.clone().multiplyScalar(-halfLength));
    const wallEnd = wallCenter.clone().add(wallDirection.clone().multiplyScalar(halfLength));

    const animateStretch = (side: (-1 | 1)): Promise<void> => new Promise(resolve => {
        const mesh = this.getEffectMesh();
        const material = mesh.material as THREE.MeshStandardMaterial;

        const basePosition = center.clone().add(normal.clone().multiplyScalar(depthOffset));
        mesh.position.copy(basePosition);

        const planeNormal = new THREE.Vector3(0, 0, 1);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(planeNormal, normal.clone().normalize());
        mesh.quaternion.copy(quaternion);

        this.#scene.add(mesh);

        const startTime = performance.now();

        const animate = () => {
          const elapsed = performance.now() - startTime;
          const progress = elapsed / duration;

          if (progress >= 1 || this.manager.gameStatus === GameStatus.GetPoint) {
            mesh.visible = false;
            resolve();
            return;
          }

          const offset = wallTangent.clone().multiplyScalar(maxOffset * progress * side);
          let effectPos = basePosition.clone().add(offset);

          const localOffset = effectPos.clone().sub(wallStart);
          const projectedLength = localOffset.dot(wallDirection);
          const halfEffectWidth = 0.5;

          if (projectedLength < halfEffectWidth) {
            effectPos = wallStart.clone().add(wallDirection.clone().multiplyScalar(halfEffectWidth));
          } else if (projectedLength > wallSize.x - halfEffectWidth) {
            effectPos = wallEnd.clone().add(wallDirection.clone().multiplyScalar(-halfEffectWidth));
          }

          mesh.position.copy(effectPos);
          material.opacity = 1 - progress;
          material.emissiveIntensity = 3 * (1 - progress);

          requestAnimationFrame(animate);
        };
        animate();
      });

    await Promise.all([animateStretch(-1), animateStretch(1)]);
  }

  async blinkingEffect(mat: THREE.MeshStandardMaterial) {
    await new Promise(resolve => {
      const defEmissiveIntensity = mat.emissiveIntensity;
      const endtime = 0.4;
      const cycles = 1.75;
      const difference = 0.15;
      const totalRadians = cycles * 2 * Math.PI;
      const startTime = performance.now();

      const effect = (now: number) => {
        const deltaTime = (now - startTime) / 1000;
        if (deltaTime >= endtime) {
          mat.emissiveIntensity = defEmissiveIntensity;
          return resolve(null);
        }
        const angle = deltaTime * totalRadians / endtime;
        const value = Math.sin(angle);
        const step = difference * ((value + 1) / 2);
        mat.emissiveIntensity = defEmissiveIntensity + step;
        mat.needsUpdate = true;

        requestAnimationFrame(effect);
      };

      effect(performance.now());
    })
  }
}