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
  walls: THREE.Mesh[] = [];

  ballSize: number = 1;
  ball!: THREE.Mesh;
  defBallSpeed = 25;
  ballSpeed: number = this.defBallSpeed;
  ballVelocity!: THREE.Vector3;
  acceleration: number = 0.2;

  stageHeight: number = 28;
  stageWidth: number = this.stageHeight / 5 * 4;
  paddleWidth: number = this.stageWidth / 6;

  myPaddle!: THREE.Mesh;
  enemyPaddle!: THREE.Mesh;

  stretchEffectPool: THREE.Mesh[] = [];

  clock: THREE.Clock = new THREE.Clock();
  deltaTime! :number;

  acceptingInputPaddle: boolean = false;

  #pointStatus: {
    myPoint: number,
    enemyPoint: number,
    max: number,
    deuce: boolean,
  } = {
    myPoint: 0,
    enemyPoint: 0,
    max: 10,
    deuce: false,
  }

  #serveStatus: {
    pointGetter: boolean, // true: me, false: enemy
    getPoint: boolean,
    serveStartTime: number,
    isServing: boolean,
    serveReady: boolean,
    isAnimatingServe: boolean
  } = {
    pointGetter: Boolean(Math.round(Math.random())),
    getPoint: false,
    serveStartTime: 0,
    isServing: false,
    serveReady: false,
    isAnimatingServe: false
  }

  #AIStatus: {
    speed: number,
    missChance: number,
    precision: number,
    serviceToMoveCenter: boolean,
    predictedTargetX: number | null
  } = {
    speed: 0,
    missChance: 0,
    precision: 0,
    serviceToMoveCenter: false,
    predictedTargetX: null
  }

  keyPress: Record<string, boolean> = {};

  constructor(option?: AppSetting) {
    super(option)
    this.ballVelocity = TC.vec3({x: 0.1, z: 0.1}).normalize().multiplyScalar(this.ballSpeed);
    this.initStage();
    this.initEvent();
    this.initAI('easy');
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
    
    this.walls = [this.wallLeft, this.wallRight, this.wallBefore, this.wallAfter];
    this.walls.forEach(wall => wall.geometry.boundsTree = new MeshBVH(wall.geometry));
    
    super.addScene(...this.walls);

    const paddleGeo = new THREE.BoxGeometry(this.paddleWidth, 1, 1);
    const paddleBallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.25, // 自発光の強さ
      metalness: 0, // 金属っぽさ
      roughness: 0 // 表面の粗さ
    });

    this.myPaddle = returnMesh(paddleGeo, paddleBallMat);
    this.myPaddle.geometry.boundsTree = new MeshBVH(this.myPaddle.geometry);
    TC.changePosition(this.myPaddle, { z: this.stageHeight / 2 - 1 });
    this.myPaddle.geometry.computeBoundingBox();

    this.enemyPaddle = returnMesh(paddleGeo, paddleBallMat);
    this.enemyPaddle.geometry.boundsTree = new MeshBVH(this.enemyPaddle.geometry);
    TC.changePosition(this.enemyPaddle, { z: -this.stageHeight / 2 + 1 });
    this.enemyPaddle.geometry.computeBoundingBox();

    super.addScene(this.myPaddle, this.enemyPaddle);

    this.ball = returnMesh(new THREE.BoxGeometry(this.ballSize, this.ballSize, this.ballSize), paddleBallMat);
    this.ball.position.set(0, 0, 0);
    super.addScene(this.ball);
  }

  // ユーザのコントロールは後で別のクラスに移動
  initEvent() {
    window.addEventListener('keydown', e => this.keyPress[e.code] = true);
    window.addEventListener('keyup', e => this.keyPress[e.code] = false);
  }

  userControl() {
    const speed = 15 * this.deltaTime;
    const min = -this.stageWidth / 2;
    const max = this.stageWidth / 2;
    if (this.keyPress['KeyA']) {
      this.paddleMove(true, this.normalize(-speed, min, max));
    }
    if (this.keyPress['KeyD']) {
      this.paddleMove(true, this.normalize(speed, min, max));
    }
  }

  normalize(val: number, min: number, max: number) {
    if (min === max) return null;
    return (val - min) / (max - min);
  }
  
  denormalize(val: number, min: number, max: number) {
    return val * (max - min) + min;
  }

  paddleMove(target: boolean, x :number | null) {
    if ((!this.acceptingInputPaddle && this.#serveStatus.pointGetter !== target) || x === null) return;
    const paddle = target ? this.myPaddle : this.enemyPaddle;
    paddle.position.x += this.denormalize(x, -this.stageWidth/2, this.stageWidth/2);

    const halfWidth = this.stageWidth / 2;
    const paddleHalfSize = this.paddleWidth / 2;

    paddle.position.x = THREE.MathUtils.clamp(
      paddle.position.x,
      -halfWidth + paddleHalfSize,
      halfWidth - paddleHalfSize
    );

    if (this.#serveStatus.isServing) this.updateServeBall();
  }

  refectPaddle(paddle: THREE.Mesh) {
    if (!paddle.geometry.boundingBox) return false;
    const paddleBox = paddle.geometry.boundingBox;
    const halfWidth = (paddleBox.max.x - paddleBox.min.x) / 2;
    const localHitX = this.ball.position.x - paddle.position.x;
    const normalized = THREE.MathUtils.clamp(localHitX / halfWidth, -1, 1);
    const maxAngle = Math.PI / 3;
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
    return true;
  }

  gameBallFromPaddle(raycaster: THREE.Raycaster) {
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
            if ( !this.refectPaddle(paddle) ) this.ballVelocity.reflect(normal);
            const offset = normal.clone().multiplyScalar(0.01);
            this.ball.position.add(offset);
            hitPoint.x = this.ball.position.x;
            if (this.ball.position.z < paddle.position.z) {
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

          const offset = normal.clone().multiplyScalar(0.5);
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
    this.#serveStatus.getPoint = false;
    if (raycaster.intersectObject(this.wallBefore, true).length > 0) {
      console.log('get point');
      this.acceptingInputPaddle = false;
      this.#pointStatus.enemyPoint++;
      this.#serveStatus.pointGetter = false;
      this.#serveStatus.getPoint = true;
    } else if (raycaster.intersectObject(this.wallAfter, true).length > 0) {
      console.log('get point');
      this.acceptingInputPaddle = false;
      this.#pointStatus.myPoint++;
      this.#serveStatus.pointGetter = true;
      this.#serveStatus.getPoint = true;
    }
    return this.#serveStatus.getPoint;
  }

  hasService() {
    return this.#serveStatus.pointGetter ? this.enemyPaddle : this.myPaddle;
  }

  isServe() {
    if (!this.#serveStatus.serveReady) return;

    const elapsed = this.clock.getElapsedTime() - this.#serveStatus.serveStartTime;

    const serve = () => {
      this.#serveStatus.isServing = false;
      this.#serveStatus.serveReady = false;
      // if (!this.refectPaddle(this.hasService())) this.ballVelocity.set(0, 0, this.ballSpeed);
      this.refectPaddle(this.hasService());
    }

    if (this.#serveStatus.pointGetter) {
      if (elapsed > 1) serve();
    } else {
      if (this.keyPress['Space'] || elapsed > 10) serve();
    }
  }

  async serve() {
    this.#serveStatus.getPoint = false;
    this.#serveStatus.isServing = true;
    this.acceptingInputPaddle = false;
    this.#serveStatus.serveReady = false;

    await this.animateServePosition();

    this.acceptingInputPaddle = true;
    this.#serveStatus.serveStartTime = this.clock.getElapsedTime();
    this.#serveStatus.serveReady = true;
  }

  async animateServePosition() {
    if (this.#serveStatus.isAnimatingServe) return;

    this.#serveStatus.isAnimatingServe = true;
    const paddle = this.hasService();
    const ballSpeed = 30;

    await new Promise(resolve => {
      const material = this.wallAfter.material as THREE.MeshStandardMaterial;
      const defMaterial = material.emissiveIntensity;
      const endtime = 0.4;
      const cycles = 1.75;
      const difference = 0.15;
      const totalRadians = cycles * 2 * Math.PI;
      const startTime = performance.now();

      const effect = (now: number) => {
        const deltaTime = (now - startTime) / 1000;
        if (deltaTime >= endtime) {
          material.emissiveIntensity = defMaterial;
          return resolve(null);
        }
        const angle = deltaTime * totalRadians / endtime;
        const value = Math.sin(angle);
        const step = difference * ((value + 1) / 2);
        material.emissiveIntensity = defMaterial + step;
        material.needsUpdate = true;

        requestAnimationFrame(effect);
      };

      effect(startTime);
    });

    await new Promise(resolve => {
      const direction = this.#serveStatus.pointGetter ? 1 : -1;
      const targetZ = paddle.position.z + direction * 1.2;
      let lastTime = performance.now();

      const animateZ = (now: number) => {
        const deltaTime = (now - lastTime) / 1000;
        lastTime = now;

        const dz = targetZ - this.ball.position.z;
        const step = direction * ballSpeed * deltaTime;

        if (Math.abs(dz) <= Math.abs(step)) {
          this.ball.position.z = targetZ;
          resolve(null);
        } else {
          this.ball.position.z += step;
          requestAnimationFrame(animateZ);
        }
      };
      animateZ(lastTime);
    });

    await new Promise(resolve => {
      const targetX = paddle.position.x;
      let lastTime = performance.now();

      const animateX = (now: number) => {
        const deltaTime = (now - lastTime) / 1000;
        lastTime = now;

        const dx = targetX - this.ball.position.x;
        const step = Math.sign(dx) * ballSpeed * deltaTime;

        if (Math.abs(dx) <= Math.abs(step)) {
          this.ball.position.x = targetX;
          resolve(null);
        } else {
          this.ball.position.x += step;
          requestAnimationFrame(animateX);
        }
      };
      animateX(lastTime);
    });
    this.#serveStatus.isAnimatingServe = false;
  }

  updateServeBall() {
    const paddle = this.hasService()
    const halfBallWidth = 0.5;
    const paddleBox = paddle.geometry.boundingBox!;
    this.ball.position.x = THREE.MathUtils.clamp(this.ball.position.x, paddleBox.min.x + paddle.position.x + halfBallWidth, paddleBox.max.x + paddle.position.x - halfBallWidth);
  }

  reflector() {
    if (this.#serveStatus.getPoint) {
      this.ballSpeed = this.defBallSpeed;
      this.ballVelocity.set(0, 0, 0);
      this.#AIStatus.predictedTargetX = null;
      this.serve();
      return;
    }

    if (this.#serveStatus.getPoint || this.#serveStatus.isServing) return;
    if(!this.ballVelocity) throw new Error('Ball velocity is null');

    const frameVelocity = this.ballVelocity.clone().multiplyScalar(this.deltaTime);
    this.ball.position.add(frameVelocity);

    const halfSize = this.ballSize / 2;
    const offsets = [
      new THREE.Vector3(halfSize, 0, halfSize),
      new THREE.Vector3(-halfSize, 0, halfSize),
      new THREE.Vector3(halfSize, 0, -halfSize),
      new THREE.Vector3(-halfSize, 0, -halfSize),
    ];

    for (const offset of offsets) {
      const origin = this.ball.position.clone().add(offset);
      const raycaster = new THREE.Raycaster(
        origin,
        this.ballVelocity.clone().normalize(),
        0,
        frameVelocity.length() * 2
      );
      if (this.gameBallFromPaddle(raycaster) || this.refectWall(raycaster) || this.pointWall(raycaster)) {
        this.#AIStatus.predictedTargetX = null;
        break;
      }
    }
  }

  getStretchEffectMesh(): THREE.Mesh {
    const mesh = this.stretchEffectPool.find(m => !m.visible);
    if (mesh) {
      mesh.visible = true;
      return mesh;
    }

    const geometry = new THREE.PlaneGeometry(1, 1);
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
    this.scene.add(newMesh);
    this.stretchEffectPool.push(newMesh);
    return newMesh;
  }

  createStretchEffect(center: THREE.Vector3, wallNormal: THREE.Vector3, wall: THREE.Mesh) {
    const duration = 450;
    const maxOffset = 4;
    const depthOffset = 0.06;

    const wallTangent = new THREE.Vector3().crossVectors(wallNormal, new THREE.Vector3(0, 1, 0)).normalize();

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

    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;

      const mesh = this.getStretchEffectMesh();
      const material = mesh.material as THREE.MeshStandardMaterial;

      const basePosition = center.clone().add(wallNormal.clone().multiplyScalar(depthOffset));
      mesh.position.copy(basePosition);

      const planeNormal = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(planeNormal, wallNormal.clone().normalize());
      mesh.quaternion.copy(quaternion);

      this.scene.add(mesh);

      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;

        if (progress >= 1 || this.#serveStatus.getPoint) {
          mesh.visible = false;
          return;
        }

        const offset = wallTangent.clone().multiplyScalar(maxOffset * progress * side);
        let effectPos = basePosition.clone().add(offset);

        const localOffset = effectPos.clone().sub(wallStart);
        const projectedLength = localOffset.dot(wallDirection);
        const halfEffectWidth = 1 / 2;

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

  // あとで別のクラスに移動する
  initAI(mode: 'easy'|'middle'|'hard') {
    if (mode === 'easy') {
      this.#AIStatus.speed = this.ballSpeed - 10;
      this.#AIStatus.missChance = 0.5;
      this.#AIStatus.precision = 8;
      return;
    }
    if (mode === 'middle') {
      this.#AIStatus.speed = this.ballSpeed - 7;
      this.#AIStatus.missChance = 0.3;
      this.#AIStatus.precision = 6;
      return;
    }
    if (mode === 'hard') {
      this.#AIStatus.speed = this.ballSpeed - 5;
      this.#AIStatus.missChance = 0.1;
      this.#AIStatus.precision = 4;
      return;
    }
  }

  async moveEnemyPaddleToCenter() {
    this.#AIStatus.serviceToMoveCenter = true;
    const targetX = 0;
    const speed = 20;
    let lastTime = performance.now()

    await new Promise(resolve => {
      const animate = (now: number) => {
        const deltaTime = (now - lastTime) / 1000;
        lastTime = now;

        const dx = targetX - this.enemyPaddle.position.x;
        const moveX = Math.sign(dx);
        const step = moveX * speed * deltaTime;

        if (Math.abs(dx) <= Math.abs(step)) {
          this.enemyPaddle.position.x = targetX;
          this.#AIStatus.serviceToMoveCenter = false;
          resolve(null);
        } else {
          this.enemyPaddle.position.x += step;
          if (this.#serveStatus.pointGetter) this.updateServeBall();
          requestAnimationFrame(animate);
        }
      };
      animate(lastTime);
    });
  }

  async enemyPaddleAI() {
    if (!this.#AIStatus.serviceToMoveCenter && this.#serveStatus.isServing) {
      const isAIServe = this.#serveStatus.pointGetter;

      if (isAIServe) {
        if (!this.#serveStatus.serveReady) return;
        await this.moveEnemyPaddleToCenter();
        this.isServe();
      } else {
        this.moveEnemyPaddleToCenter();
      }
    }

    if (!this.acceptingInputPaddle) return;

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
    const clampedMove = THREE.MathUtils.clamp(direction, -speed, speed);
    const normalizedMove = this.normalize(clampedMove, -this.stageWidth / 2, this.stageWidth / 2);
    this.paddleMove(false, normalizedMove);
  }

  rendering() {
    super.onBeforeRender(() => {
      console.log(this.ball.position);
      this.deltaTime = Math.min(this.clock.getDelta(), 0.05);
      this.reflector();
      this.userControl();
      this.isServe();
      this.enemyPaddleAI();
    });
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