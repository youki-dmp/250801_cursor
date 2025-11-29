// --- CANVAS SETUP ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- BUTTONS ---
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const copterButton = document.getElementById('copterButton');

// --- GAME CONFIG ---
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

// --- DIFFICULTY SCALING ---
const difficultyThresholds = [
  { score: 0, spacingMultiplier: 1.0, fragileRate: 0.15, movingSpeed: 2 },
  { score: 200, spacingMultiplier: 1.2, fragileRate: 0.25, movingSpeed: 2.5 },
  { score: 500, spacingMultiplier: 1.4, fragileRate: 0.35, movingSpeed: 3 },
  { score: 1000, spacingMultiplier: 1.6, fragileRate: 0.45, movingSpeed: 3.5 },
  { score: 2000, spacingMultiplier: 1.8, fragileRate: 0.55, movingSpeed: 4 }
];

// --- GAME STATE ---
let gameOver = false;
let score = 0;
let highScore = 0;
let cameraY = 0;
let animationFrameId = null; // Track animation frame

// --- COMBO SYSTEM ---
let comboCount = 0;
let comboMultiplier = 1.0;
let lastLandingTime = 0;
const comboTimeout = 2000; // 2 seconds to maintain combo
let comboParticles = [];

// --- COIN SYSTEM ---
let coins = [];
let coinScore = 0;
let coinParticles = [];

// --- ENEMY SYSTEM ---
let enemies = [];
let lastPlatformId = null; // Track last platform for combo

// --- PLAYER ---
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
  shakeX: 0  // For copter shake effect
};

// --- PLATFORMS ---
let platforms = [];

// --- PLATFORM TYPES ---
const PlatformType = {
  NORMAL: 'normal',
  FRAGILE: 'fragile',
  MOVING: 'moving',
  SPRING: 'spring'
};

// --- CONTROLS ---
const keys = {
  left: false,
  right: false,
  copter: false
};

// --- SOUND EFFECTS ---
const sounds = {
  jump: new Audio('../common_se/maou_se_magic_wind02.wav'),
  spring: new Audio('../common_se/maou_se_magical08.wav'),
  break: new Audio('../common_se/maou_se_magical22.wav'),
  gameOver: new Audio('../common_se/maou_se_magic_water02.wav'),
  copter: new Audio('../common_se/maou_se_magical30.wav')
};

// Set playback rates
sounds.break.playbackRate = 2.0;
sounds.copter.playbackRate = 2.0;
sounds.copter.loop = true;  // Loop copter sound

// Set volume to 50%
Object.values(sounds).forEach(sound => {
  sound.volume = 0.5;
});

// Preload all sounds
Object.values(sounds).forEach(sound => {
  sound.load();
});

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(e => console.log('Sound play failed:', e));
}

function stopSound(sound) {
  sound.pause();
  sound.currentTime = 0;
}

// --- BACKGROUND ---
let backgroundLayers = [];

function initBackground() {
  backgroundLayers = [
    { type: 'cloud', objects: [], speedRatio: 0.1, yRange: [0, 300] },
    { type: 'mountain', objects: [], speedRatio: 0.3, yRange: [400, 500] }
  ];

  // Initialize clouds
  for (let i = 0; i < 5; i++) {
    addBackgroundObject(backgroundLayers[0], Math.random() * canvas.width, -cameraY);
  }

  // Initialize mountains (only once, grounded)
  // Single large mountain in center (Mt. Fuji style)
  const layer = backgroundLayers[1];
  const size = 200; // Large mountain
  const obj = {
    x: canvas.width / 2 - size * 1.5, // Center the mountain
    y: canvas.height, // Ground level
    size: size,
    width: size * 3,
    height: size * 2.5
  };
  layer.objects.push(obj);
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
  } else if (layer.type === 'mountain') {
    obj.width = obj.size * 2.5;
    obj.height = obj.size * 1.5;
  }

  layer.objects.push(obj);
}

function updateBackground() {
  backgroundLayers.forEach(layer => {
    // Only update clouds, not mountains
    if (layer.type === 'mountain') return;

    // Remove objects that are too far below
    layer.objects = layer.objects.filter(obj => obj.y < cameraY + canvas.height + 200);

    // Add new objects above
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
  // Change sky color based on height
  if (score < 50) {
    return { top: '#87CEEB', bottom: '#E0F7FA' }; // Day
  } else if (score < 200) {
    return { top: '#B4D7E8', bottom: '#E8F4F8' }; // Higher sky
  } else if (score < 500) {
    return { top: '#E8F1F5', bottom: '#F0F8FF' }; // Very high
  } else {
    return { top: '#1a1a2e', bottom: '#16213e' }; // Space
  }
}

// --- INIT ---
function init() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Load high score
  const saved = localStorage.getItem('ahogeCopterHighScore');
  if (saved) highScore = parseInt(saved, 10);

  // Initial player position
  player.x = canvas.width / 2;
  player.y = canvas.height - 100;

  // Generate initial platforms
  generateInitialPlatforms();

  // Initialize background
  initBackground();

  // Event listeners
  setupControls();

  // Start game loop
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

function setupControls() {
  // Keyboard
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

  // Touch buttons
  leftButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys.left = true; });
  leftButton.addEventListener('touchend', (e) => { e.preventDefault(); keys.left = false; });
  leftButton.addEventListener('mousedown', () => keys.left = true);
  leftButton.addEventListener('mouseup', () => keys.left = false);

  rightButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys.right = true; });
  rightButton.addEventListener('touchend', (e) => { e.preventDefault(); keys.right = false; });
  rightButton.addEventListener('mousedown', () => keys.right = true);
  rightButton.addEventListener('mouseup', () => keys.right = false);

  copterButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys.copter = true; });
  copterButton.addEventListener('touchend', (e) => { e.preventDefault(); keys.copter = false; });
  copterButton.addEventListener('mousedown', () => keys.copter = true);
  copterButton.addEventListener('mouseup', () => keys.copter = false);

  // Click to restart
  canvas.addEventListener('click', () => { if (gameOver) resetGame(); });
}

// --- PLATFORM GENERATION ---
function generateInitialPlatforms() {
  platforms = [];

  // Starting platform
  platforms.push({
    x: canvas.width / 2 - config.platformWidth / 2,
    y: canvas.height - 50,
    width: config.platformWidth,
    height: config.platformHeight,
    type: PlatformType.NORMAL,
    broken: false,
    moveDir: 1,
    moveSpeed: 2
  });

  // Generate upward platforms
  let currentY = canvas.height - 50 - config.platformSpacing;
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
      id: Date.now() + Math.random() // Unique ID for combo tracking
    });

    currentY -= config.platformSpacing + Math.random() * 40 - 20;
  }
}

function getRandomPlatformType() {
  const difficulty = getCurrentDifficulty();
  const rand = Math.random();

  // Adjust spawn rates based on difficulty
  const normalRate = 0.6 - (difficulty.fragileRate - 0.15);
  const fragileRate = normalRate + difficulty.fragileRate;
  const movingRate = fragileRate + 0.15;

  if (rand < normalRate) return PlatformType.NORMAL;
  if (rand < fragileRate) return PlatformType.FRAGILE;
  if (rand < movingRate) return PlatformType.MOVING;
  return PlatformType.SPRING;
}

function generateNewPlatforms() {
  // Find highest platform
  let highest = Math.min(...platforms.map(p => p.y));

  const difficulty = getCurrentDifficulty();
  const platformSpacing = config.basePlatformSpacing * difficulty.spacingMultiplier;

  // Generate new platforms above
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
      id: Date.now() + Math.random() // Unique ID for combo tracking
    });

    // Sometimes spawn coins near platforms
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

    // Spawn enemies at higher scores
    if (score > 100 && Math.random() < 0.15) {
      const enemyType = Math.random() < 0.6 ? 'bird' : 'balloon';
      const enemyX = Math.random() * canvas.width;
      const enemyY = highest - 50 - Math.random() * 100;

      enemies.push({
        x: enemyX,
        y: enemyY,
        type: enemyType,
        width: enemyType === 'bird' ? 30 : 25,
        height: enemyType === 'bird' ? 20 : 35,
        vx: enemyType === 'bird' ? (Math.random() < 0.5 ? 2 : -2) : 0,
        vy: enemyType === 'balloon' ? -0.5 : 0,
        animFrame: 0
      });
    }
  }

  // Remove platforms below screen
  platforms = platforms.filter(p => p.y < cameraY + canvas.height + 100);
}

// --- UPDATE ---
function update() {
  if (gameOver) return;

  // Horizontal movement
  if (keys.left) player.velocityX = -config.moveSpeed;
  else if (keys.right) player.velocityX = config.moveSpeed;
  else player.velocityX = 0;

  player.x += player.velocityX;

  // Wrap around screen
  if (player.x < -player.width / 2) player.x = canvas.width - player.width / 2;
  if (player.x > canvas.width - player.width / 2) player.x = -player.width / 2;

  // Copter mode
  const wasCoptering = player.isCoptering;
  player.isCoptering = keys.copter && player.velocityY > 0;

  // Reset combo when using copter
  if (player.isCoptering && !wasCoptering && comboCount > 0) {
    comboCount = 0;
    updateComboMultiplier();
  }

  // Handle copter sound
  if (player.isCoptering && !wasCoptering) {
    playSound(sounds.copter);
  } else if (!player.isCoptering && wasCoptering) {
    stopSound(sounds.copter);
  }

  // Apply gravity
  const currentGravity = player.isCoptering ? config.copterGravity : config.gravity;
  player.velocityY += currentGravity;

  // Ahoge animation
  if (player.isCoptering) {
    player.ahogeSpeed = 1.2;  // Faster rotation
    player.ahogeAngle += player.ahogeSpeed;

    // Shake effect
    player.shakeX = (Math.random() - 0.5) * 3;
  } else {
    player.ahogeSpeed = 0;
    player.shakeX = 0;
    // Bob naturally
    player.frameCounter++;
    if (player.frameCounter % 10 === 0) {
      player.ahogeAngle = Math.sin(Date.now() / 200) * 0.3;
    }
  }
  player.y += player.velocityY;

  // Camera follows player upward
  if (player.y < cameraY + canvas.height * 0.4) {
    cameraY = player.y - canvas.height * 0.4;
  }

  // Update score (height)
  const currentScore = Math.max(0, Math.floor((canvas.height - player.y) / 10));
  if (currentScore > score) {
    const scoreDiff = currentScore - score;
    score += Math.floor(scoreDiff * comboMultiplier); // Apply combo multiplier
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('ahogeCopterHighScore', highScore);
    }
  }

  // Check combo timeout
  if (comboCount > 0 && Date.now() - lastLandingTime > comboTimeout) {
    comboCount = 0;
    updateComboMultiplier();
  }

  // Update combo particles
  updateComboParticles();

  // Update moving platforms
  platforms.forEach(p => {
    if (p.type === PlatformType.MOVING) {
      p.x += p.moveSpeed * p.moveDir;
      if (p.x <= 0 || p.x >= canvas.width - p.width) {
        p.moveDir *= -1;
      }
    }
  });

  // Update background
  updateBackground();

  // Collision detection
  checkCollisions();

  // Generate new platforms
  generateNewPlatforms();

  // Update coins
  updateCoins();

  // Update enemies
  updateEnemies();

  // Game over if player falls below screen
  if (player.y - cameraY > canvas.height) {
    gameOver = true;
    playSound(sounds.gameOver);
    stopSound(sounds.copter); // Stop copter sound on game over
  }
}

function checkCollisions() {
  player.isOnPlatform = false;

  platforms.forEach(platform => {
    if (platform.broken) return;

    // Only check if player is falling
    if (player.velocityY > 0) {
      const playerBottom = player.y;  // player.y is already the bottom (feet position)
      const playerCenterX = player.x;

      if (playerBottom >= platform.y &&
        playerBottom <= platform.y + platform.height + player.velocityY &&
        playerCenterX >= platform.x &&
        playerCenterX <= platform.x + platform.width) {

        // Land on platform
        player.y = platform.y;  // Set feet directly on platform top
        player.isOnPlatform = true;

        // Increase combo only if it's a different platform
        if (lastPlatformId !== platform.id) {
          comboCount++;
          lastLandingTime = Date.now();
          updateComboMultiplier();
          lastPlatformId = platform.id;

          // Combo particle effect
          if (comboCount % 5 === 0) {
            createComboParticle(player.x, player.y - 30);
            playSound(sounds.jump); // Extra sound for combo milestone
          }
        }

        // Jump based on platform type
        if (platform.type === PlatformType.SPRING) {
          player.velocityY = config.springJumpSpeed;
          playSound(sounds.spring);
        } else {
          player.velocityY = config.jumpSpeed;
          playSound(sounds.jump);
        }

        // Break fragile platform
        if (platform.type === PlatformType.FRAGILE) {
          platform.broken = true;
          playSound(sounds.break);
        }
      }
    }
  });
}

// --- DRAW ---
function draw() {
  // Sky gradient based on height
  const skyColors = getSkyColor();
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, skyColors.top);
  gradient.addColorStop(1, skyColors.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw stars if in space
  if (score >= 500) {
    ctx.fillStyle = 'white';
    for (let i = 0; i < 30; i++) {
      const x = (i * 137.5) % canvas.width;
      const y = (i * 234.7 + cameraY * 0.05) % canvas.height;
      const size = (i % 3) + 1;
      ctx.fillRect(x, y, size, size);
    }
  }

  // Save context for camera
  ctx.save();
  ctx.translate(0, -cameraY);

  // Draw background objects
  backgroundLayers.forEach(layer => {
    // Mountains only show below score 100
    if (layer.type === 'mountain' && score >= 100) return;

    layer.objects.forEach(obj => {
      if (layer.type === 'cloud') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(obj.x, obj.y, obj.width / 2, obj.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (layer.type === 'mountain') {
        // Mt. Fuji style - dark blue-gray
        ctx.fillStyle = '#2D3748';
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y);
        ctx.lineTo(obj.x + obj.width / 2, obj.y - obj.height);
        ctx.lineTo(obj.x + obj.width, obj.y);
        ctx.fill();

        // Snow cap (larger for Mt. Fuji)
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(obj.x + obj.width / 2, obj.y - obj.height);
        ctx.lineTo(obj.x + obj.width * 0.3, obj.y - obj.height * 0.6);
        ctx.lineTo(obj.x + obj.width * 0.7, obj.y - obj.height * 0.6);
        ctx.fill();
      }
    });
  });
}

// --- COMBO SYSTEM FUNCTIONS ---
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
      color: `hsl(${60 + Math.random() * 60}, 100%, 50%)` // Yellow-orange
    });
  }
}

function updateComboParticles() {
  for (let i = comboParticles.length - 1; i >= 0; i--) {
    const p = comboParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1; // Gravity
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

// --- DIFFICULTY SCALING FUNCTIONS ---
function getCurrentDifficulty() {
  // Find appropriate difficulty threshold
  for (let i = difficultyThresholds.length - 1; i >= 0; i--) {
    if (score >= difficultyThresholds[i].score) {
      return difficultyThresholds[i];
    }
  }
  return difficultyThresholds[0];
}

// --- COIN SYSTEM FUNCTIONS ---
function updateCoins() {
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];

    // Rotate coin for animation
    coin.rotation += 0.1;

    // Check collision with player
    const dx = player.x - coin.x;
    const dy = (player.y - player.height / 2) - coin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < player.width / 2 + coin.size && !coin.collected) {
      // Collect coin
      coin.collected = true;
      coinScore++;
      const bonusScore = Math.floor(100 * comboMultiplier);
      score += bonusScore;

      // Sparkle effect
      createCoinParticles(coin.x, coin.y);

      // Play sound (reuse jump sound for now)
      playSound(sounds.jump);

      coins.splice(i, 1);
      continue;
    }

    // Remove coins that are too far below
    if (coin.y > cameraY + canvas.height + 200) {
      coins.splice(i, 1);
    }
  }

  // Update coin particles
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
      color: `hsl(${45 + Math.random() * 15}, 100%, 50%)` // Gold
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

    // Gold coin
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner detail
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.arc(0, 0, coin.size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

function drawCoinParticles() {
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

// --- DRAW ---
function draw() {
  // Sky gradient based on height
  const skyColors = getSkyColor();
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, skyColors.top);
  gradient.addColorStop(1, skyColors.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw stars if in space
  if (score >= 500) {
    ctx.fillStyle = 'white';
    for (let i = 0; i < 30; i++) {
      const x = (i * 137.5) % canvas.width;
      const y = (i * 234.7 + cameraY * 0.05) % canvas.height;
      const size = (i % 3) + 1;
      ctx.fillRect(x, y, size, size);
    }
  }

  // Save context for camera
  ctx.save();
  ctx.translate(0, -cameraY);

  // Draw background objects
  backgroundLayers.forEach(layer => {
    // Mountains only show below score 100
    if (layer.type === 'mountain' && score >= 100) return;

    layer.objects.forEach(obj => {
      if (layer.type === 'cloud') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(obj.x, obj.y, obj.width / 2, obj.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (layer.type === 'mountain') {
        // Mt. Fuji style - dark blue-gray
        ctx.fillStyle = '#2D3748';
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y);
        ctx.lineTo(obj.x + obj.width / 2, obj.y - obj.height);
        ctx.lineTo(obj.x + obj.width, obj.y);
        ctx.fill();

        // Snow cap (larger for Mt. Fuji)
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(obj.x + obj.width / 2, obj.y - obj.height);
        ctx.lineTo(obj.x + obj.width * 0.3, obj.y - obj.height * 0.6);
        ctx.lineTo(obj.x + obj.width * 0.7, obj.y - obj.height * 0.6);
        ctx.fill();
      }
    });
  });

  // Draw enemies
  drawEnemies();

  // Draw platforms
  platforms.forEach(platform => {
    if (platform.broken) {
      // Broken platform (fading)
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

    // Spring coil effect
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

  // Draw player
  drawPlayer();

  // Draw coins
  drawCoins();

  // Draw combo particles
  drawComboParticles();

  // Draw coin particles
  drawCoinParticles();

  ctx.restore();

  // Draw UI
  drawUI();

  // Draw combo UI (on top)
  drawComboUI();
}

function drawPlayer() {
  const drawX = player.x - player.width / 2 + player.shakeX;  // Add shake
  const drawY = player.y - player.height;

  ctx.save();

  // Body (blue rectangle)
  ctx.fillStyle = 'blue';
  ctx.fillRect(drawX, drawY, player.width, player.height);

  // Tank top (white)
  ctx.fillStyle = 'white';
  const sideMargin = player.width * 0.15;
  const strapWidth = player.width * 0.2;
  const strapHeight = player.height * 0.2;
  const chestY = drawY + strapHeight;
  const chestHeight = player.height - (strapHeight * 2);

  ctx.fillRect(drawX + sideMargin, chestY, player.width - (sideMargin * 2), chestHeight);
  ctx.fillRect(drawX + sideMargin, drawY, strapWidth, strapHeight);
  ctx.fillRect(drawX + player.width - sideMargin - strapWidth, drawY, strapWidth, strapHeight);

  // Ahoge (cowlick)
  ctx.save();
  ctx.translate(player.x + player.shakeX, drawY);  // Add shake to ahoge too
  ctx.rotate(player.ahogeAngle);

  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-4, -8);
  ctx.lineTo(0, -16);
  ctx.stroke();

  // Copter blades when active
  if (player.isCoptering) {
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.4)';
    ctx.lineWidth = 2;

    // Spinning circle effect
    ctx.beginPath();
    ctx.arc(0, -10, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Blades (multiple for motion blur effect)
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

    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    drawText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);

    ctx.font = '28px Arial';
    drawText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    drawText(`Best: ${highScore}`, canvas.width / 2, canvas.height / 2 + 50);

    ctx.font = '20px Arial';
    drawText('Click to restart', canvas.width / 2, canvas.height / 2 + 100);
  }
}

function drawComboUI() {
  if (comboCount < 2) return; // Only show when combo is active

  ctx.save();
  ctx.textAlign = 'center';

  // Combo count
  const pulseScale = 1 + Math.sin(Date.now() / 100) * 0.1;
  ctx.font = `bold ${30 * pulseScale}px Arial`;
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 4;
  ctx.fillStyle = comboMultiplier >= 3.0 ? '#FF4500' : comboMultiplier >= 2.0 ? '#FF8C00' : '#FFD700';

  const comboText = `${comboCount} COMBO!`;
  ctx.strokeText(comboText, canvas.width / 2, 120);
  ctx.fillText(comboText, canvas.width / 2, 120);

  // Multiplier
  ctx.font = '20px Arial';
  ctx.fillStyle = 'white';
  const multText = `×${comboMultiplier.toFixed(1)}`;
  ctx.strokeText(multText, canvas.width / 2, 150);
  ctx.fillText(multText, canvas.width / 2, 150);

  ctx.restore();
}

// --- GAME LOOP ---
function gameLoop() {
  update();
  draw();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// --- RESET ---
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

  // Reset combo
  comboCount = 0;
  comboMultiplier = 1.0;
  lastLandingTime = 0;
  comboParticles = [];

  // Reset coins
  coins = [];
  coinScore = 0;
  coinParticles = [];

  // Stop copter sound if playing
  stopSound(sounds.copter);

  // Cancel existing game loop and start new one
  if (animationFrameId) cancelAnimationFrame(animationFrameId);

  generateInitialPlatforms();
  initBackground();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// --- START ---
init();
