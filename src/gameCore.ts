import { THREE } from './ThreeModule';

export enum GameMode {
  Selecting,
  Single,
  Duo,
  Multi
};

export enum GameStatus {
  First,
  Serving,
  Playing,
  GetPoint,
  Pause,
  End
};

export enum ServiceStatus {
  Pending,
  Running,
  Done
};

export type ControlSetting = {
  L: string,
  R: string,
  U: string,
  D: string
};

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
};

export class GameContext {
  #mm: ModeManager = new ModeManager();
  #us: UserSetting = new UserSetting();
  #gm: GameManager = new GameManager();
  #sm: ServiceManager = new ServiceManager();

  constructor() {}

  get ModeManager() { return this.#mm; }
  get UserSetting() { return this.#us; }
  get GameManager() { return this.#gm; }
  get ServiceManager() { return this.#sm; }
}

export class ModeManager {
  #mode = GameMode.Selecting;

  constructor() {}

  setMode(m: GameMode) {
    switch (m) {
      case GameMode.Selecting:
        // メニュー表示
        break;
      case GameMode.Single:
        // シングルモード
        break;
      case GameMode.Duo:
        // デュオモード
        break;
      case GameMode.Multi:
        // マルチモード
        break;
    }
  }

  get mode():GameMode { return this.#mode; }
};

export class UserSetting {
  #speed: number = 15;

  #control: ControlSetting = {
    L: 'KeyA',
    R: 'KeyD',
    U: 'KeyW',
    D: 'KeyS'
  };

  setControl(op: Partial<ControlSetting>) {
    if (Object.keys(op).length === 0) return;
    Object.keys(op).forEach(key => {
      const k = key as keyof ControlSetting;
      this.#control[k] = op[k]!;
    });
  }

  get control() { return this.#control; }
  get speed() { return this.#speed; }
};

export class GameManager {
  #clock: THREE.Clock = new THREE.Clock;
  #deltaTime: number = this.#clock.getDelta();

  gameStatus: GameStatus = GameStatus.First;

  #height: number = 28;
  #width: number = this.#height / 5 * 4;

  #ball!: THREE.Mesh;

  #defBallSpeed = 25;
  #ballSpeed: number = this.#defBallSpeed;
  #ballVelocity: THREE.Vector3 = new THREE.Vector3(0.1, 0, 0.1).normalize().multiplyScalar(this.#ballSpeed);
  #acceleration: number = 0.2;

  #effect: boolean = true;

  constructor() {}

  accele() {
    this.#ballSpeed += this.#acceleration;
    this.#ballVelocity = this.#ballVelocity.clone().normalize().multiplyScalar(this.#ballSpeed);
  }

  get clock() { return this.#clock; }

  get deltaTime(): number { return this.#deltaTime; }
  set deltaTime(value: number) { this.#deltaTime = value; }

  get width() { return this.#width; }

  get height() { return this.#height; }

  get ball() { return this.#ball; }
  set ball(value: THREE.Mesh) { this.#ball = value; }

  get speed() { return this.#ballSpeed }
  set speed(value: number) {
    if (value < 0) throw new Error('Don\'t set negative value');
    this.#ballSpeed = value;
  }

  get velocity() { return this.#ballVelocity; }
  set velocity(value: THREE.Vector3) { this.#ballVelocity = value.clone(); }

  get effect() { return this.#effect; }
  set effect(value: boolean) { this.#effect = value; }
};

export class ServiceManager {
  serviceStatus: ServiceStatus = ServiceStatus.Pending;
}

export class UserManager {
  // ユーザ名など　検討中
  #name: string = 'Guest';
  #id: string | null = null; // multi用
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

  constructor(private manager: GameManager) {
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

    const obstacleWallGeo = new THREE.BoxGeometry(h - wallDepth, wallHeight, wallDepth);
    const goalWallGeo = new THREE.BoxGeometry(w - wallDepth, wallHeight, wallDepth);

    const WL = new THREE.Mesh(obstacleWallGeo, this.#wallMaterial);
    WL.position.x = -w / 2;
    WL.rotation.y = THREE.MathUtils.degToRad(-90);
    this.#wallLeft = new ObstacleWall(this.manager).init(WL);

    const WR = WL.clone();
    WR.position.x = w / 2;
    WR.rotation.y = THREE.MathUtils.degToRad(90);
    this.#wallRight = new ObstacleWall(this.manager).init(WR);

    const WA = new THREE.Mesh(goalWallGeo, this.#wallMaterial);
    WA.position.z = -h / 2;
    this.#wallAfter = new GoalWall(this.manager).init(WA);

    const WB = WA.clone();
    WB.position.z = h / 2;
    this.#wallBefore = new GoalWall(this.manager).init(WB);
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

  constructor(private manager: GameManager) {}

  init(mat?: THREE.Material) {
    this.manager.ball = this.#mesh = new THREE.Mesh(
      new THREE.BoxGeometry(this.#size, this.#size, this.#size),
      mat ?? defMat.clone()
    );
    return this;
  }

  add() {
    const frameVelocity = this.manager.velocity.clone().multiplyScalar(this.manager.deltaTime);
    this.#mesh.position.add(frameVelocity);
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
  abstract get mesh(): THREE.Mesh;
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
    const dz = -Math.sign(this.manager.velocity.z);

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

    Math.abs(hit.normal.z) > 0.9
      ? this.refectPaddle()
      : this.manager.velocity.reflect(hit.normal);

    if (this.manager.gameStatus === GameStatus.Playing) this.manager.accele();

    return hit;
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

  constructor(private manager: GameManager) {
    super();
  }

  init(mesh: THREE.Mesh,) {
    this.#mesh = mesh;
    return this;
  }

  override onHit(ray: THREE.Raycaster) {
    const hit = isHit(ray, this.#mesh);
    if (!hit) return;

    this.manager.velocity.reflect(hit.normal);
    const offset = hit.normal.clone().multiplyScalar(0.5);
    this.manager.ball.position.add(offset);

    return hit;
  }

  get mesh() { return this.#mesh; }
};

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
    const hit = isHit(ray, this.#mesh);
    if (!hit) return;

    this.manager.velocity.reflect(hit.normal);
    const offset = hit.normal.clone().multiplyScalar(0.5);
    this.manager.ball.position.add(offset);

    return hit;
  }

  get mesh() { return this.#mesh; }
};

export class Controller {
  #keyPress: Record<string, boolean> = {};

  constructor(private context: GameContext) {
    this.init();
  }

  init() {
    document.addEventListener('keydown', e => this.#keyPress[e.code] = true);
    document.addEventListener('keyup', e => this.#keyPress[e.code] = false);
  }

  control(paddle: Paddle) {
    const max = this.context.GameManager.width / 2;
    const min = -this.context.GameManager.width / 2;
    const setting = this.context.UserSetting;
    if (this.#keyPress[setting.control.L]) {
      const speed = normalize(-setting.speed * this.context.GameManager.deltaTime, min, max);
      paddle.move(speed);
    }
    if (this.#keyPress[setting.control.R]) {
      const speed = normalize(setting.speed * this.context.GameManager.deltaTime, min, max);
      paddle.move(speed);
    }
  }
};

export class Cpu {
  
};