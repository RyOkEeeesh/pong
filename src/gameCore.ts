import { THREE } from './module';

export enum GameMode {
  Selecting,
  Single,
  Duo,
  Multi
}

export function normalize(val: number, min: number, max: number) {
  if (min === max) return null;
  return (val - min) / (max - min);
}

export function  denormalize(val: number, min: number, max: number) {
  return val * (max - min) + min;
}

export function isHit(ray: THREE.Raycaster, obj: THREE.Mesh) {
  const intersects = ray.intersectObject(obj, true);
  if (intersects.length > 0) {
    const normal = intersects[0].face?.normal.clone();
    if (normal) return {
      normal: normal.transformDirection(obj.matrixWorld),
      hitPoint: intersects[0].point.clone()
    };
  }
  return;
}

export class GameManager {
  #clock: THREE.Clock = new THREE.Clock;
  #deltaTime: number = this.#clock.getDelta();

  #width!: number;
  #height!: number;

  #ball!: THREE.Mesh;
  #ballSpeed!: number;
  #ballVelocity!: THREE.Vector3;

  constructor(management: {
    w: number,
    h: number
  }) {
    this.#width = management.w;
    this.#height = management.h;
  }

  get clock() {
    return this.#clock;
  }

  get deltaTime() {
    return this.#deltaTime;
  }
  set deltaTime(value: number) {
    this.#deltaTime = value;
  }

  get width() {
    return this.#width;
  }

  get height() {
    return this.#height;
  }

  get ball() {
    return this.#ball;
  }
  set ball(value: THREE.Mesh) {
    this.#ball = value;
  }

  get speed() {
    return this.#ballSpeed
  }
  set speed(value: number) {
    if (value < 0) throw new Error('Don\' set negative value');
    this.#ballSpeed = value;
  }

  get velocity() {
    return this.#ballVelocity;
  }
  set velocity(value: THREE.Vector3) {
    if (!this.#ballVelocity) {
      this.#ballVelocity = value.clone();
    } else {
      this.#ballVelocity.set(value.x, value.y, value.z);
    }
  }
}

export class Stage {
  #hitObjects: THREE.Mesh[] = [];

  #wallMaterial!: THREE.MeshStandardMaterial;
  #wallLeft!: ObstacleWall;
  #wallRight!: ObstacleWall;
  #wallBefore!: GoalWall;
  #wallAfter!: GoalWall;

  #ball!: Ball;

  #my!: Paddle;
  #enemy!: Paddle;

  constructor(private manager: GameManager) {
    this.init();
  }

  init() {
    const w = this.manager.width;
    const h = this.manager.height;

    const wallHeight = 1;
    const wallDepth = 0.1;

    const obstacleWallGeo = new THREE.BoxGeometry(h - wallDepth, wallHeight, wallDepth);
    const goalWallGeo = new THREE.BoxGeometry(w - wallDepth, wallHeight, wallDepth);
    this.#wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.25,
      metalness: 0,
      roughness: 0
    });

    this.#ball = new Ball(this.manager).init();
    this.#my = new Paddle(this.manager).init(w/6, h/2 - 1);
    this.#enemy = new Paddle(this.manager).init(w/6, -h/2 + 1);

    const WL = new THREE.Mesh(
      obstacleWallGeo,
      this.#wallMaterial
    );
    WL.position.x = -w / 2;
    WL.rotation.y = THREE.MathUtils.degToRad(-90);

    this.#wallLeft = new ObstacleWall(this.manager).init(WL);

    const WR = WL.clone();
    WR.position.x = w / 2;
    WR.rotation.y = THREE.MathUtils.degToRad(90);

    this.#wallRight = new ObstacleWall(this.manager).init(WR);

    const WA = new THREE.Mesh(
      goalWallGeo,
      this.#wallMaterial
    );
    WA.position.z = -h / 2;

    this.#wallAfter = new GoalWall(this.manager).init(WA);

    const WB = WA.clone();
    WB.position.z = h / 2;

    this.#wallBefore = new GoalWall(this.manager).init(WB);

    this.#hitObjects = [ this.#my.mesh, this.#enemy.mesh, this.#wallAfter.mesh, this.#wallBefore.mesh, this.#wallLeft.mesh, this.#wallRight.mesh ];

  }

  get ball() {
    return this.#ball;
  }

  get my() {
    return this.#my;
  }

  get enemy() {
    return this.#enemy;
  }

  get wallLeft() {
    return this.#wallLeft;
  }

  get wallRight() {
    return this.#wallRight;
  }

  get wallAfter() {
    return this.#wallAfter;
  }

  get wallBefore() {
    return this.#wallBefore;
  }

  get wallMat() {
    return this.#wallMaterial;
  }

  get hitObjects() {
    return this.#hitObjects;
  }
}

export class Ball {
  #mesh!: THREE.Mesh;
  #size: number = 1;

  constructor(private manager: GameManager) {}

  init(mat?: THREE.Material) {
    this.manager.ball = this.#mesh = new THREE.Mesh(
      new THREE.BoxGeometry(this.#size, this.#size, this.#size),
      mat ?? new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.25,
      metalness: 0,
      roughness: 0
      })
    );
    return this;
  }

  add() {
    this.#mesh.position.add(this.manager.velocity);
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

  get mesh() {
    return this.#mesh;
  }
}

export abstract class HitObject {
  abstract onHit(ray: THREE.Raycaster): void;
}

export class Paddle extends HitObject{
  #mesh!: THREE.Mesh;
  #paddleWidth!: number;
  #paddleSize: number = 1;

  #boundingBox!: THREE.Box3;

  constructor(private manager: GameManager) {
    super();
  }

  init(paddleWidth: number,positionZ: number, mat?: THREE.Material) {
    this.#paddleWidth = paddleWidth;

    this.#mesh = new THREE.Mesh(
      new THREE.BoxGeometry(this.#paddleWidth, this.#paddleSize, this.#paddleSize),
      mat ?? new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.25,
        metalness: 0,
        roughness: 0
      })
    );
    this.#mesh.position.z = positionZ;
    this.#mesh.geometry.computeBoundingBox();
    this.#boundingBox = this.#mesh.geometry.boundingBox!;

    return this;
  }

  move(x: number) {
    this.#mesh.position.x += denormalize(x, -this.manager.width/2, this.manager.width/2);
    this.#mesh.position.x = THREE.MathUtils.clamp(
      this.#mesh.position.x,
      -this.manager.width/2 + this.#paddleWidth/2,
      this.manager.width/2 - this.#paddleWidth/2
    );
  }

  override onHit() {
    // TODO
  }

  changeMat(mat: THREE.Material) {
    this.#mesh.material = mat;
    this.#mesh.material.needsUpdate;
  }

  get mesh() {
    return this.#mesh;
  }

  get boundingBox() {
    return this.#boundingBox;
  }
}

export class ObstacleWall extends HitObject {
  #mesh!: THREE.Mesh;

  constructor(private manager: GameManager) {
    super();
  }

  init(mesh: THREE.Mesh,) {
    this.#mesh = mesh;
    return this;
  }

  override onHit(ray: THREE.Raycaster) {
    // TODO
  }

  get mesh() {
    return this.#mesh;
  }
}

export class GoalWall extends HitObject {
  #mesh!: THREE.Mesh;

  constructor(private manager: GameManager) {
    super();
  }

  init(mesh: THREE.Mesh,) {
    this.#mesh = mesh;
    return this;
  }

  override onHit(ray: THREE.Raycaster) {
    // TODO
  }

  get mesh() {
    return this.#mesh;
  }
}

export class Controls {

}

export class Cpu {
  
}