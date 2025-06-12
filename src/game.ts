import { THREE, Game, TC } from './module';

const game = new Game({
  cameraPosition: {y: 20, z: 16 },
  controls: true,
  composer: true
});

function createStretchEffect(center: THREE.Vector3, wallNormal: THREE.Vector3, wall: THREE.Mesh) {
  const duration = 750;
  const width = 1;
  const height = 1;
  const maxOffset = 3;
  const depthOffset = 0.01;

  // 壁に沿った方向（法線と垂直）
  const wallTangent = new THREE.Vector3().crossVectors(wallNormal, new THREE.Vector3(0, 1, 0)).normalize();

  // 壁のサイズと向きを取得
  wall.geometry.computeBoundingBox();
  const wallSize = new THREE.Vector3();
  wall.geometry.boundingBox?.getSize(wallSize);
  wall.updateMatrixWorld(true);

  const wallCenter = new THREE.Vector3();
  wall.getWorldPosition(wallCenter);

  const wallDirection = wallTangent.clone(); // 壁の横方向
  const halfLength = wallSize.x / 2;
  const wallStart = wallCenter.clone().add(wallDirection.clone().multiplyScalar(-halfLength));
  const wallEnd = wallCenter.clone().add(wallDirection.clone().multiplyScalar(halfLength));

  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1;

    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);

    const basePosition = center.clone().add(wallNormal.clone().multiplyScalar(depthOffset));
    mesh.position.copy(basePosition);

    // 壁に貼り付ける
    const planeNormal = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(planeNormal, wallNormal.clone().normalize());
    mesh.quaternion.copy(quaternion);

    game.scene.add(mesh);

    const startTime = performance.now();
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        game.scene.remove(mesh);
        return;
      }

      const offset = wallTangent.clone().multiplyScalar(maxOffset * progress * side);
      let effectPos = basePosition.clone().add(offset);

      // 壁の範囲にクランプ（エフェクトの幅を考慮）
      const localOffset = effectPos.clone().sub(wallStart);
      const projectedLength = localOffset.dot(wallDirection);
      const halfEffectWidth = width / 2;

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
  }
}




// 初期速度
let velocity = TC.vec3({x: 0.1, z: 0.1});

game.onBeforeRender(() => {
  // ボールの移動
  game.ball.position.add(velocity);

  // 衝突判定
  const raycaster = new THREE.Raycaster(game.ball.position, velocity.clone().normalize(), 0, 0.6);
  for (const wall of game.walls) {
    const intersects = raycaster.intersectObject(wall, true);
    if (intersects.length > 0) {
      const normal = intersects[0].face?.normal.clone();
      if (normal) {
        normal.transformDirection(wall.matrixWorld);
        velocity.reflect(normal);

        createStretchEffect(intersects[0].point.clone(), normal.clone(), wall);

        break;
      }
    }
  }
});

game.start();
