const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const gameTitle = document.getElementById('game-title');
const startMessage = document.getElementById('start-message');
const gameOverScreen = document.getElementById('game-over-screen');
const winScreen = document.getElementById('win-screen');
const restartButton = document.getElementById('restart-button');
const restartButtonWin = document.getElementById('restart-button-win');

// --- Configuration ---
canvas.width = 800;
canvas.height = 600;

const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_ROW_COUNT = 8;
const BRICK_COLUMN_COUNT = 10;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 50;
const BRICK_OFFSET_LEFT = 35;
const BRICK_WIDTH = (canvas.width - (BRICK_OFFSET_LEFT * 2) - (BRICK_PADDING * (BRICK_COLUMN_COUNT - 1))) / BRICK_COLUMN_COUNT;
const BRICK_HEIGHT = 20;

const BALL_SPEED = 5;

// --- Audio ---
const hitPaddleSound = new Audio('../common_se/maou_se_magical22.wav');
const hitBrickSound = new Audio('../common_se/maou_se_magic_fire04.wav');
const gameOverSound = new Audio('../common_se/maou_se_magic_wind02.wav');
const winSound = new Audio('../common_se/maou_se_magical08.wav');

// --- Game State ---
let score = 0;
let gameOver = false;
let gameWon = false;
let gameRunning = false;
let animationId;

const paddle = {
  x: canvas.width / 2 - PADDLE_WIDTH / 2,
  y: canvas.height - 40,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  color: '#00f', // Blue paddle
  dx: 7 // Paddle speed
};

let rightPressed = false;
let leftPressed = false;

const ball = {
  x: canvas.width / 2,
  y: canvas.height - 50,
  dx: BALL_SPEED,
  dy: -BALL_SPEED,
  radius: BALL_RADIUS,
  color: '#fff' // White ball
};

// --- Particle System ---
let particles = [];

function createParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 1.0,
      color: color,
      size: Math.random() * 3 + 2
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.02; // Fade out
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });
}

let bricks = [];

// --- Initialization ---
function initBricks() {
  bricks = [];
  for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
    bricks[c] = [];
    for (let r = 0; r < BRICK_ROW_COUNT; r++) {
      bricks[c][r] = { x: 0, y: 0, status: 1 };
    }
  }
}

function resetGame() {
  score = 0;
  scoreDisplay.innerText = 'Score: ' + score;
  gameOver = false;
  gameWon = false;
  gameRunning = false;

  paddle.x = canvas.width / 2 - PADDLE_WIDTH / 2;

  ball.x = canvas.width / 2;
  ball.y = canvas.height - 50;
  // Randomize start direction slightly
  ball.dx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
  ball.dy = -BALL_SPEED;

  initBricks();

  gameTitle.style.display = 'block';
  startMessage.style.display = 'block';
  gameOverScreen.classList.add('hidden');
  winScreen.classList.add('hidden');

  draw(); // Draw initial state
  if (animationId) cancelAnimationFrame(animationId);
}

// --- Input Handling ---
document.addEventListener('mousemove', mouseMoveHandler, false);
document.addEventListener('touchmove', touchMoveHandler, { passive: false });
document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);
document.addEventListener('click', startGameHandler, false);

function mouseMoveHandler(e) {
  const relativeX = e.clientX - canvas.offsetLeft;
  if (relativeX > 0 && relativeX < canvas.width) {
    paddle.x = relativeX - paddle.width / 2;
  }
}

function touchMoveHandler(e) {
  e.preventDefault(); // Prevent scrolling
  const touch = e.touches[0];
  const relativeX = touch.clientX - canvas.offsetLeft;
  if (relativeX > 0 && relativeX < canvas.width) {
    paddle.x = relativeX - paddle.width / 2;
  }
}

function keyDownHandler(e) {
  if (e.code === "Space") {
    if (!gameRunning) startGame();
  }
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = true;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = true;
  }
}

function keyUpHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = false;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = false;
  }
}

function startGameHandler(e) {
  // Only start on click if touching UI overlay area (which passes through) or canvas
  // Buttons have their own listeners
  if (!gameRunning && !gameOver && !gameWon) {
    startGame();
  }
}

function startGame() {
  if (!gameRunning) {
    gameRunning = true;
    gameTitle.style.display = 'none';
    startMessage.style.display = 'none';
    gameLoop();
  }
}

// --- Collision Detection ---
function collisionDetection() {
  for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
    for (let r = 0; r < BRICK_ROW_COUNT; r++) {
      let b = bricks[c][r];
      if (b.status === 1) {
        if (ball.x > b.x && ball.x < b.x + BRICK_WIDTH && ball.y > b.y && ball.y < b.y + BRICK_HEIGHT) {
          ball.dy = -ball.dy;
          b.status = 0;
          score += 10;
          scoreDisplay.innerText = 'Score: ' + score;

          // Spawn particles
          createParticles(b.x + BRICK_WIDTH / 2, b.y + BRICK_HEIGHT / 2, `hsl(${c * 36}, 70%, 50%)`);

          hitBrickSound.currentTime = 0;
          hitBrickSound.play();

          checkWin();
        }
      }
    }
  }
}

function checkWin() {
  let activeBricks = 0;
  for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
    for (let r = 0; r < BRICK_ROW_COUNT; r++) {
      if (bricks[c][r].status === 1) activeBricks++;
    }
  }

  if (activeBricks === 0) {
    gameWon = true;
    gameRunning = false;
    winScreen.classList.remove('hidden');
    winSound.play();
  }
}

// --- Update & Draw ---
function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.closePath();
}

function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.fillStyle = paddle.color;
  ctx.shadowBlur = 10;
  ctx.shadowColor = "blue";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.closePath();
}

function drawBricks() {
  for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
    for (let r = 0; r < BRICK_ROW_COUNT; r++) {
      if (bricks[c][r].status === 1) {
        const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
        const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
        bricks[c][r].x = brickX;
        bricks[c][r].y = brickY;

        ctx.beginPath();
        ctx.rect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
        // Magic colors
        ctx.fillStyle = `hsl(${c * 36}, 70%, 50%)`;
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}

function update() {
  if (!gameRunning) return;

  // Move Ball
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Move Paddle (Keyboard)
  if (rightPressed && paddle.x < canvas.width - paddle.width) {
    paddle.x += paddle.dx;
  } else if (leftPressed && paddle.x > 0) {
    paddle.x -= paddle.dx;
  }

  // Wall Collision
  if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
    ball.dx = -ball.dx;
  }

  if (ball.y + ball.dy < ball.radius) {
    ball.dy = -ball.dy;
  } else if (ball.y + ball.dy > paddle.y - ball.radius) {
    // Check if within paddle width
    if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
      // Calculate hit position relative to center of paddle
      let hitPoint = ball.x - (paddle.x + paddle.width / 2);
      // Normalize hit point (-1 to 1)
      hitPoint = hitPoint / (paddle.width / 2);

      // Adjust angle
      let angle = hitPoint * (Math.PI / 3); // Max 60 degrees

      ball.dx = BALL_SPEED * Math.sin(angle) * 1.5; // Add some speed/angle variation
      // Ensure minimum vertical speed so it doesn't get stuck horizontally
      ball.dy = -Math.abs(BALL_SPEED * Math.cos(angle));

      hitPaddleSound.currentTime = 0;
      hitPaddleSound.play();
    } else if (ball.y + ball.dy > canvas.height - ball.radius) {
      // Game Over only when hitting bottom ground
      gameOver = true;
      gameRunning = false;
      gameOverScreen.classList.remove('hidden');
      gameOverSound.play();
    }
  }

  collisionDetection();
  updateParticles();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear to transparent

  drawBricks();
  drawParticles();
  drawBall();
  drawPaddle();
}

function gameLoop() {
  if (!gameRunning) return;

  update();
  draw();

  if (!gameOver && !gameWon) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

// --- Event Listeners for UI ---
restartButton.addEventListener('click', () => {
  resetGame();
  startGame();
});

restartButtonWin.addEventListener('click', () => {
  resetGame();
  startGame();
});

// Start
resetGame();
