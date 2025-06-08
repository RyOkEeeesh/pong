const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const paddleWidth = 10;
const paddleHeight = 100;
const ballSize = 10;

let playerY = canvas.height / 2 - paddleHeight / 2;
let aiY = playerY;
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballVX = 2;
let ballVY = 2;

function draw() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // プレイヤー
  ctx.fillStyle = 'white';
  ctx.fillRect(10, playerY, paddleWidth, paddleHeight);

  // AI
  ctx.fillRect(canvas.width - 20, aiY, paddleWidth, paddleHeight);

  // ボール
  ctx.fillRect(ballX, ballY, ballSize, ballSize);
}

function update() {
  // ボール移動
  ballX += ballVX;
  ballY += ballVY;

  // 壁反射
  if (ballY <= 0 || ballY + ballSize >= canvas.height) ballVY *= -1;

  // パドル反射（プレイヤー）
  if (
    ballX <= 20 &&
    ballY + ballSize >= playerY &&
    ballY <= playerY + paddleHeight
  ) {
    ballVX *= -1;
  }

  // パドル反射（AI）
  if (
    ballX + ballSize >= canvas.width - 20 &&
    ballY + ballSize >= aiY &&
    ballY <= aiY + paddleHeight
  ) {
    ballVX *= -1;
  }

  // AI追従
  const aiCenter = aiY + paddleHeight / 2;
  if (aiCenter < ballY) aiY += 3;
  else aiY -= 3;
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();

// プレイヤー操作
window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  playerY = e.clientY - rect.top - paddleHeight / 2;
});