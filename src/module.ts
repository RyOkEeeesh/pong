import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import type { MeshStandardMaterialParameters } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

export type Vector3Like = {
  x: number;
  y: number;
  z: number;
};

export type Callback = (() => void) | null;

export type AppSetting = Partial<{
  add: 	HTMLDivElement,
  scene: THREE.Scene,
  backgroundColor: number,
  camera: THREE.PerspectiveCamera,
  cameraPosition: Partial<Vector3Like>,
  renderer: THREE.WebGLRenderer,
  composer: boolean,
  ambientLight: boolean,
  controls: boolean,
  controlArea: HTMLDivElement,
}>

export const ToneMappingTypes = {
  None: THREE.NoToneMapping,
  Linear: THREE.LinearToneMapping,
  Reinhard: THREE.ReinhardToneMapping,
  Cineon: THREE.CineonToneMapping,
  ACESFilmic: THREE.ACESFilmicToneMapping
} as const;

export type ToneMappingKey = keyof typeof ToneMappingTypes;

type GeoOp = {
  font: Font; // 必須
  size?: number;
  depth?: number;
  curveSegments?: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
};

export type FontOp = Partial<{
  fontURL: string,
  lineHeight: number,
  geometryOption: Partial<GeoOp>,
  materialOption: Partial<MeshStandardMaterialParameters>
}>

export class App {

  #start: boolean = false;
  #stop: boolean = false;

  #beforeRenderCallbacks: Callback[] = [];
  #afterRenderCallbacks: Callback[] = [];
  #animationId: number | null = null;

  width: number;
  height: number;
  #scene!:THREE.Scene;
  #camera!: THREE.PerspectiveCamera;
  #controls: OrbitControls | null = null;
  #renderer!: THREE.WebGLRenderer;
  #ambientLight!: THREE.AmbientLight;
  #composer!: EffectComposer;

  constructor(option?: AppSetting) {
    const defOp = {
      add: undefined,
      scene: undefined,
      backgroundColor: 0x000000,
      camera: undefined,
      renderer: undefined,
      composer: false,
      ambientLight: true,
      controls: false,
    }

    const op = Object.assign({}, defOp, option) as AppSetting;

    const isDiv = (e: any): e is HTMLDivElement => e instanceof HTMLElement;

    if (isDiv(op.add)) {
      this.width = op.add!.clientWidth;
      this.height = op.add!.clientHeight;
    } else {
      this.width = window.innerWidth;
      this.height = window.innerHeight
    }

    this.initScene({
      scene: op.scene,
      backgroundColor: op.backgroundColor ?? 0x000000
    });

    this.initCamera({
      camera: op.camera,
      position: op.cameraPosition
    });

    this.initRenderer({
      add: op.add,
      renderer: op.renderer
    });

    if (op.composer) this.initComposer();
    if (op.ambientLight)this.initLight();
    if (op.controls || op.controlArea) this.initControls(op.controlArea);
    this.draw = this.draw.bind(this);
  }

  initScene(op: {
    scene?: THREE.Scene | undefined,
    backgroundColor: number
  }) {
    const isScene = (e: any): e is THREE.Scene => e instanceof THREE.Scene;
    this.#scene = isScene(op.scene) ? op.scene : new THREE.Scene();
    this.#scene.background = new THREE.Color(op.backgroundColor);
  }

  addScene(...elements: THREE.Object3D[]) { elements.forEach(e => this.#scene.add(e)); }

  initCamera(op: Partial<{
    camera: THREE.PerspectiveCamera,
    position: Partial<Vector3Like>
  }> = {}) {
    const isCamera = (e: any): e is THREE.Camera => e instanceof THREE.PerspectiveCamera;
    const position = Object.assign({}, { x: 0, y: 0, z: 5 }, op.position);
    this.#camera = isCamera(op.camera) ? op.camera : new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.#camera.position.set(position.x, position.y, position.z);
    this.addScene(this.#camera);
  }

  initRenderer(op: {
    add: HTMLDivElement | undefined,
    renderer: THREE.WebGLRenderer | undefined
  }) {

    const addDocument = op.add || document.body;

    const isRenderer = (e: any): e is THREE.WebGLRenderer => e instanceof THREE.WebGLRenderer;

    this.#renderer = isRenderer(op.renderer) ? op.renderer : new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true
    });
    this.#renderer.setSize(this.width, this.height);
    this.#renderer.setPixelRatio(window.devicePixelRatio);
    addDocument.appendChild(this.#renderer.domElement);

    if (op.add) {
      const resizeObserver = new ResizeObserver(() => {
        this.width = op.add!.clientWidth;
        this.height = op.add!.clientHeight;
        this.update();
      });
      resizeObserver.observe(op.add);
    } else {
      window.addEventListener('resize', () => {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.update();
      });
    }
  }

  initComposer() {
    this.#composer = new EffectComposer(this.#renderer);
    this.#composer.addPass(new RenderPass(this.#scene, this.#camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      1, // 強さ
      0.5, // 半径
      0.6 // しきい値
    );
    this.#composer.addPass(bloomPass);
  }

  initControls(controlArea?: HTMLDivElement) {
    this.#controls = new OrbitControls(this.#camera, controlArea ?? this.#renderer.domElement);
    this.#controls.enableDamping = true;
    this.#controls.dampingFactor = 0.2;
  }

  initLight() {
    this.#ambientLight = new THREE.AmbientLight(0xffffff, 1);
    this.addScene(this.#ambientLight);
  }

  update() {
    this.#camera.aspect = this.width / this.height;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(this.width, this.height);
    this.#composer?.setSize(this.width, this.height);
  }

  removeFromScene(...objects: THREE.Object3D[]) {
    objects.forEach(obj => this.#scene.remove(obj));
  }

  onBeforeRender(callback: Callback) {
    if (callback) this.#beforeRenderCallbacks.push(callback);
  }

  onAfterRender(callback: Callback) {
    if (callback) this.#afterRenderCallbacks.push(callback);
  }

  setToneMapping(
    type: ToneMappingKey,
    exposure: number = 1.0
  ) {
    this.#renderer.toneMapping = ToneMappingTypes[type];;
    this.#renderer.toneMappingExposure = exposure;
  }

  draw() {
    if (!this.#start) return;

    this.#beforeRenderCallbacks.forEach(cb => cb?.());

    this.#controls?.update();
    this.#composer
      ? this.#composer.render()
      : this.#renderer.render(this.#scene, this.#camera);

    this.#afterRenderCallbacks.forEach(cb => cb?.());

    if (!this.#stop) this.#animationId = requestAnimationFrame(this.draw);
  }

  start() {
    this.#start = true;
    this.#stop = false;
    this.draw();
  }

  stop() {
    this.#start = false;
    this.#stop = true;
    if (this.#animationId !== null) {
      cancelAnimationFrame(this.#animationId);
      this.#animationId = null;
    }
  }

  get camera(): THREE.PerspectiveCamera {
    return this.#camera;
  }

  get scene(): THREE.Scene {
    return this.#scene;
  }

  get renderer(): THREE.WebGLRenderer {
    return this.#renderer;
  }

  get composer(): EffectComposer | undefined {
    return this.#composer;
  }

  get controls(): OrbitControls | null {
    return this.#controls;
  }

  get animationId(): number | null {
    return this.#animationId;
  }

}

export class txtMesh{
  #fontURL: string;
  #fontCache: Map<string, Font> = new Map();

  constructor(urls?: string[]) {
    this.#fontURL = './font/Jersey15_Regular.json';
    this.fontLoader();
    urls?.forEach(url => this.fontLoader(url));
  }

  async fontLoader(font?: string): Promise<Font> {
    const fontURL = font ?? this.#fontURL;

    if (this.#fontCache.has(fontURL)) return this.#fontCache.get(fontURL)!;

    const fontLoader = new FontLoader();
    const loadedFont = await new Promise<Font>((resolve, reject) =>
      fontLoader.load(fontURL, resolve, undefined, reject)
    );

    this.#fontCache.set(fontURL, loadedFont);
    return loadedFont;
  }

  async loadFontText(text: string, option: FontOp ) {
    const font = await this.fontLoader(option?.fontURL);

    const defaultGeoOp: GeoOp = {
      font,
      size: 1,
      depth: 0,
      curveSegments: 1,
      bevelEnabled: false,
    }

    const defaultMatOp: MeshStandardMaterialParameters = {
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.8, // 自発光の強さ
      metalness: 0.3, // 金属っぽさ
      roughness: 0.2 // 表面の粗さ
    }

    const geoOp = Object.assign({}, defaultGeoOp, option?.geometryOption);
    const matOp = Object.assign({}, defaultMatOp, option?.materialOption);

    const geometry = new TextGeometry(text, geoOp);
    geometry.center();
    const material = new THREE.MeshStandardMaterial(matOp);

    return new THREE.Mesh(geometry, material);
  }

  async loadMultilineText(text: string, option: FontOp) {
    const lines = text.split('\n');
    const group = new THREE.Group();

    for (let i = 0; i < lines.length; i++) {
      const mesh = await this.loadFontText(lines[i], option);
      mesh.position.y = -i * (option?.lineHeight ?? 1.2);
      group.add(mesh);
    }

    return group;
  }

  clearFontCache() {
    this.#fontCache.clear();
  }

  async updateText(group: THREE.Group, newText: string, option: FontOp) {
    const newGroup = await this.loadMultilineText(newText, option);
    group.clear();
    newGroup.children.forEach(child => group.add(child.clone()));
  }

}

export class UserSetting {

}

export class Game extends App{

  wallLeft!: THREE.Mesh;
  wallRight!: THREE.Mesh;
  wallBefore!: THREE.Mesh;
  wallAfter!: THREE.Mesh;

  ballSize: number = 1;
  ball!: THREE.Mesh;
  defBallSpeed = 20;
  ballSpeed: number = this.defBallSpeed;
  ballVelocity!: THREE.Vector3;
  acceleration: number = 0.2;

  stageHeight: number = 28;
  stageWidth: number = this.stageHeight / 4 * 3;
  paddleWidth: number = this.stageWidth / 5;

  myPaddle!: THREE.Mesh;
  enemyPaddle!: THREE.Mesh;

  clock: THREE.Clock = new THREE.Clock();
  deltaTime! :number;

  // パドル移動を受け付ける
  acceptingInputPaddle: boolean = false;

  pointStatus: {
    myPoint: number,
    enemyPoint: number,
    pointGetter: boolean | null, // true: me, false: enemy
    getPoint: boolean,
    max: number,
    deuce: boolean
  } = {
    myPoint: 0,
    enemyPoint: 0,
    getPoint: false,
    pointGetter: null,
    max: 10,
    deuce: false
  }

  serveStartTime: number = 0;
  isServing: boolean = false;
  serveReady: boolean = false;


  #AIStatus: {
    speed: number,
    missChance: number,
    precision: number,
    predictedTargetX: number | null
  } = {
    speed: 0,
    missChance: 0,
    precision: 0,
    predictedTargetX: null
  }

  keyPress: Record<string, boolean> = {};

  constructor(option?: AppSetting) {
    super(option)
    this.ballVelocity = TC.vec3({x: 0.1, z: 0.1}).normalize().multiplyScalar(this.ballSpeed);
    this.initStage();
    this.initUserControl();
    this.initAI('hard');
    this.rendering();
    this.acceptingInputPaddle = true; // 後で変更
  }

  initStage() {
    THREE.Mesh.prototype.raycast = acceleratedRaycast;

    const returnMesh = (geo: THREE.BoxGeometry, mat: THREE.Material) => new THREE.Mesh(geo, mat);

    const boxHeight = 1;
    const boxDepth = 0.1;
    
    const sideWallGeo = new THREE.BoxGeometry(this.stageHeight - boxDepth, boxHeight, boxDepth);
    const ABWallGeo = new THREE.BoxGeometry(this.stageWidth + boxDepth, boxHeight, boxDepth);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.25, // 自発光の強さ
      metalness: 0, // 金属っぽさ
      roughness: 0 // 表面の粗さ
    });
    
    this.wallLeft = returnMesh(sideWallGeo, material);
    TC.changePosition(this.wallLeft, { x: -this.stageWidth / 2 });
    TC.changeRotation(this.wallLeft, { y: TC.toRad(-90) });
    
    this.wallRight = returnMesh(sideWallGeo, material);
    TC.changePosition(this.wallRight, { x: this.stageWidth / 2 });
    TC.changeRotation(this.wallRight, { y: TC.toRad(90) });
    
    this.wallBefore = returnMesh(ABWallGeo, material);
    TC.changePosition(this.wallBefore, { z: this.stageHeight / 2 });
    
    this.wallAfter = returnMesh(ABWallGeo, material);
    TC.changePosition(this.wallAfter, { z: -this.stageHeight / 2 });
    
    const walls = [this.wallLeft, this.wallRight, this.wallBefore, this.wallAfter];
    walls.forEach(wall => wall.geometry.boundsTree = new MeshBVH(wall.geometry));
    
    super.addScene(...walls);

    const paddleGeo = new THREE.BoxGeometry(this.paddleWidth, 1, 1);

    this.myPaddle = returnMesh(paddleGeo, material);
    this.myPaddle.geometry.boundsTree = new MeshBVH(this.myPaddle.geometry);
    TC.changePosition(this.myPaddle, { z: this.stageHeight / 2 - 1 });
    this.myPaddle.geometry.computeBoundingBox();

    this.enemyPaddle = returnMesh(paddleGeo, material);
    this.enemyPaddle.geometry.boundsTree = new MeshBVH(this.enemyPaddle.geometry);
    TC.changePosition(this.enemyPaddle, { z: -this.stageHeight / 2 + 1 });
    this.enemyPaddle.geometry.computeBoundingBox();

    super.addScene(this.myPaddle, this.enemyPaddle);

    this.ball = returnMesh(new THREE.BoxGeometry(this.ballSize, this.ballSize, this.ballSize), material);
    this.ball.position.set(0, 0, 0);
    super.addScene(this.ball);
  }

  initUserControl() {
    window.addEventListener('keydown', e => this.keyPress[e.code] = true);
    window.addEventListener('keyup', e => this.keyPress[e.code] = false);
  }

  paddleMove(target: boolean) {
    if (!this.acceptingInputPaddle) return;
    const speed = 15 * this.deltaTime;
    const paddle = target ? this.myPaddle : this.enemyPaddle;

    if (this.keyPress['KeyA']) {
      paddle.position.x -= speed;
    }
    if (this.keyPress['KeyD']) {
      paddle.position.x += speed;
    }

    if (paddle.geometry.boundingBox) {
      const halfWidth = this.stageWidth / 2;
      const paddleHalfSize = this.paddleWidth / 2;

      paddle.position.x = THREE.MathUtils.clamp(
        paddle.position.x,
        -halfWidth + paddleHalfSize,
        halfWidth - paddleHalfSize
      );
    }
  }

  refectPaddle(raycaster: THREE.Raycaster, serve: boolean = false) {

    if (serve) {
      if (this.pointStatus.pointGetter) { // 敵サーブ
        

      }
    }

    const paddles = [ this.myPaddle, this.enemyPaddle ];
    let reflection: boolean = false;

    for (const paddle of paddles) {
      const intersects = raycaster.intersectObject(paddle, true);
      if (intersects.length > 0) {
        const normal = intersects[0].face?.normal.clone();
        if (normal) {

          normal.transformDirection(paddle.matrixWorld);

          if (Math.abs(normal.z) > 0.9) {

            const hitPoint = intersects[0].point.clone();
            const localHitPoint = paddle.worldToLocal(hitPoint);
            const geometry = paddle.geometry;

            if (!geometry.boundingBox) {
              this.ballVelocity.reflect(normal);
              reflection = true;
              break;
            }

            const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
            const halfWidth = (width * paddle.scale.x) / 2;

            const normalized = THREE.MathUtils.clamp(localHitPoint.x / halfWidth, -1, 1);

            const maxAngle = Math.PI / 3; // 60度
            const angle = normalized * maxAngle;

            const speed = this.ballSpeed;
            const directionZ = this.ball.position.z < paddle.position.z ? -1 : 1;

            this.ballVelocity.set(
              speed * Math.sin(angle),
              0,
              directionZ * speed * Math.cos(angle)
            );

            if (Math.abs(this.ballVelocity.z) < 0.01) {
              this.ballVelocity.z = directionZ * 0.1;
              this.ballVelocity.normalize().multiplyScalar(this.ballSpeed);
            }

            const offset = normal.clone().multiplyScalar(0.01);
            this.ball.position.add(offset);

            hitPoint.x = this.ball.position.x;

            if (directionZ === -1) {
              hitPoint.z = this.wallBefore.position.z;
              this.createStretchEffect(hitPoint, normal.clone(), this.wallBefore);
            } else {
              hitPoint.z = this.wallAfter.position.z;
              this.createStretchEffect(hitPoint, normal.clone(), this.wallAfter);
            }

          } else {
            this.ballVelocity.reflect(normal);
          }

          this.ballSpeed += this.acceleration;
          reflection = true;
          break;
        }
      }
    }
    return reflection;
  }

  refectWall(raycaster: THREE.Raycaster) {
    const reflectWalls = [ this.wallLeft, this.wallRight ];
    let reflection = false;

    for (const reflectWall of reflectWalls) {
      const intersects = raycaster.intersectObject(reflectWall, true);
      if (intersects.length > 0) {
        const normal = intersects[0].face?.normal.clone();
        if (normal) {
          normal.transformDirection(reflectWall.matrixWorld);

          this.ballVelocity.reflect(normal);

          const offset = normal.clone().multiplyScalar(0.1);
          this.ball.position.add(offset);

          this.createStretchEffect(intersects[0].point.clone(), normal.clone(), reflectWall);

          reflection = true;
          break;
        }
      }
    }
    return reflection;
  }

  pointWall(raycaster: THREE.Raycaster) {
    this.pointStatus.getPoint = false;
    if (raycaster.intersectObject(this.wallBefore, true).length > 0) {
      this.acceptingInputPaddle = false;
      this.pointStatus.enemyPoint++;
      this.pointStatus.pointGetter = false;
      this.pointStatus.getPoint = true;
    } else if (raycaster.intersectObject(this.wallAfter, true).length > 0) {
      this.acceptingInputPaddle = false;
      this.pointStatus.myPoint++;
      this.pointStatus.pointGetter = true;
      this.pointStatus.getPoint = true;
    }
    return this.pointStatus.getPoint;
  }

  isServe() {
    if (this.isServing && this.serveReady) {
      const paddle = this.pointStatus.pointGetter ? this.enemyPaddle : this.myPaddle;
      this.updateServeBall(paddle);

      const elapsed = this.clock.getElapsedTime() - this.serveStartTime;
      if (this.keyPress['Space'] || elapsed > 10) {
        this.isServing = false;
        this.serveReady = false;
        const raycaster = new THREE.Raycaster(
          this.ball.position,
          this.ballVelocity.clone().normalize(),
          0,
          this.ballSpeed * this.deltaTime
        );
        this.refectPaddle(raycaster, true);
      }
    }
  }

  async serve() {
    this.isServing = true;
    this.acceptingInputPaddle = false;
    this.serveReady = false;

    await this.animateServePosition(); // 1秒で移動

    this.acceptingInputPaddle = true;
    this.serveStartTime = this.clock.getElapsedTime();
    this.serveReady = true;
  }

  private isAnimatingServe: boolean = false;

  async animateServePosition() {
    if (this.isAnimatingServe) return; // すでに実行中ならスキップ
    this.isAnimatingServe = true;

    const paddle = this.pointStatus.pointGetter ? this.enemyPaddle : this.myPaddle;
    const direction = this.pointStatus.pointGetter ? 1 : -1;
    const targetZ = paddle.position.z + direction * 1.5;

    const initialZ = this.ball.position.z;
    const initialX = this.ball.position.x;
    const duration = 300;

    // Z軸移動
    await new Promise(resolve => {
      const clockZ = new THREE.Clock();
      const animateZ = () => {
        const elapsed = clockZ.getElapsedTime() * 1000;
        const t = Math.min(elapsed / duration, 1);
        this.ball.position.z = THREE.MathUtils.lerp(initialZ, targetZ, t);
        console.log('Z:', t);
        if (t < 1) {
          requestAnimationFrame(animateZ);
        } else {
          resolve(undefined);
        }
      };
      animateZ();
    });

    // X軸移動
    await new Promise(resolve => {
      const clockX = new THREE.Clock();
      const animateX = () => {
        const elapsed = clockX.getElapsedTime() * 1000;
        const t = Math.min(elapsed / duration, 1);
        this.ball.position.x = THREE.MathUtils.lerp(initialX, paddle.position.x, t);
        console.log('X:', t);
        if (t < 1) {
          requestAnimationFrame(animateX);
        } else {
          resolve(undefined);
        }
      };
      animateX();
    });

    this.isAnimatingServe = false;
  }



  updateServeBall(paddle: THREE.Mesh) {
    const paddleBox = paddle.geometry.boundingBox!;
    const halfWidth = (paddleBox.max.x - paddleBox.min.x) / 2 * paddle.scale.x;
    const leftEdge = paddle.position.x - halfWidth;
    const rightEdge = paddle.position.x + halfWidth;

    const ballX = this.ball.position.x;

    // ボールが端にいるか判定
    const isAtLeft = Math.abs(ballX - leftEdge) < 0.01;
    const isAtRight = Math.abs(ballX - rightEdge) < 0.01;

    if (isAtLeft || isAtRight) {
      // パドルと一緒に動かす
      this.ball.position.x = isAtLeft ? leftEdge : rightEdge;
    } else {
      // 範囲内でボールを左右に動かす（例：ゆっくり往復）
      const time = this.clock.getElapsedTime();
      const range = halfWidth - 0.1;
      this.ball.position.x = paddle.position.x + Math.sin(time * 2) * range;
    }

    // YとZはパドルに合わせる
    this.ball.position.z = paddle.position.z - 0.5;
  }



  reflector() {

    if (this.pointStatus.getPoint) {
      this.ballVelocity.set(0, 0, 0);
      this.serve();
      return;
    }

    if(!this.ballVelocity) throw new Error('Ball velocity is null');

    const frameVelocity = this.ballVelocity.clone().multiplyScalar(this.deltaTime);
    this.ball.position.add(frameVelocity);

    const halfSize = this.ballSize / 2;
    const offsets = [
      new THREE.Vector3(halfSize, 0, halfSize),
      new THREE.Vector3(-halfSize, 0, halfSize),
      new THREE.Vector3(halfSize, 0, -halfSize),
      new THREE.Vector3(-halfSize, 0, -halfSize),
      new THREE.Vector3(0, 0, 0)
    ];

    for (const offset of offsets) {
      const origin = this.ball.position.clone().add(offset);
      const raycaster = new THREE.Raycaster(
        origin,
        this.ballVelocity.clone().normalize(),
        0,
        frameVelocity.length() * 2
      );
      if (this.refectPaddle(raycaster) || this.refectWall(raycaster) || this.pointWall(raycaster)) {
        this.#AIStatus.predictedTargetX = null;
        break;
      }
    }

  }

  createStretchEffect(center: THREE.Vector3, wallNormal: THREE.Vector3, wall: THREE.Mesh) {
    const duration = 750;
    const width = 1;
    const height = 1;
    const maxOffset = 3;
    const depthOffset = 0.06;

    const wallTangent = new THREE.Vector3().crossVectors(wallNormal, new THREE.Vector3(0, 1, 0)).normalize();

    wall.geometry.computeBoundingBox();
    const wallSize = new THREE.Vector3();
    wall.geometry.boundingBox?.getSize(wallSize);
    wall.updateMatrixWorld();

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

      const planeNormal = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(planeNormal, wallNormal.clone().normalize());
      mesh.quaternion.copy(quaternion);

      this.scene.add(mesh);

      const clock = new THREE.Clock();
      clock.start();

      const animate = () => {
        const elapsed = clock.getElapsedTime();
        const progress = elapsed * 1000 / duration;

        if (progress >= 1) {
          this.scene.remove(mesh);
          return;
        }

        const offset = wallTangent.clone().multiplyScalar(maxOffset * progress * side);
        let effectPos = basePosition.clone().add(offset);

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

  initAI(mode: 'easy'|'middle'|'hard') {
    if (mode === 'easy') {
      this.#AIStatus.speed = this.ballSpeed - 10;
      this.#AIStatus.missChance = 0.3;
      this.#AIStatus.precision = 6;
      return;
    }
    if (mode === 'middle') {
      this.#AIStatus.speed = this.ballSpeed - 7;
      this.#AIStatus.missChance = 0.2;
      this.#AIStatus.precision = 5;
      return;
    }
    if (mode === 'hard') {
      this.#AIStatus.speed = this.ballSpeed - 5;
      this.#AIStatus.missChance = 0.1;
      this.#AIStatus.precision = 4;
      return;
    }
  }

  enemyPaddleAI() {
    const speed = this.#AIStatus.speed * this.deltaTime;
    const paddleZ = this.enemyPaddle.position.z;
    const ballZ = this.ball.position.z;
    const ballVelocityZ = this.ballVelocity.z;

    if (ballVelocityZ >= 0) {
      this.#AIStatus.predictedTargetX = null;
      return;
    }

    if (this.#AIStatus.predictedTargetX === null) {
      const timeToReach = Math.abs((paddleZ - ballZ) / ballVelocityZ);
      const noise = Math.random() < this.#AIStatus.missChance ? (Math.random() - 0.5) * this.#AIStatus.precision : 0;
      const paddleHalfSize = this.paddleWidth / 2;
      const randomHitOffset = (Math.random() * 2 - 1) * paddleHalfSize;
      this.#AIStatus.predictedTargetX = this.ball.position.x + this.ballVelocity.x * timeToReach + noise + randomHitOffset;
    }

    const direction = this.#AIStatus.predictedTargetX - this.enemyPaddle.position.x;
    this.enemyPaddle.position.x += THREE.MathUtils.clamp(direction, -speed, speed);

    const halfWidth = this.stageWidth / 2;
    const paddleHalfSize = this.paddleWidth / 2;
    this.enemyPaddle.position.x = THREE.MathUtils.clamp(
      this.enemyPaddle.position.x,
      -halfWidth + paddleHalfSize,
      halfWidth - paddleHalfSize
    );
  }

  rendering() {
    super.onBeforeRender(() => {
      this.deltaTime = Math.min(this.clock.getDelta(), 0.05);
      this.reflector();
      this.paddleMove(true);
      this.isServe();
      this.enemyPaddleAI();
    })
  }

}

export const TC = {

  toRad(deg: number) {
    return THREE.MathUtils.degToRad(deg)
  },

  vec2(vec: Partial<{x: number, y: number}>) {
    const { x = 0, y = 0 } = vec;
    return new THREE.Vector2(x, y);
  },

  vec3(vec: Partial<Vector3Like>) {
    const { x = 0, y = 0, z = 0 } = vec;
    return new THREE.Vector3(x, y, z);
  },

  changePosition(
    target: THREE.Object3D,
    position: Partial<Vector3Like>
  ) {
    target.updateMatrixWorld();
    const { x = target.position.x, y = target.position.y, z = target.position.z } = position;
    target.position.set(x, y, z);
    target.updateMatrixWorld();
  },

  changeRotation(
    target: THREE.Object3D,
    rotation: Partial<Vector3Like>
  ) {
    target.updateMatrixWorld();
    const { x = target.rotation.x, y = target.rotation.y, z = target.rotation.z } = rotation;
    target.rotation.set(x, y, z);
    target.updateMatrixWorld();
  },

  changeScale(
    target: THREE.Object3D,
    scale: Partial<Vector3Like> | number
  ) {
    target.updateMatrixWorld();
    let x: number, y: number, z: number;

    if (typeof scale === 'number') {
      x = y = z = scale;
    } else {
      x = scale.x ?? target.scale.x;
      y = scale.y ?? target.scale.y;
      z = scale.z ?? target.scale.z;
    }

    target.scale.set(x, y, z);
    target.updateMatrixWorld();
  },

  centerObject(target: THREE.Object3D) {
    target.updateMatrixWorld();

    const box = new THREE.Box3().setFromObject(target);
    const center = new THREE.Vector3();
    box.getCenter(center);
    target.position.sub(center);
    target.updateMatrixWorld();
  }

}

export {THREE, MeshBVH, acceleratedRaycast, OrbitControls, FontLoader, TextGeometry, EffectComposer, RenderPass, UnrealBloomPass};