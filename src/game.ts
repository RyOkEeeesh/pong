import { THREE, Game, TC } from './module';

const game = new Game({
  cameraPosition: {y: 20, z: 16 },
  controls: true,
  composer: true
});


const ballSpeed = 20;
let velocity = TC.vec3({x: 0.1, z: 0.1}).normalize().multiplyScalar(ballSpeed);

const clock = new THREE.Clock();

game.onBeforeRender(() => {
  
  const deltaTime = Math.min(clock.getDelta(), 0.05); // 秒単位の経過時間

  // 毎秒速度 × 経過時間 = フレームごとの移動量
  const frameVelocity = velocity.clone().multiplyScalar(deltaTime);
  game.ball.position.add(frameVelocity);


  // 衝突判定
  const raycaster = new THREE.Raycaster(game.ball.position, velocity.clone().normalize(), 0.05, 1);

  for (const wall of game.walls) {
    const intersects = raycaster.intersectObject(wall, true);
    if (intersects.length > 0) {
      const normal = intersects[0].face?.normal.clone();
      if (normal) {
        normal.transformDirection(wall.matrixWorld);
        velocity.reflect(normal);

        game.createStretchEffect(intersects[0].point.clone(), normal.clone(), wall);

        break;
      }
    }
  }
  
  // パドルとの衝突判定
  const paddles = [game.myPaddle, game.enemyPaddle];
  for (const paddle of paddles) {
    const intersects = raycaster.intersectObject(paddle, true);
    if (intersects.length > 0) {
      const normal = intersects[0].face?.normal.clone();
      if (normal) {
        normal.transformDirection(paddle.matrixWorld);

        // 面の向きを判定
        if (Math.abs(normal.z) > 0.9) {

          const localHitPoint = paddle.worldToLocal(intersects[0].point.clone());
          const geometry = paddle.geometry;

          if (!geometry.boundingBox) break
          const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
          const halfWidth = (width * paddle.scale.x) / 2;

          const normalized = THREE.MathUtils.clamp(localHitPoint.x / halfWidth, -1, 1);

          const maxAngle = Math.PI / 3;
          const angle = normalized * maxAngle;

          const speed = ballSpeed;
          const directionZ = game.ball.position.z < paddle.position.z ? -1 : 1;

          velocity.set(
            speed * Math.sin(angle),
            0,
            directionZ * speed * Math.cos(angle)
          );

          const offset = normal.clone().multiplyScalar(0.01); // 少しだけ押し出す
          game.ball.position.add(offset);

        }else {
          velocity.reflect(normal);
        }
        game.createStretchEffect(intersects[0].point.clone(), normal.clone(), paddle);

        break;
      }
    }
  }
}

);

game.start();
