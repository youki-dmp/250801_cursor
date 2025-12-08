// Main game implementation
import { config } from './js/constants.js';
import { EnemySystem } from './js/enemies.js';
import { CoinSystem } from './js/coins.js';
import { ComboSystem } from './js/combo.js';
import { PlatformSystem } from './js/platforms.js';
import { UISystem } from './js/ui.js';

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Buttons
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const copterButton = document.getElementById('copterButton');

// Sound effects
const sounds = {
  jump: new Audio('./common_se/maou_se_magic_wind02.wav'),
  spring: new Audio('./common_se/maou_se_magical08.wav'),
  break: new Audio('./common_se/maou_se_magical22.wav'),
  gameOver: new Audio('./common_se/maou_se_magic_water02.wav'),
  copter: new Audio('./common_se/maou_se_magical30.wav')
};

sounds.break.playbackRate = 2.0;
sounds.copter.playbackRate = 2.0;
sounds.copter.loop = true;

Object.values(sounds).forEach(sound => {
  sound.volume = 0.5;
  sound.load();
});

// Game systems
const enemySystem = new EnemySystem(canvas, sounds);
const coinSystem = new CoinSystem(canvas, sounds);
const comboSystem = new ComboSystem(sounds);
const platformSystem = new PlatformSystem(canvas, sounds);
const uiSystem = new UISystem(canvas, ctx);

// Game state
let gameOver = false;
let score = 0;
let highScore = 0;
let cameraY = 0;
let animationFrameId = null;

// Audio Context for special effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

async function playReverseSound(url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const channels = audioBuffer.numberOfChannels;
    const reversedBuffer = audioCtx.createBuffer(channels, audioBuffer.length, audioBuffer.sampleRate);

    for (let i = 0; i < channels; i++) {
      const input = audioBuffer.getChannelData(i);
      const output = reversedBuffer.getChannelData(i);
      for (let j = 0; j < input.length; j++) {
        output[j] = input[input.length - 1 - j];
      }
    }

    const source = audioCtx.createBufferSource();
    source.buffer = reversedBuffer;
    source.connect(audioCtx.destination);
    source.start();
  } catch (e) {
    console.error("Error playing reverse sound:", e);
  }
}

// Background
let backgroundLayers = [];

// Player
const player = {
  x: 0,
  y: 0,
  width: 40,
  height: 50,
  velocityX: 0,
  velocityY: 0,
  isOnPlatform: false,
  isCoptering: false,
  ahogeAngle: 0,
  ahogeSpeed: 0,
  animationFrame: 0,
  frameCounter: 0,
  shakeX: 0,
  barrier: false
};

// Controls
const keys = {
  left: false,
  right: false,
  copter: false
};

// Functions
function init() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const saved = localStorage.getItem('ahogeCopterHighScore');
  if (saved) highScore = parseInt(saved, 10);

  player.x = canvas.width / 2;
  player.y = canvas.height - 100;

  platformSystem.generateInitial();
  initBackground();
  setupControls();

  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

function setupControls() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'Space') {
      e.preventDefault();
      keys.copter = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'Space') keys.copter = false;
  });

  [
    [leftButton, 'left'],
    [rightButton, 'right'],
    [copterButton, 'copter']
  ].forEach(([btn, key]) => {
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
    btn.addEventListener('mousedown', () => keys[key] = true);
    btn.addEventListener('mouseup', () => keys[key] = false);
  });

  canvas.addEventListener('click', () => { if (gameOver) resetGame(); });
}

function initBackground() {
  backgroundLayers = [
    { type: 'cloud', objects: [], speedRatio: 0.1, yRange: [0, 300] },
    { type: 'mountain', objects: [], speedRatio: 0.3, yRange: [400, 500] }
  ];

  for (let i = 0; i < 5; i++) {
    addBackgroundObject(backgroundLayers[0], Math.random() * canvas.width, -cameraY);
  }

  const layer = backgroundLayers[1];
  const size = 200;
  layer.objects.push({
    x: canvas.width / 2 - size * 1.5,
    y: canvas.height,
    size: size,
    width: size * 3,
    height: size * 2.5
  });
}

function addBackgroundObject(layer, xOffset, currentCameraY) {
  const obj = {
    x: xOffset,
    y: Math.random() * (layer.yRange[1] - layer.yRange[0]) + layer.yRange[0] + currentCameraY,
    size: Math.random() * 60 + 40
  };

  if (layer.type === 'cloud') {
    obj.width = obj.size * 1.8;
    obj.height = obj.size * 0.6;
  }

  layer.objects.push(obj);
}

function updateBackground() {
  backgroundLayers.forEach(layer => {
    if (layer.type === 'mountain') return;

    layer.objects = layer.objects.filter(obj => obj.y < cameraY + canvas.height + 200);

    const highestY = layer.objects.length > 0 ? Math.min(...layer.objects.map(o => o.y)) : cameraY;
    while (highestY > cameraY - 200) {
      const x = Math.random() * canvas.width;
      const y = highestY - 100 - Math.random() * 100;
      addBackgroundObject(layer, x, 0);
      layer.objects[layer.objects.length - 1].y = y;
      break;
    }
  });
}

function getSkyColor() {
  if (score < 50) return { top: '#87CEEB', bottom: '#E0F7FA' };
  if (score < 200) return { top: '#B4D7E8', bottom: '#E8F4F8' };
  if (score < 500) return { top: '#E8F1F5', bottom: '#F0F8FF' };
  return { top: '#1a1a2e', bottom: '#16213e' };
}

function update() {
  if (gameOver) return;

  // Movement
  if (keys.left) player.velocityX = -config.moveSpeed;
  else if (keys.right) player.velocityX = config.moveSpeed;
  else player.velocityX = 0;

  player.x += player.velocityX;

  if (player.x < -player.width / 2) player.x = canvas.width - player.width / 2;
  if (player.x > canvas.width - player.width / 2) player.x = -player.width / 2;

  // Copter
  const wasCoptering = player.isCoptering;
  player.isCoptering = keys.copter && player.velocityY > 0;

  if (player.isCoptering && !wasCoptering && comboSystem.count > 0) {
    comboSystem.resetOnCopter();
  }

  if (player.isCoptering && !wasCoptering) {
    sounds.copter.currentTime = 0;
    sounds.copter.play().catch(() => { });
  } else if (!player.isCoptering && wasCoptering) {
    sounds.copter.pause();
    sounds.copter.currentTime = 0;
  }

  // Gravity
  const currentGravity = player.isCoptering ? config.copterGravity : config.gravity;
  player.velocityY += currentGravity;

  // Ahoge
  if (player.isCoptering) {
    player.ahogeSpeed = 1.2;
    player.ahogeAngle += player.ahogeSpeed;
    player.shakeX = (Math.random() - 0.5) * 3;
  } else {
    player.ahogeSpeed = 0;
    player.shakeX = 0;
    player.frameCounter++;
    if (player.frameCounter % 10 === 0) {
      player.ahogeAngle = Math.sin(Date.now() / 200) * 0.3;
    }
  }

  player.y += player.velocityY;

  // Camera
  if (player.y < cameraY + canvas.height * 0.7) {
    cameraY = player.y - canvas.height * 0.7;
  }

  // Score
  const currentScore = Math.max(0, Math.floor((canvas.height - player.y) / 10));
  if (currentScore > score) {
    const scoreDiff = currentScore - score;
    score += Math.floor(scoreDiff * comboSystem.multiplier);
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('ahogeCopterHighScore', highScore);
    }
  }

  // Systems
  platformSystem.update(score);
  comboSystem.update();

  const coinResult = coinSystem.update(player, score, comboSystem.multiplier, cameraY);
  if (coinResult.bonusScore > 0) score += coinResult.bonusScore;
  if (coinResult.barrierEarned && !player.barrier) {
    player.barrier = true;
    playReverseSound(sounds.jump.src);
  }

  enemySystem.update(score, cameraY, player, { gameOver: () => gameOver = true });
  updateBackground();
  platformSystem.generateNew(cameraY, score, coinSystem, enemySystem);
  platformSystem.checkCollision(player, comboSystem);

  // Game over or Barrier save
  if (player.y - cameraY > canvas.height) {
    if (player.barrier) {
      player.barrier = false;
      player.velocityY = -20; // Super jump save
      sounds.break.currentTime = 0;
      sounds.break.play().catch(() => { });
    } else {
      gameOver = true;
      sounds.gameOver.currentTime = 0;
      sounds.gameOver.play().catch(() => { });
      sounds.copter.pause();
      sounds.copter.currentTime = 0;
    }
  }
}

function draw() {
  // Sky
  const skyColors = getSkyColor();
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, skyColors.top);
  gradient.addColorStop(1, skyColors.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stars
  if (score >= 500) {
    ctx.fillStyle = 'white';
    for (let i = 0; i < 30; i++) {
      const x = (i * 137.5) % canvas.width;
      const y = (i * 234.7 + cameraY * 0.05) % canvas.height;
      const size = (i % 3) + 1;
      ctx.fillRect(x, y, size, size);
    }
  }

  ctx.save();
  ctx.translate(0, -cameraY);

  // Background objects
  backgroundLayers.forEach(layer => {
    if (layer.type === 'mountain' && score >= 100) return;

    layer.objects.forEach(obj => {
      if (layer.type === 'cloud') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(obj.x, obj.y, obj.width / 2, obj.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (layer.type === 'mountain') {
        ctx.fillStyle = '#2D3748';
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y);
        ctx.lineTo(obj.x + obj.width / 2, obj.y - obj.height);
        ctx.lineTo(obj.x + obj.width, obj.y);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(obj.x + obj.width / 2, obj.y - obj.height);
        ctx.lineTo(obj.x + obj.width * 0.3, obj.y - obj.height * 0.6);
        ctx.lineTo(obj.x + obj.width * 0.7, obj.y - obj.height * 0.6);
        ctx.fill();
      }
    });
  });

  enemySystem.draw(ctx);
  platformSystem.draw(ctx);
  drawPlayer();
  coinSystem.draw(ctx);
  comboSystem.drawParticles(ctx);

  ctx.restore();

  uiSystem.drawScore(score, coinSystem.coinScore, highScore);
  comboSystem.drawUI(ctx, canvas);

  if (gameOver) {
    uiSystem.drawGameOver(score, highScore);
  }
}

function drawPlayer() {
  const drawX = player.x - player.width / 2 + player.shakeX;
  const drawY = player.y - player.height;

  ctx.save();

  const mainColor = player.barrier ? 'red' : 'blue';
  ctx.fillStyle = mainColor;
  ctx.fillRect(drawX, drawY, player.width, player.height);

  ctx.fillStyle = 'white';
  const sideMargin = player.width * 0.15;
  const strapWidth = player.width * 0.2;
  const strapHeight = player.height * 0.2;
  const chestY = drawY + strapHeight;
  const chestHeight = player.height - (strapHeight * 2);

  ctx.fillRect(drawX + sideMargin, chestY, player.width - (sideMargin * 2), chestHeight);
  ctx.fillRect(drawX + sideMargin, drawY, strapWidth, strapHeight);
  ctx.fillRect(drawX + player.width - sideMargin - strapWidth, drawY, strapWidth, strapHeight);

  ctx.save();
  ctx.translate(player.x + player.shakeX, drawY);
  ctx.rotate(player.ahogeAngle);

  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-4, -8);
  ctx.lineTo(0, -16);
  ctx.stroke();

  if (player.isCoptering) {
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -10, 18, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((player.ahogeAngle * 2 + i * Math.PI * 2 / 3));
      ctx.beginPath();
      ctx.moveTo(-18, -10);
      ctx.lineTo(18, -10);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (player.barrier) {
    const time = Date.now() / 1000;
    ctx.save();

    // Rotating outer ring
    ctx.translate(player.x + player.shakeX, drawY + player.height / 2);
    ctx.rotate(time);

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, player.width * 1.2, 0, Math.PI * 2);
    ctx.stroke();

    // Inner pulsing shield
    ctx.setLineDash([]);
    ctx.rotate(-time * 2);
    const pulse = 1 + Math.sin(time * 5) * 0.1;
    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, player.width * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Sparkles
    for (let i = 0; i < 4; i++) {
      const angle = (time * 2) + (i * Math.PI / 2);
      const dist = player.width * 1.2;
      const sx = Math.cos(angle) * dist;
      const sy = Math.sin(angle) * dist;

      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
}

function gameLoop() {
  update();
  draw();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function resetGame() {
  gameOver = false;
  score = 0;
  cameraY = 0;

  player.x = canvas.width / 2;
  player.y = canvas.height - 100;
  player.velocityX = 0;
  player.velocityY = 0;
  player.isCoptering = false;
  player.ahogeAngle = 0;
  player.shakeX = 0;

  comboSystem.reset();
  coinSystem.reset();
  enemySystem.reset();
  platformSystem.reset();

  sounds.copter.pause();
  sounds.copter.currentTime = 0;

  if (animationFrameId) cancelAnimationFrame(animationFrameId);

  platformSystem.generateInitial();
  initBackground();
  animationFrameId = requestAnimationFrame(gameLoop);
}

init();
