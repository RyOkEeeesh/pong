import { THREE, Game, TC } from './module';

const game = new Game({
  cameraPosition: {y: 20, z: 16 },
  controls: true,
  composer: true
});


const ballSpeed = 20;
let velocity = TC.vec3({x: 0.1, z: 0.1}).normalize().multiplyScalar(ballSpeed);
game.ballVelocity = velocity;

const keyState: Record<string, boolean> = {};

window.addEventListener('keydown', (e) => {
  keyState[e.code] = true;
});

window.addEventListener('keyup', (e) => {
  keyState[e.code] = false;
  });

game.onBeforeRender(() => {
  game.reflectorGame();
  // console.log(keyState)

});

game.start();
