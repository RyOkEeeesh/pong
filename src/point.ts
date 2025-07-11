import { AppSetting, THREE } from "./ThreeModule";

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type MeshMap = { [key in Digit]: THREE.MeshStandardMaterial[] };

export class NumDispaly {
  #lt!: THREE.MeshStandardMaterial;
  #t!: THREE.MeshStandardMaterial;
  #rt!: THREE.MeshStandardMaterial;
  #c!: THREE.MeshStandardMaterial;
  #l1!: THREE.MeshStandardMaterial;
  #lc!: THREE.MeshStandardMaterial;
  #l2!: THREE.MeshStandardMaterial;
  #lb!: THREE.MeshStandardMaterial;
  #r1!: THREE.MeshStandardMaterial;
  #rc!: THREE.MeshStandardMaterial;
  #r2!: THREE.MeshStandardMaterial;
  #rb!: THREE.MeshStandardMaterial;
  #b!: THREE.MeshStandardMaterial;

  #group: THREE.Group = new THREE.Group();

  #numOfDis!: MeshMap;

  #nowDis: THREE.MeshStandardMaterial[] | null = null;

  constructor() { this.init() }

  init() {
    const w = 5;
    const h = 10;
    const interval = 4;

    const g = new THREE.SphereGeometry(0.25, 8, 8);
    const m = new THREE.MeshStandardMaterial({
      color: 0x5b5d62,
      emissive: 0xffffff,
      emissiveIntensity: 0,
      metalness: 0,
      roughness: 0
    });

    {
      this.#lt = m.clone();
      const mesh = new THREE.Mesh(g, this.#lt);
      mesh.position.y = h;
      this.#group.add(mesh);
    }{
      this.#t = m.clone();
      for (let i = 1; i <= interval; i++) {
        const mesh = new THREE.Mesh(g, this.#t);
        mesh.position.y = h;
        mesh.position.x = w / (interval + 1) * i;
        this.#group.add(mesh);
      }
    }{
      this.#rt = m.clone();
      const mesh = new THREE.Mesh(g, this.#rt);
      mesh.position.x = w;
      mesh.position.y = h;
      this.#group.add(mesh);
    }{
      this.#c = m.clone();
      for (let i = 1; i <= interval; i++) {
        const mesh = new THREE.Mesh(g, this.#c);
        mesh.position.y = h / 2;
        mesh.position.x = w / (interval+ 1) * i;
        this.#group.add(mesh);
      }
    }{
      this.#l1 = m.clone();
      for (let i = 1; i <= interval; i++) {
        const mesh = new THREE.Mesh(g, this.#l1);
        mesh.position.y = h / 2 + h / 2 / (interval+ 1) * i;
        this.#group.add(mesh);
      }
    }{
      this.#lc = m.clone();
      const mesh = new THREE.Mesh(g, this.#lc);
      mesh.position.y = h / 2;
      this.#group.add(mesh);
    }{
      this.#l2 = m.clone();
      for (let i = 1; i <= interval; i++) {
        const mesh = new THREE.Mesh(g, this.#l2);
        mesh.position.y = h / 2 / (interval+ 1) * i;
        this.#group.add(mesh);
      }
    }{
      this.#lb = m.clone();
      const mesh = new THREE.Mesh(g, this.#lb);
      this.#group.add(mesh);
    }{
      this.#r1 = m.clone();
      for (let i = 1; i <= interval; i++) {
        const mesh = new THREE.Mesh(g, this.#r1);
        mesh.position.y = h / 2 + h / 2 / (interval+ 1) * i;
        mesh.position.x = w;
        this.#group.add(mesh);
      }
    }{
      this.#rc = m.clone();
      const mesh = new THREE.Mesh(g, this.#rc);
      mesh.position.x = w;
      mesh.position.y = h / 2;
      this.#group.add(mesh);
    }{
      this.#r2 = m.clone();
      for (let i = 1; i <= interval; i++) {
        const mesh = new THREE.Mesh(g, this.#r2);
        mesh.position.y = h / 2 / (interval+ 1) * i;
        mesh.position.x = w;
        this.#group.add(mesh);
      }
    }{
      this.#rb = m.clone();
      const mesh = new THREE.Mesh(g, this.#rc);
      mesh.position.x = w;
      this.#group.add(mesh);
    }{
      this.#b = m.clone();
      for (let i = 1; i <= interval; i++) {
        const mesh = new THREE.Mesh(g, this.#b);
        mesh.position.x = w / (interval+ 1) * i;
        this.#group.add(mesh);
      }
    }

    const box = new THREE.Box3().setFromObject(this.#group);
    const center = box.getCenter(new THREE.Vector3());
    this.#group.position.sub(center);

    this.#numOfDis = {
      0: [ this.#lt, this.#t, this.#rt, this.#r1, this.#r2, this.#rc, this.#lc, this.#l1, this.#l2, this.#lb, this.#b, this.#rb ],
      1: [ this.#rt, this.#r1, this.#rc, this.#r2, this.#rb ],
      2: [ this.#lt, this.#t, this.#rt, this.#r1, this.#rc, this.#c, this.#lc, this.#l2, this.#lb, this.#b, this.#rb ],
      3: [ this.#lt, this.#t, this.#rt, this.#r1, this.#rc, this.#c, this.#lc, this.#r2, this.#lb, this.#b, this.#rb ],
      4: [ this.#lt, this.#l1, this.#lc, this.#c, this.#rt, this.#r1, this.#rc, this.#r2, this.#rb ],
      5: [ this.#lt, this.#t, this.#rt, this.#r2, this.#rc, this.#c, this.#lc, this.#l1, this.#lb, this.#b, this.#rb ],
      6: [ this.#lt, this.#t, this.#rt, this.#r2, this.#rc, this.#c, this.#lc, this.#l1, this.#l2, this.#lb, this.#b, this.#rb ],
      7: [ this.#lt, this.#t, this.#rt, this.#r1, this.#rc, this.#r2, this.#rb ],
      8: [ this.#lt, this.#t, this.#rt, this.#r1, this.#r2, this.#rc, this.#c, this.#lc, this.#l1, this.#l2, this.#lb, this.#b, this.#rb ],
      9: [ this.#lt, this.#t, this.#rt, this.#r1, this.#r2, this.#rc, this.#c, this.#lc, this.#l1, this.#rb ]
    };
  }

  set(n: Digit) {
    this.reset();
    this.#numOfDis[n].forEach(m => m.emissiveIntensity = 1);
    this.#nowDis = this.#numOfDis[n];
  }

  reset() {
    this.#nowDis?.forEach(m => m.emissiveIntensity = 0);
    this.#nowDis = null;
  }

  get group() { return this.#group; }
  get nowDis() { return this.#nowDis; }
}

export class PointDisplay {
  #digits: NumDispaly[] = [ new NumDispaly(), new NumDispaly() ];
    #group: THREE.Group = new THREE.Group();

  constructor() { this.init(); }

  init() {
    let i = 0;
    this.#group.add(...this.#digits.map(digit => {
      digit.group.position.x = 7.5 * i++;
      digit.set(0);
      return digit.group;
    }));
    const box = new THREE.Box3().setFromObject(this.#group);
    const center = box.getCenter(new THREE.Vector3());
    this.#group.position.sub(center);
  }

  set(n: number) {
    const max = 2;
    const num = n.toString().padStart(max, '0').split('').map(Number);
    if (num.length > max) throw new Error('Put a number less than or equal to two digits.');
    for (let i = 0; i < max; i++) this.#digits[i].set(num[i] as Digit);
  }

  get group() { return this.#group; }
}