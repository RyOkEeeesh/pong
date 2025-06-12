import { THREE, Game, TC } from './module';

const game = new Game({
  cameraPosition: {y: 20, z: 16 },
  controls: true,
  composer: true
});

function createStretchEffect(center: THREE.Vector3, wallNormal: THREE.Vector3) {
  const planeCount = 2;
  const duration = 500;
  const maxScale = 3;

  const wallTangent = new THREE.Vector3().crossVectors(wallNormal, new THREE.Vector3(0, 1, 0)).normalize();

  for (let i = 0; i < planeCount; i++) {
    const side = i < 2 ? -1 : 1; // 左右
    const offsetIndex = i % 2;   // 0 or 1
    const offset = wallTangent.clone().multiplyScalar(offsetIndex * 0.3 * side);

    const geometry = new THREE.PlaneGeometry(1, 0.2); // 横長
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffffaa,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center.clone().add(offset));

    // 壁に貼り付ける
    const planeNormal = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(planeNormal, wallNormal.clone().normalize());
    mesh.quaternion.copy(quaternion);

    game.scene.add(mesh);

    // アニメーション：スケールを伸ばして縮める
    const startTime = performance.now();
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = elapsed / duration;
      if (t >= 1) {
        game.scene.remove(mesh);
        return;
      }

      // 前半：伸びる、後半：縮む
      const scaleFactor = t < 0.5
        ? 1 + (maxScale - 1) * (t / 0.5)
        : maxScale - (maxScale - 1) * ((t - 0.5) / 0.5);

      mesh.scale.set(scaleFactor, 1, 1);
      material.opacity = 1 - t;
      material.emissiveIntensity = 3 * (1 - t);

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

        createStretchEffect(intersects[0].point.clone(), normal.clone());
        break;
      }
    }
  }
});

game.start();
