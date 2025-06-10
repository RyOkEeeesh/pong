import { App, txtMesh, TC } from './module'
import Stats from "stats.js";

// スタッツを作成
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

const app = new App({
  cameraPosition: { z: 2 },
  controls: true,
  composer: true
});

const txt = new txtMesh()

const text = await txt.loadFontText(
  'PONG',
  /* geometry option */ {
    depth: 0.1,
  }, /* material option */ {
    color: 0x7fba00,
    emissive: 0xa6a6a7,
    emissiveIntensity: 1, // 自発光の強さ
    metalness: 0, // 金属っぽさ 0 : プラスチック　1 : 金属
    roughness: 0 // 表面の粗さ 0: つるつる　1 : ざらざら
  }
);

app.addScene(text);

TC.centerObject(text);

app.onBeforeRender(() => stats.begin());
app.onAfterRender(() => stats.end());

app.start();
