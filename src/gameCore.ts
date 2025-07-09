import { UserSetting } from './control';
import { Effect } from './effect';
import { GameManager, GameStatus, ModeManager, PointManager, TaskManager } from './manager';
import { THREE } from './ThreeModule';

export function normalize(val: number, min: number, max: number) {
  if (min === max) return 0;
  return (val - min) / (max - min);
};

export function denormalize(val: number, min: number, max: number) { return val * (max - min) + min; };

export const defMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 0.25,
  metalness: 0,
  roughness: 0
});

export type Hit = {
  normal: THREE.Vector3,
  hitPoint: THREE.Vector3
}

export function isHit(ray: THREE.Raycaster, obj: THREE.Mesh): Hit | undefined {
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

export class GameContext {
  #mm: ModeManager = new ModeManager();
  #us: UserSetting = new UserSetting();
  #gm: GameManager = new GameManager();
  #pm: PointManager = new PointManager();
  #tm: TaskManager = new TaskManager();

  constructor() {}

  get ModeManager() { return this.#mm; }
  get UserSetting() { return this.#us; }
  get GameManager() { return this.#gm; }
  get PointManager() { return this.#pm; }
  get TaskManager() { return this.#tm; }
}

export class Stage {
  #hitObjects: ( Paddle | ObstacleWall | GoalWall )[] = [];

  #wallMaterial!: THREE.MeshStandardMaterial;
  #wallLeft!: ObstacleWall;
  #wallRight!: ObstacleWall;
  #wallBefore!: GoalWall;
  #wallAfter!: GoalWall;

  #ball!: Ball;
  #p1!: Paddle;
  #p2!: Paddle;

  private manager!: GameManager;

  constructor(private context: GameContext) {
    this.manager = this.context.GameManager;
    this.init();
  }

  init() {
    this.initWallMaterial();
    this.initBall();
    this.initPaddles();
    this.initWalls();
    this.initHitObjects();
  }

  private initWallMaterial() {
    this.#wallMaterial = defMat.clone();
  }

  private initBall() {
    this.#ball = new Ball(this.manager).init();
  }

  private initPaddles() {
    const w = this.manager.width;
    const h = this.manager.height;
    this.#p1 = new Paddle(this.manager).init(w / 6, h / 2 - 1);
    this.#p2 = new Paddle(this.manager).init(w / 6, -h / 2 + 1);
  }

  private initWalls() {
    const w = this.manager.width;
    const h = this.manager.height;
    const wallHeight = 1;
    const wallDepth = 0.1;

    const obstacleWallGeo = new THREE.BoxGeometry(h + wallDepth, wallHeight, wallDepth);
    const goalWallGeo = new THREE.BoxGeometry(w + wallDepth, wallHeight, wallDepth);

    const WL = new THREE.Mesh(obstacleWallGeo, this.#wallMaterial);
    WL.position.x = -w / 2 - wallDepth;
    WL.rotation.y = THREE.MathUtils.degToRad(-90);
    WL.geometry.computeBoundingBox();
    this.#wallLeft = new ObstacleWall(this.manager).init(WL);

    const WR = WL.clone();
    WR.position.x = w / 2 + wallDepth;
    WR.rotation.y = THREE.MathUtils.degToRad(90);
    WR.geometry.computeBoundingBox();
    this.#wallRight = new ObstacleWall(this.manager).init(WR);

    const WA = new THREE.Mesh(goalWallGeo, this.#wallMaterial);
    WA.position.z = -h / 2;
    WA.geometry.computeBoundingBox();
    this.#wallAfter = new GoalWall(this.manager).init(WA);
    this.#wallAfter.setting(true, this.context.PointManager);

    const WB = WA.clone();
    WB.position.z = h / 2;
    WB.geometry.computeBoundingBox();
    this.#wallBefore = new GoalWall(this.manager).init(WB);
    this.#wallBefore.setting(false, this.context.PointManager);
  }

  private initHitObjects() {
    this.#hitObjects = [
      this.#p1,
      this.#p2,
      this.#wallAfter,
      this.#wallBefore,
      this.#wallLeft,
      this.#wallRight
    ];
  }

  get ball() { return this.#ball; }
  get p1() { return this.#p1; }
  get p2() { return this.#p2; }
  get wallLeft() { return this.#wallLeft; }
  get wallRight() { return this.#wallRight; }
  get wallAfter() { return this.#wallAfter; }
  get wallBefore() { return this.#wallBefore; }
  get wallMat() { return this.#wallMaterial; }
  get hitObjects() { return this.#hitObjects; }
};

export class Ball {
  #mesh!: THREE.Mesh;
  #size: number = 1;
  #animation: boolean = false;

  #serveBeforePaddlePosition: THREE.Vector3 | null = null;
  #serveBeforeBallPosition: THREE.Vector3 | null = null;
  #servePaddleVelocity: THREE.Vector3 = new THREE.Vector3();
  #serveBallVelocity: THREE.Vector3 = new THREE.Vector3();

  constructor(private manager: GameManager) {}

  init(mat?: THREE.Material) {
    this.#mesh = new THREE.Mesh(
      new THREE.BoxGeometry(this.#size, this.#size, this.#size),
      mat ?? defMat.clone()
    );
    this.manager.initBall(this);
    return this;
  }

  add() {
    const frameVelocity = this.manager.velocity.clone().multiplyScalar(this.manager.deltaTime);
    this.#mesh.position.add(frameVelocity);
  }

  reset() {
    this.manager.speed = this.manager.defSpeed;
  }

  accele() {
    this.manager.speed += this.manager.acceleration;
    this.manager.velocity = this.manager.velocity.clone().normalize().multiplyScalar(this.manager.speed);
  }

  stop() {
    this.manager.velocity.set(0, 0, 0);
  }

  setPosition(position: THREE.Vector3) {
    this.#mesh.position.copy(position);
    this.mesh.updateMatrixWorld(false);
  }

  async animateServePosition(paddle: Paddle) {
    if (this.#animation) return;
    this.#animation = true;

    const speed = 20;
    const center = new THREE.Vector3();
    paddle.boundingBox.getCenter(center);
    center.add(paddle.mesh.position);

    await new Promise(resolve => {
      const targetZ = center.z - Math.sign(center.z) * 1.2;
      let time = performance.now();

      const move = (now: number) => {
        const deltaTime = (now - time) / 1000;
        time = now;

        const dz = targetZ - this.#mesh.position.z;
        const direction = Math.sign(dz);
        const step = direction * speed * deltaTime;

        if (Math.abs(dz) <= Math.abs(step)) {
          this.#mesh.position.z = targetZ;
          resolve(null);
        } else {
          this.#mesh.position.z += step;
          requestAnimationFrame(move);
        }
      };
      move(performance.now());
    });

    await new Promise(resolve => {
      const targetX = center.x;
      let time = performance.now();

      const move = (now: number) => {
        const deltaTime = (now - time) / 1000;
        time = now;

        const dx = targetX - this.#mesh.position.x;
        const direction = Math.sign(dx);
        const step = direction * speed * deltaTime;

        if (Math.abs(dx) <= Math.abs(step)) {
          this.#mesh.position.x = targetX;
          resolve(null);
        } else {
          this.#mesh.position.x += step;
          requestAnimationFrame(move);
        }
      };
      move(performance.now());
    });
    this.#animation = false;
  }

  changeServePosition(paddle: Paddle) {
    if (this.#serveBeforePaddlePosition === null || this.#serveBeforeBallPosition === null) {
      this.#serveBeforePaddlePosition = paddle.mesh.position.clone();
      this.#serveBeforeBallPosition = this.#mesh.position.clone();
      return;
    }
    this.#servePaddleVelocity.subVectors(paddle.mesh.position.clone(), this.#serveBeforePaddlePosition).divideScalar(this.manager.deltaTime);
    this.#serveBallVelocity.subVectors(this.#mesh.position.clone(), this.#serveBeforeBallPosition).divideScalar(this.manager.deltaTime);
    this.#serveBeforePaddlePosition.copy(paddle.mesh.position);
    this.#serveBeforeBallPosition.copy(this.#mesh.position);

    const friction = 0.965;

    if (this.#servePaddleVelocity.x !== this.#serveBallVelocity.x) {
      this.#serveBallVelocity.multiplyScalar(friction);
      if (this.#serveBallVelocity.lengthSq() < 0.0001) this.#serveBallVelocity.set(0, 0, 0);
      this.#mesh.position.x += this.#serveBallVelocity.x * this.manager.deltaTime;
      this.#mesh.position.x = THREE.MathUtils.clamp(this.#mesh.position.x, -this.manager.width / 2 + 0.8, this.manager.width / 2 - 0.8); // 横に飛び出し防止
    }

    const halfBall = this.#size / 2;
    const box = paddle.boundingBox;
    this.#mesh.position.x = THREE.MathUtils.clamp(this.#mesh.position.x, box.min.x + paddle.position.x + halfBall, box.max.x + paddle.position.x - halfBall);
  }

  resetServePosition() {
    this.#serveBeforePaddlePosition = null;
    this.#serveBeforeBallPosition = null;
  }

  changeMat(mat: THREE.Material) {
    this.#mesh.material = mat;
    this.#mesh.material.needsUpdate;
  }

  getOffsets() {
    const halfSize = this.#size / 2;
    return [
      new THREE.Vector3(halfSize, 0, halfSize),
      new THREE.Vector3(-halfSize, 0, halfSize),
      new THREE.Vector3(halfSize, 0, -halfSize),
      new THREE.Vector3(-halfSize, 0, -halfSize),
    ];
  }

  get mesh() { return this.#mesh; }
  get position() { return this.#mesh.position; }
}

export abstract class HitObject {
  abstract onHit(ray: THREE.Raycaster): void;
  // abstract effect(hit: Hit): void;
  abstract get mesh(): THREE.Mesh;
}

export class Paddle extends HitObject{
  #mesh!: THREE.Mesh;
  #paddleWidth!: number;
  #paddleSize: number = 1;

  #boundingBox!: THREE.Box3;

  #forEffect!: THREE.Mesh;
  #effect!: Effect;
  #noEffect: boolean = false;

  constructor(private manager: GameManager) {
    super();
  }

  init(paddleWidth: number, positionZ: number, mat?: THREE.Material) {
    this.#paddleWidth = paddleWidth;

    this.#mesh = new THREE.Mesh(
      new THREE.BoxGeometry(this.#paddleWidth, this.#paddleSize, this.#paddleSize),
      mat ?? defMat.clone()
    );
    this.#mesh.position.z = positionZ;
    this.#mesh.geometry.computeBoundingBox();
    this.#boundingBox = this.#mesh.geometry.boundingBox!;

    return this;
  }

  initEffect(effect: Effect, mesh: THREE.Mesh) {
    this.#effect = effect;
    this.#forEffect = mesh;
  }

  move(x: number) {
    this.#mesh.position.x += denormalize(x, -this.manager.width/2, this.manager.width/2);
    this.#mesh.position.x = THREE.MathUtils.clamp(
      this.#mesh.position.x,
      -this.manager.width/2 + this.halfX(),
      this.manager.width/2 - this.halfX()
    );
  }

  refectPaddle() {
    const normalized = THREE.MathUtils.clamp( (this.manager.ball.position.x - this.mesh.position.x) / this.halfX(), -1, 1 );
    const maxAngle = Math.PI / 3;
    const angle = normalized * maxAngle;
    const dz = this.mesh.position.z > 0 ? -1 : 1;

    this.manager.velocity.set(
      this.manager.speed * Math.sin(angle),
      0,
      dz * this.manager.speed * Math.cos(angle)
    );

    if (Math.abs(this.manager.velocity.z) < 0.01) {
      this.manager.velocity.z = dz * 0.1;
      this.manager.velocity.normalize().multiplyScalar(this.manager.speed);
    }
  }

  override onHit(ray: THREE.Raycaster) {
    const hit = isHit(ray, this.#mesh);
    if (!hit) return;

    if (Math.abs(hit.normal.z) > 0.9) {
      this.refectPaddle();
    } else {
      this.#noEffect = true;
      this.manager.velocity.reflect(hit.normal);
    }

    if (this.manager.gameStatus === GameStatus.Playing) this.manager.ball.accele();

    return hit;
  }

  effect(hit: Hit): void {
    if (this.#noEffect) {
      this.#noEffect = false;
      return;
    }
    const hitPoint = hit.hitPoint.clone();
    hitPoint.z = this.#forEffect.position.z;
    this.#effect.stretchEffect(hitPoint, hit.normal, this.#forEffect);
  }

  changeMat(mat: THREE.Material) {
    this.#mesh.material = mat;
    this.#mesh.material.needsUpdate;
  }

  halfX() { return (this.#boundingBox.max.x - this.#boundingBox.min.x) / 2; }

  get mesh() { return this.#mesh; }
  get position() {return this.#mesh.position; }
  get boundingBox() { return this.#boundingBox; }
};

export class ObstacleWall extends HitObject {
  #mesh!: THREE.Mesh;

  #forEffect!: THREE.Mesh;
  #effect!: Effect;


  constructor(private manager: GameManager) { super(); }

  init(mesh: THREE.Mesh) {
    this.#mesh = mesh;
    return this;
  }

  initEffect(effect: Effect, mesh: THREE.Mesh) {
    this.#effect = effect;
    this.#forEffect = mesh;
  }

  override onHit(ray: THREE.Raycaster) {
    const hit = isHit(ray, this.#mesh);
    if (!hit) return;

    this.manager.velocity.reflect(hit.normal);
    const offset = hit.normal.clone().multiplyScalar(0.25);
    this.manager.ball.position.add(offset);

    return hit;
  }

  effect(hit: Hit): void {
    this.#effect.stretchEffect(hit.hitPoint, hit.normal, this.#forEffect);
  }

  get mesh() { return this.#mesh; }
};

export class GoalWall extends HitObject {
  #mesh!: THREE.Mesh;

  private pointManager!: PointManager;
  #pointGet!: boolean;

  constructor(private manager: GameManager) {
    super();
  }

  init(mesh: THREE.Mesh) {
    this.#mesh = mesh;
    return this;
  }

  setting(pointGet: boolean, pointManager: PointManager) {
    this.#pointGet = pointGet;
    this.pointManager = pointManager;
  }

  override onHit(ray: THREE.Raycaster) {
    const hit = isHit(ray, this.#mesh);
    if (!hit) return;

    this.manager.ball.stop();
    this.manager.ball.reset();
    this.manager.gameStatus = GameStatus.GetPoint;
    this.pointManager.pointGet(this.#pointGet);
    // console.log(this.pointManager.p1.point, this.pointManager.p2.point)

    return hit;
  }

  get mesh() { return this.#mesh; }
};