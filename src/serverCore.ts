import * as THREE from 'three';
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh';
import { ACCELERATION, BALL_SIZE, BALL_SPEED, GAME_POINT, PADDLE_POSITION_Z1, PADDLE_POSITION_Z2, GAME_POINT_MAX, GameStatus, PADDLE_HALF_X, PADDLE_HEIGHT, PADDLE_WIDTH, STAGE_HEIGHT, STAGE_WIDTH, WALL_DEPTH, WALL_HEIGHT, BALL_SPEED_MAX } from './constants.ts';

(THREE.BufferGeometry.prototype as any).computeBoundsTree = function () {
  (this as any).boundsTree = new MeshBVH(this);
};
(THREE.BufferGeometry.prototype as any).disposeBoundsTree = function () {
  (this as any).boundsTree = null;
};
(THREE.Mesh.prototype as any).raycast = acceleratedRaycast;

export const delta = 1 / 30;

export class Context {
  static gameStatus: GameStatus = GameStatus.First;
  static ballSpeed: number = BALL_SPEED
  static ballPosition: THREE.Vector3 = new THREE.Vector3();
  static velocity: THREE.Vector3 = new THREE.Vector3();
  static paddlePosition: [number, number] = [0, 1]; // [p2, p1]
  static pointGetter: boolean = Boolean(Math.round(Math.random()));
  static points: [number, number] = [0, 0];
  static gamePoint: number = GAME_POINT;
  static gamePointMax: number = GAME_POINT_MAX;
  static matchPoint: boolean = false;
  static isFinish: boolean = false;
  static serveHit: boolean = true; // false

  constructor() {}

  static accel() {
    Context.ballSpeed = Math.min(Context.ballSpeed + ACCELERATION, BALL_SPEED_MAX);
  }

  static resetBallSpeed() {
    Context.ballSpeed = BALL_SPEED;
  }

  static updateBallPosition()  {
    Context.ballPosition.addScaledVector(Context.velocity, delta);
  }

  static setVelocity(vel: THREE.Vector3) {
    Context.velocity = vel.clone().normalize().multiplyScalar(Context.ballSpeed);
  }

  static resetVelocity() {
    Context.velocity = new THREE.Vector3();
  }

  static setPaddlePosition(pos: [number, number]) {
    Context.paddlePosition = pos;
  }

  static resetPaddlePosition() {
    Context.paddlePosition = [0, 0];
  }

  static addPoint() {
    Context.points[Number(Context.pointGetter)]++;

    const max = Math.max(...Context.points);

    if (Context.gamePoint - max === 1) {
      if (Context.points[0] === Context.points[1] && GAME_POINT_MAX - max !== 1) { // デュース
        Context.gamePoint = Math.min(Context.gamePoint + 1, GAME_POINT_MAX);
        Context.matchPoint = false;
        return;
      } else {
        Context.matchPoint = true;
        return;
      }
    } else if (Context.gamePoint === max) {
      Context.matchPoint = false;
      Context.isFinish = true;
      return;
    }

    Context.matchPoint = false;
    Context.isFinish = false;
  }

  static resetAll() {
    Context.gameStatus = GameStatus.First;
    Context.ballPosition.set(0, 0, 0);
    Context.velocity.set(0, 0, 0);
    Context.paddlePosition = [0, 1];
    Context.pointGetter = Boolean(Math.round(Math.random()));
    Context.points = [0, 0];
    Context.gamePoint = GAME_POINT;
    Context.gamePointMax = GAME_POINT_MAX;
    Context.matchPoint = false;
    Context.isFinish = false;
    Context.serveHit = true; // false
  }
}

Context.resetAll();

const offsets = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.5, 0, 0.5),
    new THREE.Vector3(-0.5, 0, 0.5),
    new THREE.Vector3(0.5, 0, -0.5),
    new THREE.Vector3(-0.5, 0, -0.5)
  ];

export class GameCore {
  #Walls = [new SideWall([-STAGE_WIDTH / 2, 0]), new SideWall([STAGE_WIDTH / 2, 0]), new GoalWall([0, STAGE_HEIGHT / 2]), new GoalWall([0, -STAGE_HEIGHT / 2])];
  #paddles = [new Paddle([0, PADDLE_POSITION_Z2]), new Paddle([0, PADDLE_POSITION_Z1])];
  #ball = new Ball();

  #interval!: NodeJS.Timeout | null;

  constructor() {}

  hasService() {
    return this.#paddles[Number(!Context.pointGetter)];
  }

  moveBallForPaddle() {
    const position = this.hasService().mesh.position.clone();
    position.z = position.z - Math.sign(position.z) * 1.2;
    Context.ballPosition = position;
  }

  start() {
    this.#interval = setInterval(() => {
      console.log(Context.ballPosition)
      this.#paddles[0].move();
      this.#paddles[1].move();

      switch (Context.gameStatus) {
        case GameStatus.First:
          this.moveBallForPaddle();
          Context.gameStatus = GameStatus.Serving;
          break;
        case GameStatus.Serving:
          this.#ball.changeServePosition(this.hasService());
          if (Context.serveHit) {
            // Context.serveHit = false;
            this.hasService().hitPaddle();
            this.#ball.resetServePosition();
            Context.gameStatus = GameStatus.Playing;
          }
          break;
        case GameStatus.Playing:
          {
            Context.updateBallPosition();
            const frameVelocity = Context.velocity.clone().multiplyScalar(delta).length();
            for (const offset of offsets) {
              const origin = Context.ballPosition.clone().add(offset);
              const ray = new THREE.Raycaster(
                origin,
                Context.velocity.clone().normalize(),
                0,
                frameVelocity + 0.09
              );

              for (const obj of [...this.#paddles, ...this.#Walls]) {
                const hit = obj.onHit(ray);
                if (hit) {
                  if (Context.gameStatus !== GameStatus.Playing) return;

                  // ヒットした値などをクライアントに送信
                  break;
                }
              }
            }
          }
          break;
        case GameStatus.GetPoint:
          console.log(Context.points)
          if (Context.isFinish) {
            Context.gameStatus = GameStatus.End;
          } else {
            this.moveBallForPaddle();
            Context.gameStatus = GameStatus.Serving;
          }
          break;
        case GameStatus.End:
      }

      this.#ball.setPosition();
    }, delta * 1000);
  }

  stop() {
    if (!this.#interval) return;
    clearInterval(this.#interval);
    this.#interval = null;
  }

  get walls() { return this.#Walls; }
  get paddles() { return this.#paddles; }
  get ball() { return this.#ball; }
}

type Hit = {
  normal: THREE.Vector3,
  hitPoint: THREE.Vector3
}

function isHit(ray: THREE.Raycaster, obj: THREE.Mesh): Hit | undefined {
  const intersects = ray.intersectObject(obj, true);
  if (intersects.length > 0) {
    const normal = intersects[0].face?.normal.clone();
    if (normal) return {
      normal: normal.transformDirection(obj.matrixWorld).clone(),
      hitPoint: intersects[0].point.clone()
    };
  }
  return;
};

abstract class HitObject {
  constructor(mesh: THREE.Mesh) {
    mesh.geometry.computeBoundsTree();
  }
  abstract onHit(ray: THREE.Raycaster): Hit | undefined;
  abstract get mesh(): THREE.Mesh;
}

class SideWall extends HitObject {
  #mesh: THREE.Mesh;

  constructor(pos: [number, number]) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(STAGE_HEIGHT + WALL_DEPTH, WALL_HEIGHT, WALL_DEPTH)
    );
    super(mesh);
    this.#mesh = mesh;

    this.#mesh.position.set(pos[0], 0, pos[1]);
    this.#mesh.rotateY(Math.PI / 2);
  }

  onHit(ray: THREE.Raycaster): Hit | undefined {
    const hit = isHit(ray, this.#mesh);
    if (!hit) return;

    const newVel = Context.velocity.clone();
    newVel.x *= -1;
    Context.velocity = newVel;

    return hit;
  }

  get mesh() { return this.#mesh; }
}

class GoalWall extends HitObject {
  #mesh: THREE.Mesh;

  constructor(pos: [number, number]) {
    const mesh =  new THREE.Mesh(
      new THREE.BoxGeometry(STAGE_WIDTH + WALL_DEPTH, WALL_HEIGHT, WALL_DEPTH)
    );
    super(mesh);
    this.#mesh = mesh;
    this.#mesh.position.set(pos[0], 0, pos[1]);
  }

  onHit(ray: THREE.Raycaster): Hit | undefined {
    const hit = isHit(ray, this.#mesh);
    if (!hit) return;

    Context.resetVelocity();
    Context.resetBallSpeed();
    Context.pointGetter = this.#mesh.position.z < 0;
    Context.addPoint();
    Context.gameStatus = GameStatus.GetPoint;

    return hit;
  }

  get mesh() { return this.#mesh; }

}

class Paddle extends HitObject {
  #mesh: THREE.Mesh;

  constructor(pos: [number, number]) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_HEIGHT)
    );
    super(mesh);
    this.#mesh = mesh;+
    this.#mesh.position.set(pos[0], 0, pos[1]);
  }

  move() {
    this.#mesh.position.x = Context.paddlePosition[Number(this.#mesh.position.z > 0)];
  }

  hitPaddle() {
    const normalized = THREE.MathUtils.clamp( (Context.ballPosition.x - this.mesh.position.x) / PADDLE_HALF_X, -1, 1 );
    const maxAngle = Math.PI / 3;
    const angle = normalized * maxAngle;
    const dz = this.mesh.position.z > 0 ? -1 : 1;

    Context.velocity.set(
      Context.ballSpeed * Math.sin(angle),
      0,
      dz * Context.ballSpeed * Math.cos(angle)
    );

    if (Math.abs(Context.velocity.y) < 0.01) {
      Context.velocity.y = dz * 0.1;
      Context.velocity.normalize().multiplyScalar(Context.ballSpeed);
    }
  }

  onHit(ray: THREE.Raycaster): Hit | undefined {
    const hit = isHit(ray, this.#mesh);
    if (!hit) return;

    if (hit.normal.z > 0.9 || hit.normal.z < -0.9) {
      this.hitPaddle();
    } else {
      const newVel = Context.velocity.clone();
      newVel.x *= -1;
      Context.velocity = newVel;
    }

    return hit;
  }

  get mesh() { return this.#mesh; }
}

class Ball {
  #mesh: THREE.Mesh = new THREE.Mesh(
    new THREE.BoxGeometry(BALL_SIZE, BALL_SIZE, BALL_SIZE)
  );

  #serveBeforePaddlePosition: THREE.Vector3 | null = null;
  #serveBeforeBallPosition: THREE.Vector3 | null = null;
  #servePaddleVelocity: THREE.Vector3 = new THREE.Vector3();
  #serveBallVelocity: THREE.Vector3 = new THREE.Vector3();

  constructor() {}

  setPosition(pos: THREE.Vector3 = Context.ballPosition) {
    this.#mesh.position.copy(pos);
  }

  changeServePosition(paddle: Paddle) {
    if (this.#serveBeforePaddlePosition === null || this.#serveBeforeBallPosition === null) {
      this.#serveBeforePaddlePosition = paddle.mesh.position.clone();
      this.#serveBeforeBallPosition = this.#mesh.position.clone();
      return;
    }
    this.#servePaddleVelocity.subVectors(paddle.mesh.position.clone(), this.#serveBeforePaddlePosition).divideScalar(delta);
    this.#serveBallVelocity.subVectors(this.#mesh.position.clone(), this.#serveBeforeBallPosition).divideScalar(delta);
    this.#serveBeforePaddlePosition.copy(paddle.mesh.position);
    this.#serveBeforeBallPosition.copy(this.#mesh.position);

    const friction = 0.965;

    if (this.#servePaddleVelocity.x !== this.#serveBallVelocity.x) {
      this.#serveBallVelocity.multiplyScalar(friction);
      if (this.#serveBallVelocity.lengthSq() < 0.0001) this.#serveBallVelocity.set(0, 0, 0);
      this.#mesh.position.x += this.#serveBallVelocity.x * delta;
      this.#mesh.position.x = THREE.MathUtils.clamp(this.#mesh.position.x, -STAGE_WIDTH / 2 + 0.8, STAGE_WIDTH / 2 - 0.8);
    }

    this.#mesh.position.x = THREE.MathUtils.clamp(this.#mesh.position.x, paddle.mesh.position.x - PADDLE_HALF_X + BALL_SIZE / 2, paddle.mesh.position.x + PADDLE_HALF_X - BALL_SIZE / 2);
  }

  resetServePosition() {
    this.#serveBeforePaddlePosition = null;
    this.#serveBeforeBallPosition = null;
  }

  get mesh() { return this.#mesh; }
}