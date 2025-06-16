import { THREE, Game, TC } from './module';

const game = new Game({
  cameraPosition: {y: 20, z: 16 },
  controls: true,
  composer: true
});


let velocity = TC.vec3({x: 0.1, z: 0.1}).normalize().multiplyScalar(game.ballSpeed);
game.ballVelocity = velocity;

game.start();
