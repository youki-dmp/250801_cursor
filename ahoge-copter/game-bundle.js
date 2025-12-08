// Ahoge Copter - Complete Game (Non-Module Version for Local Development)

// === CONFIGURATION ===
const config = {
  gravity: 0.4,
  jumpSpeed: -12,
  springJumpSpeed: -18,
  moveSpeed: 5,
  copterGravity: 0.12,
  basePlatformSpacing: 80,
  platformWidth: 70,
  platformHeight: 15
};

const difficultyThresholds = [
  { score: 0, spacingMultiplier: 1.0, fragileRate: 0.15, movingSpeed: 2 },
  { score: 200, spacingMultiplier: 1.2, fragileRate: 0.25, movingSpeed: 2.5 },
  { score: 500, spacingMultiplier: 1.4, fragileRate: 0.35, movingSpeed: 3 },
  { score: 1000, spacingMultiplier: 1.6, fragileRate: 0.45, movingSpeed: 3.5 },
  { score: 2000, spacingMultiplier: 1.8, fragileRate: 0.55, movingSpeed: 4 }
];

const PlatformType = {
  NORMAL: 'normal',
  FRAGILE: 'fragile',
  MOVING: 'moving',
  SPRING: 'spring'
};

const comboTimeout = 2000;

// === INITIALIZATION ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

// Game state
let gameOver = false;
let score = 0;
let highScore = 0;
let cameraY = 0;
let animationFrameId = null;
let backgroundLayers = [];
let platforms = [];
let enemies = [];
let coins = [];
let coinScore = 0;
let coinParticles = [];
let comboCount = 0;
let comboMultiplier = 1.0;
let lastLandingTime = 0;
let lastPlatformId = null;
let comboParticles = [];

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

// === UTILITY FUNCTIONS ===
function getCurrentDifficulty() {
  for (let i = difficultyThresholds.length - 1; i >= 0; i--) {
    if (score >= difficultyThresholds[i].score) {
      return difficultyThresholds[i];
    }
  }
  return difficultyThresholds[0];
}

function getRandomPlatformType() {
  const difficulty = getCurrentDifficulty();
  const rand = Math.random();

  const normalRate = 0.6 - (difficulty.fragileRate - 0.15);
  const fragileRate = normalRate + difficulty.fragileRate;
  const movingRate = fragileRate + 0.15;

  if (rand < normalRate) return PlatformType.NORMAL;
  if (rand < fragileRate) return PlatformType.FRAGILE;
  if (rand < movingRate) return PlatformType.MOVING;
  return PlatformType.SPRING;
}

function getSkyColor() {
  if (score < 50) return { top: '#87CEEB', bottom: '#E0F7FA' };
  if (score < 200) return { top: '#B4D7E8', bottom: '#E8F4F8' };
  if (score < 500) return { top: '#E8F1F5', bottom: '#F0F8FF' };
  return { top: '#1a1a2e', bottom: '#16213e' };
}

// === COMBO SYSTEM ===
function updateComboMultiplier() {
  if (comboCount >= 20) {
    comboMultiplier = 3.0;
  } else if (comboCount >= 10) {
    comboMultiplier = 2.0;
  } else if (comboCount >= 5) {
    comboMultiplier = 1.5;
  } else {
    comboMultiplier = 1.0;
  }
}

function createComboParticle(x, y) {
  for (let i = 0; i < 10; i++) {
    comboParticles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y,
      vx: (Math.random() - 0.5) * 3,
      vy: -Math.random() * 3 - 2,
      life: 1.0,
      decay: 0.02,
      size: Math.random() * 4 + 2,
      color: `hsl(${60 + Math.random() * 60}, 100%, 50%)`
    });
  }
}

function updateComboParticles() {
  for (let i = comboParticles.length - 1; i >= 0; i--) {
    const p = comboParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life -= p.decay;

    if (p.life <= 0) {
      comboParticles.splice(i, 1);
    }
  }
}

function drawComboParticles() {
  comboParticles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// === COIN SYSTEM ===
function updateCoins() {
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    coin.rotation += 0.1;

    const dx = player.x - coin.x;
    const dy = (player.y - player.height / 2) - coin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < player.width / 2 + coin.size && !coin.collected) {
      coin.collected = true;
      coinScore++;
      const bonusScore = Math.floor(100 * comboMultiplier);
      score += bonusScore;

      if ([5, 15, 30].includes(coinScore) && !player.barrier) {
        player.barrier = true;
        sounds.spring.currentTime = 0;
        sounds.spring.play().catch(() => { });
      }

      createCoinParticles(coin.x, coin.y);
      sounds.jump.currentTime = 0;
      sounds.jump.play().catch(() => { });

      coins.splice(i, 1);
      continue;
    }

    if (coin.y > cameraY + canvas.height + 200) {
      coins.splice(i, 1);
    }
  }

  updateCoinParticles();
}

function createCoinParticles(x, y) {
  for (let i = 0; i < 15; i++) {
    coinParticles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 1.0,
      decay: 0.025,
      size: Math.random() * 3 + 2,
      color: `hsl(${45 + Math.random() * 15}, 100%, 50%)`
    });
  }
}

function updateCoinParticles() {
  for (let i = coinParticles.length - 1; i >= 0; i--) {
    const p = coinParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;

    if (p.life <= 0) {
      coinParticles.splice(i, 1);
    }
  }
}

function drawCoins() {
  coins.forEach(coin => {
    if (coin.collected) return;

    ctx.save();
    ctx.translate(coin.x, coin.y);
    ctx.rotate(coin.rotation);

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.arc(0, 0, coin.size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });

  coinParticles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// === ENEMY SYSTEM ===
function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
    enemy.animFrame++;

    // Wrap gyozas around screen
    if (enemy.type === 'gyoza') {
      if (enemy.x < -50) enemy.x = canvas.width + 50;
      if (enemy.x > canvas.width + 50) enemy.x = -50;
    }

    // Check collision with player (AABB)
    const playerLeft = player.x - player.width / 2;
    const playerRight = player.x + player.width / 2;
    const playerTop = player.y - player.height;
    const playerBottom = player.y;

    const enemyLeft = enemy.x - enemy.width / 2;
    const enemyRight = enemy.x + enemy.width / 2;
    const enemyTop = enemy.y - enemy.height / 2;
    const enemyBottom = enemy.y + enemy.height / 2;

    if (playerLeft < enemyRight && playerRight > enemyLeft &&
      playerTop < enemyBottom && playerBottom > enemyTop) {

      if (player.barrier) {
        player.barrier = false;
        sounds.break.currentTime = 0;
        sounds.break.play().catch(() => { });
        enemies.splice(i, 1);
        continue;
      } else {
        gameOver = true;
        sounds.gameOver.currentTime = 0;
        sounds.gameOver.play().catch(() => { });
        sounds.copter.pause();
        sounds.copter.currentTime = 0;
      }
    }

    // Remove enemies that are too far below (fallen off screen) or way too far above (sanity check)
    if (enemy.y > cameraY + canvas.height + 200 || enemy.y < cameraY - canvas.height * 2) {
      enemies.splice(i, 1);
    }
  }
}

function drawEnemies() {
  enemies.forEach(enemy => {
    ctx.save();
    if (enemy.type === 'gyoza') {
      const wobble = Math.sin(enemy.animFrame * 0.2) * 3;

      ctx.translate(enemy.x, enemy.y + wobble);
      // Flip if moving left
      if (enemy.vx < 0) ctx.scale(-1, 1);

      // Gyoza body (semi-circleish)
      ctx.fillStyle = '#F4E4BC'; // Dough color
      ctx.beginPath();
      ctx.arc(0, 0, 20, Math.PI, 0); // Top half
      ctx.lineTo(20, 10);
      ctx.quadraticCurveTo(0, 15, -20, 10);
      ctx.closePath();
      ctx.fill();

      // Grilled bottom
      ctx.fillStyle = '#D2691E'; // Brown
      ctx.beginPath();
      ctx.moveTo(-15, 8);
      ctx.quadraticCurveTo(0, 12, 15, 8);
      ctx.lineTo(12, 2);
      ctx.quadraticCurveTo(0, 6, -12, 2);
      ctx.fill();

      // Pleats
      ctx.strokeStyle = '#E6CFA0';
      ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5, -18);
        ctx.lineTo(i * 4, -10);
        ctx.stroke();
      }
    } else if (enemy.type === 'balloon') {
      const bounce = Math.sin(enemy.animFrame * 0.1) * 2;
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y + bounce, enemy.width / 2, enemy.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(enemy.x - 5, enemy.y - 5 + bounce, 5, 8, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y + enemy.height / 2 + bounce);
      ctx.lineTo(enemy.x, enemy.y + enemy.height / 2 + 15 + bounce);
      ctx.stroke();
    }
    ctx.restore();
  });
}

// === PLATFORM SYSTEM ===
function generateInitialPlatforms() {
  platforms = [];

  platforms.push({
    x: canvas.width / 2 - config.platformWidth / 2,
    y: canvas.height - 50,
    width: config.platformWidth,
    height: config.platformHeight,
    type: PlatformType.NORMAL,
    broken: false,
    moveDir: 1,
    moveSpeed: 2,
    id: Date.now() + Math.random()
  });

  let currentY = canvas.height - 50 - config.basePlatformSpacing;
  while (currentY > -500) {
    const type = getRandomPlatformType();
    const x = Math.random() * (canvas.width - config.platformWidth);

    platforms.push({
      x: x,
      y: currentY,
      width: config.platformWidth,
      height: config.platformHeight,
      type: type,
      broken: false,
      moveDir: Math.random() < 0.5 ? 1 : -1,
      moveSpeed: 2,
      id: Date.now() + Math.random()
    });

    currentY -= config.basePlatformSpacing + Math.random() * 40 - 20;
  }
}

function updatePlatforms() {
  platforms.forEach(p => {
    if (p.type === PlatformType.MOVING) {
      p.x += p.moveSpeed * p.moveDir;
      if (p.x <= 0 || p.x >= canvas.width - p.width) {
        p.moveDir *= -1;
      }
    }
  });
}

function generateNewPlatforms() {
  let highest = Math.min(...platforms.map(p => p.y));

  const difficulty = getCurrentDifficulty();
  const platformSpacing = config.basePlatformSpacing * difficulty.spacingMultiplier;

  while (highest > cameraY - canvas.height) {
    const type = getRandomPlatformType();
    const x = Math.random() * (canvas.width - config.platformWidth);
    highest -= platformSpacing + Math.random() * 40 - 20;

    platforms.push({
      x: x,
      y: highest,
      width: config.platformWidth,
      height: config.platformHeight,
      type: type,
      broken: false,
      moveDir: Math.random() < 0.5 ? 1 : -1,
      moveSpeed: difficulty.movingSpeed,
      id: Date.now() + Math.random()
    });

    // Spawn coin
    if (Math.random() < 0.3) {
      const coinX = x + Math.random() * config.platformWidth;
      const coinY = highest - 30 - Math.random() * 40;
      coins.push({
        x: coinX,
        y: coinY,
        size: 12,
        collected: false,
        rotation: Math.random() * Math.PI * 2
      });
    }

    // Spawn enemy
    if (score > 10 && Math.random() < 0.3) {
      const enemyType = Math.random() < 0.7 ? 'gyoza' : 'balloon';
      const enemyY = highest - 50 - Math.random() * 100;

      let vx = 0;
      let vy = 0;
      let enemyX = Math.random() * canvas.width;

      if (enemyType === 'gyoza') {
        // 50% chance to spawn from side
        if (Math.random() < 0.5) {
          const fromLeft = Math.random() < 0.5;
          enemyX = fromLeft ? -40 : canvas.width + 40;
          vx = fromLeft ? (2 + Math.random()) : -(2 + Math.random());
        } else {
          vx = Math.random() < 0.5 ? 2 : -2;
        }
      } else if (enemyType === 'balloon') {
        vy = -0.5;
      }

      enemies.push({
        x: enemyX,
        y: enemyY,
        type: enemyType,
        width: enemyType === 'gyoza' ? 40 : 25,
        height: enemyType === 'gyoza' ? 25 : 35,
        vx: vx,
        vy: vy,
        animFrame: 0
      });
    }
  }

  platforms = platforms.filter(p => p.y < cameraY + canvas.height + 100);
}

function checkPlatformCollision() {
  player.isOnPlatform = false;

  platforms.forEach(platform => {
    if (platform.broken) return;

    if (player.velocityY > 0) {
      const playerBottom = player.y;
      const playerCenterX = player.x;

      if (playerBottom >= platform.y &&
        playerBottom <= platform.y + platform.height + player.velocityY &&
        playerCenterX >= platform.x &&
        playerCenterX <= platform.x + platform.width) {

        player.y = platform.y;
        player.isOnPlatform = true;

        // Combo
        if (lastPlatformId !== platform.id) {
          comboCount++;
          lastLandingTime = Date.now();
          updateComboMultiplier();
          lastPlatformId = platform.id;

          if (comboCount % 5 === 0) {
            createComboParticle(player.x, player.y - 30);
            sounds.jump.currentTime = 0;
            sounds.jump.play().catch(() => { });
          }
        }

        // Jump
        if (platform.type === PlatformType.SPRING) {
          player.velocityY = config.springJumpSpeed;
          sounds.spring.currentTime = 0;
          sounds.spring.play().catch(() => { });
        } else {
          player.velocityY = config.jumpSpeed;
          sounds.jump.currentTime = 0;
          sounds.jump.play().catch(() => { });
        }

        // Break fragile
        if (platform.type === PlatformType.FRAGILE) {
          platform.broken = true;
          sounds.break.currentTime = 0;
          sounds.break.play().catch(() => { });
        }
      }
    }
  });
}

function drawPlatforms() {
  platforms.forEach(platform => {
    if (platform.broken) {
      ctx.globalAlpha = 0.3;
    }

    switch (platform.type) {
      case PlatformType.NORMAL:
        ctx.fillStyle = '#4CAF50';
        break;
      case PlatformType.FRAGILE:
        ctx.fillStyle = '#8D6E63';
        break;
      case PlatformType.MOVING:
        ctx.fillStyle = '#2196F3';
        break;
      case PlatformType.SPRING:
        ctx.fillStyle = '#FF9800';
        break;
    }

    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    if (platform.type === PlatformType.SPRING) {
      ctx.strokeStyle = '#F57C00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(platform.x + 10 + i * 20, platform.y + 5);
        ctx.lineTo(platform.x + 15 + i * 20, platform.y + 10);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  });
}

// === BACKGROUND ===
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

// === DRAW FUNCTIONS ===
function drawPlayer() {
  const drawX = player.x - player.width / 2 + player.shakeX;
  const drawY = player.y - player.height;

  ctx.save();

  ctx.fillStyle = 'blue';
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

  ctx.strokeStyle = 'blue';
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
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(player.x + player.shakeX, drawY + player.height / 2, player.width, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
}

function drawUI() {
  ctx.fillStyle = 'black';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.font = '24px Arial';
  ctx.textAlign = 'left';

  const drawText = (text, x, y, color = 'black') => {
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  };

  drawText(`Score: ${score}`, 10, 30);
  drawText(`Coins: ${coinScore}`, 10, 60, '#FFD700');
  drawText(`Best: ${highScore}`, 10, 90);

  if (gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const boxWidth = 350;
    const boxHeight = 300;
    const boxX = canvas.width / 2 - boxWidth / 2;
    const boxY = canvas.height / 2 - boxHeight / 2;
    const radius = 20;

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(boxX + radius, boxY);
    ctx.lineTo(boxX + boxWidth - radius, boxY);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
    ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
    ctx.lineTo(boxX + radius, boxY + boxHeight);
    ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
    ctx.lineTo(boxX, boxY + radius);
    ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);

    ctx.font = '28px Arial';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText(`Best: ${highScore}`, canvas.width / 2, canvas.height / 2 + 50);

    ctx.font = '20px Arial';
    ctx.fillText('Click to restart', canvas.width / 2, canvas.height / 2 + 100);
  }
}

function drawComboUI() {
  if (comboCount < 2) return;

  ctx.save();
  ctx.textAlign = 'center';

  const pulseScale = 1 + Math.sin(Date.now() / 100) * 0.1;
  ctx.font = `bold ${30 * pulseScale}px Arial`;
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 4;
  ctx.fillStyle = comboMultiplier >= 3.0 ? '#FF4500' : comboMultiplier >= 2.0 ? '#FF8C00' : '#FFD700';

  const comboText = `${comboCount} COMBO!`;
  ctx.strokeText(comboText, canvas.width / 2, 120);
  ctx.fillText(comboText, canvas.width / 2, 120);

  ctx.font = '20px Arial';
  ctx.fillStyle = 'white';
  const multText = `×${comboMultiplier.toFixed(1)}`;
  ctx.strokeText(multText, canvas.width / 2, 150);
  ctx.fillText(multText, canvas.width / 2, 150);

  ctx.restore();
}

function draw() {
  const skyColors = getSkyColor();
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, skyColors.top);
  gradient.addColorStop(1, skyColors.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  drawEnemies();
  drawPlatforms();
  drawPlayer();
  drawCoins();
  drawComboParticles();

  ctx.restore();

  drawUI();
  drawComboUI();
}

// === UPDATE FUNCTION ===
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

  if (player.isCoptering && !wasCoptering && comboCount > 0) {
    comboCount = 0;
    updateComboMultiplier();
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
    score += Math.floor(scoreDiff * comboMultiplier);
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('ahogeCopterHighScore', highScore);
    }
  }

  // Combo timeout
  if (comboCount > 0 && Date.now() - lastLandingTime > comboTimeout) {
    comboCount = 0;
    updateComboMultiplier();
  }

  // Systems
  updatePlatforms();
  updateComboParticles();
  updateCoins();
  updateEnemies();
  updateBackground();
  generateNewPlatforms();
  checkPlatformCollision();

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

// === GAME LOOP ===
function gameLoop() {
  update();
  draw();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// === CONTROLS ===
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
  player.barrier = false;

  comboCount = 0;
  comboMultiplier = 1.0;
  lastPlatformId = null;
  comboParticles = [];

  coins = [];
  coinScore = 0;
  coinParticles = [];

  enemies = [];

  sounds.copter.pause();
  sounds.copter.currentTime = 0;

  if (animationFrameId) cancelAnimationFrame(animationFrameId);

  generateInitialPlatforms();
  initBackground();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// === INITIALIZATION ===
function init() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const saved = localStorage.getItem('ahogeCopterHighScore');
  if (saved) highScore = parseInt(saved, 10);

  player.x = canvas.width / 2;
  player.y = canvas.height - 100;

  generateInitialPlatforms();
  initBackground();
  setupControls();

  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(gameLoop);
}

init();
