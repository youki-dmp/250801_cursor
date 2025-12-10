// Version: 0.5 (Double Jump & More Patterns)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const jumpButton = document.getElementById('jumpButton');
const specialNotification = document.getElementById('special-notification');

// --- Audio Assets ---
const jumpSound = new Audio('../common_se/maou_se_magical30.wav');
const gameOverSound = new Audio('../common_se/maou_se_magic_fire04.wav');

// --- Game Configuration ---
const gravity = 0.8;
const initialJumpStrength = -10;
const doubleJumpStrength = -12; // A bit stronger for the second jump
const jumpHoldStrength = 0.5;
const maxJumpHoldFrames = 12;
const initialGameSpeed = 4;
const maxGameSpeed = 15;
const backgroundColors = ['#eeeeee', '#e0f7fa', '#fff9c4', '#ffcdd2', '#d1c4e9'];
const minObstacleGap = 250; // Obstacle generation gap
const maxObstacles = 3;     // Max obstacles on screen at once

// --- Player State ---
const player = {
    x: 150, // Will be updated on resize
    y: 0,   // Will be updated on resize
    width: 40,
    height: 50,
    velocityY: 0,
    isJumping: false,
    jumpCount: 0,
    maxJumps: 2,
    isSpinning: false,
    rotation: 0,
    isJumpKeyDown: false,
    jumpHoldFrames: 0,
    animationFrames: [
        { w: 40, h: 50 }, { w: 42, h: 48 }, { w: 40, h: 50 }, { w: 38, h: 52 },
    ],
    currentFrame: 0,
    frameCounter: 0,
    frameDelay: 6,
    ahogeAngle: 0.3, // For the cowlick animation
    ahogeDirection: 1,
    isSliding: false,
    slideTimer: 0,
    maxSlideFrames: 45, // Duration of slide
    originalHeight: 50,
    slideHeight: 25,
};

// --- Game State ---
let obstacles = [];
let coins = []; // Coin array
let score = 0;
let coinScore = 0; // Separate score for coins
let highScore = 0;
let scoreLevel = 0;
let speedLevel = 0;
let backgroundColorIndex = 0;
let gameOver = false;
let gameSpeed = initialGameSpeed;
let obstacleTimer = 0;
let obstacleInterval = 120; // Initial interval before the first obstacle
let lastMilestone = 0;
let gameOverTimer = 0; // Timer for game over animation

// --- Milestone Animation State ---
const milestoneAnimation = {
    isActive: false,
    progress: 0,
    duration: 1.2 * 60, // 1.2 seconds in frames (assuming 60fps)
    text: "",
    color: "red", // Default color
};

// --- Confetti State --- 👈 ここから追加
let confettiParticles = [];
const maxConfetti = 500;
const confettiColors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3', '#ffffff', '#cccccc'];

// --- Ground ---
let groundY;

// --- Day/Night Cycle State ---
const dayNightCycle = {
    phase: 'day', // day, sunset, night, sunrise
    skyTop: '#87CEEB',
    skyBottom: '#E0F7FA',
    cloudColor: 'rgba(255, 255, 255, 0.6)',
    mountainColor: '#795548',
    hillColor: '#8bc34a',
    darknessOverlay: 0, // 0 to 0.7 (alpha for black overlay on ground/player)
    starsOpacity: 0
};

// Color Palettes
const palettes = {
    day: { skyTop: [135, 206, 235], skyBottom: [224, 247, 250], cloud: [255, 255, 255], mountain: [121, 85, 72], hill: [139, 195, 74], darkness: 0, stars: 0 },
    sunset: { skyTop: [255, 120, 80], skyBottom: [100, 50, 120], cloud: [255, 200, 180], mountain: [100, 60, 50], hill: [100, 120, 50], darkness: 0.2, stars: 0.2 },
    night: { skyTop: [10, 10, 50], skyBottom: [20, 20, 80], cloud: [100, 100, 120], mountain: [40, 30, 40], hill: [30, 50, 30], darkness: 0.6, stars: 1 },
    sunrise: { skyTop: [100, 150, 200], skyBottom: [255, 200, 150], cloud: [255, 240, 220], mountain: [100, 80, 70], hill: [120, 160, 80], darkness: 0.2, stars: 0 }
};

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function lerpColor(c1, c2, t) {
    const r = Math.round(lerp(c1[0], c2[0], t));
    const g = Math.round(lerp(c1[1], c2[1], t));
    const b = Math.round(lerp(c1[2], c2[2], t));
    return `rgb(${r}, ${g}, ${b})`;
}

function updateDayNightCycle() {
    // Cycle: 6000 points total
    // 0-1500: Day -> Sunset
    // 1500-3000: Sunset -> Night
    // 3000-4500: Night -> Sunrise
    // 4500-6000: Sunrise -> Day

    const cyclePos = score % 6000;
    let p1, p2, t;

    if (cyclePos < 1500) {
        p1 = palettes.day; p2 = palettes.sunset; t = cyclePos / 1500;
    } else if (cyclePos < 3000) {
        p1 = palettes.sunset; p2 = palettes.night; t = (cyclePos - 1500) / 1500;
    } else if (cyclePos < 4500) {
        p1 = palettes.night; p2 = palettes.sunrise; t = (cyclePos - 3000) / 1500;
    } else {
        p1 = palettes.sunrise; p2 = palettes.day; t = (cyclePos - 4500) / 1500;
    }

    dayNightCycle.skyTop = lerpColor(p1.skyTop, p2.skyTop, t);
    dayNightCycle.skyBottom = lerpColor(p1.skyBottom, p2.skyBottom, t);
    dayNightCycle.cloudColor = `rgba(${Math.round(lerp(p1.cloud[0], p2.cloud[0], t))}, ${Math.round(lerp(p1.cloud[1], p2.cloud[1], t))}, ${Math.round(lerp(p1.cloud[2], p2.cloud[2], t))}, 0.6)`;
    dayNightCycle.mountainColor = lerpColor(p1.mountain, p2.mountain, t);
    dayNightCycle.hillColor = lerpColor(p1.hill, p2.hill, t);
    dayNightCycle.darknessOverlay = lerp(p1.darkness, p2.darkness, t);
    dayNightCycle.starsOpacity = lerp(p1.stars, p2.stars, t);
}

// --- Parallax Background State ---
const backgroundLayers = [
    { speedRatio: 0.1, objects: [], type: 'star', yRange: [0, 200] }, // Add stars layer
    { speedRatio: 0.1, objects: [], type: 'cloud', yRange: [0, 150] },
    { speedRatio: 0.2, objects: [], type: 'mountain', yRange: [150, 250] },
    { speedRatio: 0.5, objects: [], type: 'hill', yRange: [200, 300] }
];

function initBackground() {
    backgroundLayers.forEach(layer => {
        layer.objects = [];
        // Initial population
        const count = layer.type === 'star' ? 30 : 5;
        for (let i = 0; i < count; i++) {
            addBackgroundObject(layer, Math.random() * canvas.width);
        }
    });
}

function addBackgroundObject(layer, xOffset) {
    const type = layer.type;
    let obj = {
        x: xOffset,
        y: Math.random() * (layer.yRange[1] - layer.yRange[0]) + layer.yRange[0],
        size: Math.random() * 50 + 50,
        color: ''
    };

    if (type === 'cloud') {
        // Color is dynamic now
        obj.width = obj.size * 1.5;
        obj.height = obj.size * 0.8;
    } else if (type === 'mountain') {
        // Color is dynamic now
        obj.width = obj.size * 2;
        obj.height = obj.size * 1.5;
        obj.y = groundY - obj.height * 0.5;
    } else if (type === 'hill') {
        // Color is dynamic now
        obj.width = obj.size * 1.5;
        obj.height = obj.size;
        obj.y = groundY;
    } else if (type === 'star') {
        obj.size = Math.random() * 2 + 1;
        obj.width = obj.size;
        obj.height = obj.size;
        obj.y = Math.random() * canvas.height * 0.6; // Top 60%
    }
    layer.objects.push(obj);
}

function updateBackground() {
    updateDayNightCycle(); // Update colors

    backgroundLayers.forEach(layer => {
        layer.objects.forEach(obj => {
            // Stars move very slowly
            const speed = layer.type === 'star' ? 0.02 : layer.speedRatio;
            obj.x -= gameSpeed * speed;
        });

        // Remove off-screen objects
        if (layer.objects.length > 0 && layer.objects[0].x + layer.objects[0].width < -100) {
            layer.objects.shift();
        }

        // Add new objects
        const lastObj = layer.objects[layer.objects.length - 1];
        // For stars, we need more frequent spawning or just wrap around
        if (layer.type === 'star') {
            if (layer.objects.length < 30) {
                addBackgroundObject(layer, canvas.width + Math.random() * 100);
            }
        } else {
            if (lastObj.x < canvas.width + 100) {
                addBackgroundObject(layer, lastObj.x + Math.random() * 200 + 150);
            }
        }
    });
}

function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, dayNightCycle.skyTop);
    gradient.addColorStop(1, dayNightCycle.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    backgroundLayers.forEach(layer => {
        // Draw stars only if opacity > 0
        if (layer.type === 'star') {
            if (dayNightCycle.starsOpacity > 0.01) {
                ctx.save();
                ctx.globalAlpha = dayNightCycle.starsOpacity;
                ctx.fillStyle = 'white';
                layer.objects.forEach(obj => {
                    ctx.beginPath();
                    ctx.arc(obj.x, obj.y, obj.size, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();
            }
            return;
        }

        layer.objects.forEach(obj => {
            if (layer.type === 'cloud') {
                ctx.fillStyle = dayNightCycle.cloudColor;
                ctx.beginPath();
                ctx.ellipse(obj.x, obj.y, obj.width / 2, obj.height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (layer.type === 'mountain') {
                ctx.fillStyle = dayNightCycle.mountainColor;
                ctx.beginPath();
                ctx.moveTo(obj.x, obj.y + obj.height);
                ctx.lineTo(obj.x + obj.width / 2, obj.y);
                ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
                ctx.fill();
            } else if (layer.type === 'hill') {
                ctx.fillStyle = dayNightCycle.hillColor;
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, obj.width, Math.PI, 0);
                ctx.fill();
            }
        });
    });
}

// --- Particle System ---
let particles = [];

function createParticle(x, y, type) {
    const particle = {
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.02,
        type: type,
        size: Math.random() * 3 + 2,
        color: 'rgba(200, 200, 200, 1)'
    };

    if (type === 'dust') {
        particle.vy = -Math.random() * 1 - 0.5; // Float up
        particle.color = 'rgba(150, 150, 150, 0.8)';
    } else if (type === 'jump') {
        particle.vy = Math.random() * 2 + 1; // Downwards puff
        particle.size = Math.random() * 5 + 3;
        particle.color = 'rgba(255, 255, 255, 0.8)';
    }

    particles.push(particle);
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx - (gameSpeed * 0.5); // Move with world a bit
        p.y += p.vy;
        p.life -= p.decay;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// --- RESIZE and RESET ---
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    groundY = canvas.height - 20;
    player.x = canvas.width / 5;

    // If player is on the ground, reset their Y position to the new ground.
    if (!player.isJumping) {
        player.y = groundY;
    }
}

function resetGame() {
    const savedHighScore = localStorage.getItem('runnerHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore, 10);
    }

    player.velocityY = 0;
    player.isJumping = false;
    player.jumpCount = 0;
    player.isSpinning = false;
    player.rotation = 0;
    player.isJumpKeyDown = false;
    player.jumpHoldFrames = 0;
    player.ahogeAngle = 0.3;
    player.ahogeDirection = 1;
    obstacles = [];
    score = 0;
    scoreLevel = 0;
    speedLevel = 0;
    backgroundColorIndex = 0;
    gameOver = false;
    obstacleTimer = 0;
    obstacleInterval = 120; // Reset interval
    gameSpeed = initialGameSpeed;
    gameSpeed = initialGameSpeed;
    lastMilestone = 0;
    gameOverTimer = 0;
    confettiParticles = [];
    particles = []; // Reset particles
    coins = []; // Reset coins
    coinScore = 0;

    resizeCanvas(); // Set initial canvas size and player position
    initBackground(); // Initialize background

    requestAnimationFrame(gameLoop);
}

// --- EVENT LISTENERS ---
window.addEventListener('resize', resizeCanvas);

function handleJumpStart() {
    if (gameOver) return;

    // If sliding, cancel slide immediately to jump
    if (player.isSliding) {
        player.isSliding = false;
        player.height = player.originalHeight;
        // No Y adjustment needed
    }

    if (player.jumpCount < player.maxJumps) {
        if (player.jumpCount === 1) { // This is the second jump
            player.velocityY = doubleJumpStrength;
            player.isSpinning = true;
            // Double jump particles
            for (let i = 0; i < 5; i++) createParticle(player.x, player.y - player.height / 2, 'jump');
        } else { // This is the first jump
            player.velocityY = initialJumpStrength;
            // Jump particles
            for (let i = 0; i < 8; i++) createParticle(player.x, player.y, 'jump');
        }

        // Play jump sound
        jumpSound.currentTime = 0;
        jumpSound.play();

        player.isJumping = true;
        player.jumpCount++;
    }
    player.isJumpKeyDown = true;
}

function handleJumpEnd() {
    player.isJumpKeyDown = false;
    player.jumpHoldFrames = 0;
}

function handleSlideStart() {
    if (gameOver || player.isJumping) return; // Can't slide while jumping
    if (!player.isSliding) {
        player.isSliding = true;
        player.slideTimer = 0;
        player.height = player.slideHeight;
        // No Y adjustment needed

        // Slide particles
        for (let i = 0; i < 5; i++) createParticle(player.x - 10 + Math.random() * 20, player.y, 'dust');
    }
}

function handleSlideEnd() {
    // Optional: End slide early if key released? 
    // For now, let's keep fixed duration or until key up if we want hold-to-slide
    // Let's implement hold-to-slide behavior in update
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') handleJumpStart();
    if (e.code === 'ArrowDown' || e.code === 'KeyS') handleSlideStart();
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') handleJumpEnd();
    // if (e.code === 'ArrowDown' || e.code === 'KeyS') handleSlideEnd(); 
});
jumpButton.addEventListener('mousedown', handleJumpStart);
jumpButton.addEventListener('mouseup', handleJumpEnd);
jumpButton.addEventListener('touchstart', (e) => { e.preventDefault(); handleJumpStart(); });
jumpButton.addEventListener('touchend', (e) => { e.preventDefault(); handleJumpEnd(); });

const slideButton = document.getElementById('slideButton');
slideButton.addEventListener('mousedown', handleSlideStart);
slideButton.addEventListener('mouseup', handleSlideEnd);
slideButton.addEventListener('touchstart', (e) => { e.preventDefault(); handleSlideStart(); });
slideButton.addEventListener('touchend', (e) => { e.preventDefault(); handleSlideEnd(); });

canvas.addEventListener('click', () => { if (gameOver) resetGame(); });

// --- DRAW FUNCTIONS ---
function drawPlayer() {
    const frame = player.animationFrames[player.currentFrame];
    // Adjust width/height based on sliding
    let drawW = frame.w;
    let drawH = frame.h;

    if (player.isSliding) {
        drawH = player.slideHeight;
        drawW = frame.w + 15; // Stretch horizontally
    }

    const playerDrawX = player.x - drawW / 2;
    const playerDrawY = player.y - drawH;

    ctx.save();
    // Translate and rotate for the spinning double jump
    if (player.isSpinning) {
        ctx.translate(player.x, player.y - drawH / 2);
        ctx.rotate(player.rotation);
        ctx.translate(-player.x, -(player.y - drawH / 2));
    }

    // 1. Draw the blue body as the base
    ctx.fillStyle = 'blue';
    ctx.fillRect(playerDrawX, playerDrawY, drawW, drawH);

    // 2. Draw the white tank top
    ctx.fillStyle = 'white';
    const sideMargin = drawW * 0.15;
    const strapWidth = drawW * 0.2;
    const strapHeight = drawH * 0.2;
    const chestY = playerDrawY + strapHeight;
    const chestHeight = drawH - (strapHeight * 2);
    ctx.fillRect(playerDrawX + sideMargin, chestY, drawW - (sideMargin * 2), chestHeight);
    ctx.fillRect(playerDrawX + sideMargin, playerDrawY, strapWidth, strapHeight);
    ctx.fillRect(playerDrawX + drawW - sideMargin - strapWidth, playerDrawY, strapWidth, strapHeight);

    // 3. Draw the neckline detail on the tank top's edge
    const neckDetailSize = 4;
    const neckDetailY = chestY - (neckDetailSize / 2); // Center it on the edge
    ctx.fillRect(player.x - neckDetailSize / 2, neckDetailY, neckDetailSize, neckDetailSize);

    // 4. Draw the ahoge (cowlick) - but not if spinning
    if (!player.isSpinning) {
        ctx.save();
        ctx.translate(player.x, playerDrawY); // Move origin to top-center of head
        if (player.isJumping) {
            ctx.scale(-1, 1); // Flip horizontally if jumping
        }
        ctx.rotate(player.ahogeAngle);

        // Draw a "く" shape
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-4, -8);
        ctx.lineTo(0, -16);
        ctx.stroke();

        ctx.restore();
    }

    ctx.restore(); // Restore context after potential rotation
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        ctx.save();
        // Apply jumping animation if the obstacle has one
        const yOffset = obstacle.isJumping ? obstacle.animOffsetY : 0;
        ctx.translate(obstacle.x, obstacle.y + yOffset);

        switch (obstacle.type) {
            case 'low': // Frog
                ctx.fillStyle = '#4caf50'; // Green
                ctx.strokeStyle = 'black'; // Black outline
                ctx.lineWidth = 2;

                // Draw a single, consistent frog sprite
                // Body
                ctx.beginPath();
                ctx.arc(obstacle.width / 2, obstacle.height, obstacle.width / 2, Math.PI, 2 * Math.PI);
                ctx.fill();
                ctx.stroke(); // Add outline

                // Eyes
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(obstacle.width * 0.3, obstacle.height * 0.5, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke(); // Add outline to eyes

                ctx.beginPath();
                ctx.arc(obstacle.width * 0.7, obstacle.height * 0.5, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke(); // Add outline to eyes

                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(obstacle.width * 0.3, obstacle.height * 0.5, 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(obstacle.width * 0.7, obstacle.height * 0.5, 2, 0, 2 * Math.PI);
                ctx.fill();
                break;

            case 'high':
                if (obstacle.subType === 'taiyaki') {
                    ctx.fillStyle = '#b87333'; // Brownish
                    // Tail
                    ctx.beginPath();
                    ctx.moveTo(obstacle.width, obstacle.height / 2);
                    ctx.lineTo(obstacle.width + 15, obstacle.height * 0.2);
                    ctx.lineTo(obstacle.width + 15, obstacle.height * 0.8);
                    ctx.closePath();
                    ctx.fill();
                    // Body
                    ctx.beginPath();
                    ctx.moveTo(0, obstacle.height / 2);
                    ctx.quadraticCurveTo(obstacle.width * 0.4, 0, obstacle.width, obstacle.height / 2);
                    ctx.quadraticCurveTo(obstacle.width * 0.4, obstacle.height, 0, obstacle.height / 2);
                    ctx.fill();
                    // Eye
                    ctx.fillStyle = 'black';
                    ctx.beginPath();
                    ctx.arc(obstacle.width * 0.3, obstacle.height * 0.4, 2, 0, Math.PI * 2);
                    ctx.fill();
                } else { // Goldfish
                    ctx.fillStyle = '#e53935'; // Red
                    // Tail
                    ctx.beginPath();
                    ctx.moveTo(obstacle.width, obstacle.height / 2);
                    ctx.quadraticCurveTo(obstacle.width + 20, 0, obstacle.width, obstacle.height * 0.2);
                    ctx.quadraticCurveTo(obstacle.width + 25, obstacle.height / 2, obstacle.width, obstacle.height * 0.8);
                    ctx.quadraticCurveTo(obstacle.width + 20, obstacle.height, obstacle.width, obstacle.height / 2);
                    ctx.fill();
                    // Body
                    ctx.beginPath();
                    ctx.ellipse(obstacle.width / 2, obstacle.height / 2, obstacle.width / 2, obstacle.height / 2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // Eye
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(obstacle.width * 0.3, obstacle.height * 0.4, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'black';
                    ctx.beginPath();
                    ctx.arc(obstacle.width * 0.3, obstacle.height * 0.4, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;

            case 'ceiling': // Icicle
                ctx.fillStyle = '#4fc3f7'; // Light blue
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(obstacle.width, 0);
                ctx.lineTo(obstacle.width / 2, obstacle.height);
                ctx.closePath();
                ctx.fill();
                break;

            default: // Fallback to original rectangle
                ctx.fillStyle = 'red';
                ctx.fillRect(0, 0, obstacle.width, obstacle.height);
                break;
        }

        ctx.restore();
    });
}

function drawCoins() {
    coins.forEach(coin => {
        ctx.save();
        ctx.translate(coin.x, coin.y);
        // Spin animation
        const scaleX = Math.sin(Date.now() / 100);
        ctx.scale(scaleX, 1);

        ctx.fillStyle = '#FFD700'; // Gold
        ctx.beginPath();
        ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    });
}

function drawUI() {
    ctx.fillStyle = 'black';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';

    // Helper to draw text with outline
    const drawText = (text, x, y, color = 'black') => {
        ctx.strokeText(text, x, y);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    };

    drawText(`Score: ${Math.floor(score)}`, 10, 25);
    drawText(`Coins: ${coinScore}`, 10, 50, '#DAA520');
    drawText(`High Score: ${highScore}`, 10, 75);

    ctx.textAlign = 'right';
    drawText(`Speed: ${gameSpeed.toFixed(1)}`, canvas.width - 10, 25);
    ctx.textAlign = 'left'; // Reset align

    if (gameOver) {
        gameOverTimer++;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        // Center of the screen
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.translate(centerX, centerY);

        // Responsive sizing based on canvas height/width
        // Base scale on height to ensure it fits vertically
        const baseSize = Math.min(canvas.width, canvas.height);

        // Animated Game Over Text
        const bounce = Math.sin(gameOverTimer * 0.2) * (baseSize * 0.02);

        ctx.fillStyle = '#ff5252';
        ctx.font = `bold ${baseSize * 0.25}px Arial`; // Increased to 25%
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = baseSize * 0.02;
        ctx.fillText('GAME OVER', 0, -baseSize * 0.15 + bounce);
        ctx.shadowBlur = 0; // Reset shadow

        ctx.fillStyle = 'white';
        ctx.font = `${baseSize * 0.1}px Arial`; // Increased to 10%
        ctx.fillText(`Final Score: ${Math.floor(score)}`, 0, baseSize * 0.05);

        if (score >= highScore && score > 0) {
            ctx.fillStyle = '#ffd700'; // Gold
            ctx.fillText(`New High Score!: ${highScore}`, 0, baseSize * 0.15);
        } else {
            ctx.fillStyle = '#ccc';
            ctx.fillText(`High Score: ${highScore}`, 0, baseSize * 0.15);
        }

        // Restart Button styling
        const btnW = baseSize * 0.6; // Wider button
        const btnH = baseSize * 0.15;
        const btnY = baseSize * 0.3;

        // Simple hover effect simulation (pulsing)
        const pulse = Math.sin(gameOverTimer * 0.1) * (baseSize * 0.005);

        ctx.fillStyle = '#007aff';
        ctx.beginPath();
        ctx.roundRect(-btnW / 2 - pulse, btnY - btnH / 2 - pulse, btnW + pulse * 2, btnH + pulse * 2, baseSize * 0.03);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = `bold ${baseSize * 0.08}px Arial`;
        ctx.textBaseline = 'middle';
        ctx.fillText('Click to Restart', 0, btnY);

        ctx.restore();
    }
}

function drawMilestoneAnimation() {
    if (!milestoneAnimation.isActive) return;

    const progressRatio = milestoneAnimation.progress / milestoneAnimation.duration;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Animation phases based on progressRatio
    let scale, alpha;
    if (progressRatio < 0.2) { // Zoom in
        scale = 0.5 + (progressRatio / 0.2) * 0.7; // 0.5 -> 1.2
        alpha = progressRatio / 0.2; // 0 -> 1
    } else if (progressRatio < 0.35) { // Settle
        scale = 1.2 - ((progressRatio - 0.2) / 0.15) * 0.2; // 1.2 -> 1.0
        alpha = 1;
    } else if (progressRatio < 0.85) { // Hold
        scale = 1.0;
        alpha = 1;
    } else { // Fade out
        scale = 1.0 - ((progressRatio - 0.85) / 0.15) * 0.1; // 1.0 -> 0.9
        alpha = 1 - (progressRatio - 0.85) / 0.15; // 1 -> 0
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${12 * scale}vw Arial`; // Responsive font size
    ctx.globalAlpha = alpha;

    const drawTextWithShadow = (color) => {
        ctx.shadowColor = "black";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 6;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = color;
        ctx.fillText(milestoneAnimation.text, centerX, centerY);
    };

    if (milestoneAnimation.color === 'rainbow') {
        const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
        ctx.font = `bold ${12 * scale}vw Arial`; // Ensure font is set before loop
        colors.forEach((color, index) => {
            ctx.fillStyle = color;
            // No shadow for rainbow to keep it clean
            ctx.shadowColor = "transparent";
            ctx.fillText(milestoneAnimation.text, centerX + index * 2, centerY + index * 2);
        });
    } else {
        drawTextWithShadow(milestoneAnimation.color);
    }

    ctx.restore();
}


function draw() {
    // ctx.fillStyle = backgroundColors[backgroundColorIndex]; // Removed simple bg
    // ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBackground(); // Draw parallax background

    ctx.fillStyle = '#333';
    ctx.fillRect(0, groundY, canvas.width, 20);
    // drawMilestoneAnimation(); // Moved to end to stay bright
    drawParticles(); // Draw particles
    drawCoins(); // Draw coins
    drawConfetti();
    drawPlayer();
    drawObstacles();

    // Darkness overlay for night time (Draw BEFORE UI and Milestone)
    if (dayNightCycle.darknessOverlay > 0.01) {
        ctx.fillStyle = `rgba(0, 0, 10, ${dayNightCycle.darknessOverlay})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawMilestoneAnimation(); // Draw on top of darkness
    drawUI(); // Draw UI on top of darkness
}

// --- CONFETTI FUNCTIONS ---
function createConfetti() {
    confettiParticles = []; // Clear previous confetti
    for (let i = 0; i < maxConfetti; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 4;

        confettiParticles.push({
            x: canvas.width / 2, // Start from center
            y: canvas.height / 2,
            size: Math.random() * 8 + 3,
            color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
            velocityY: Math.sin(angle) * speed * 0.5,
            velocityX: Math.cos(angle) * speed,
            rotation: Math.random() * Math.PI * 3,
            rotationSpeed: Math.random() * 0.2 - 0.1,
            time: 0,
            gravity: gravity * 0.6 // Slightly less than player gravity
        });
    }

    // Add extra particles for the cracker effect (from the sides)
    const sideParticles = 100;
    for (let i = 0; i < sideParticles; i++) {
        const isLeft = Math.random() < 0.5;
        confettiParticles.push({
            x: isLeft ? 0 : canvas.width,
            y: groundY - 50,
            size: Math.random() * 8 + 3,
            color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
            velocityY: Math.random() * -12 - 5, // Shoot upwards
            velocityX: isLeft ? Math.random() * 8 : Math.random() * -8, // Shoot inwards
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: Math.random() * 0.2 - 0.1,
            time: 0,
            gravity: gravity * 0.6
        });
    }
}

function updateConfetti() {
    // 落下速度の調整: 重力の影響をplayer.gravity(0.8)の約1/8 (0.1)に減らしました
    const slowGravity = 0.1;
    for (let i = confettiParticles.length - 1; i >= 0; i--) {
        const p = confettiParticles[i];

        p.velocityY += slowGravity;

        p.x += p.velocityX;
        p.y += p.velocityY;
        p.rotation += p.rotationSpeed;
        p.time++;

        // Confetti gradually falls to the ground
        if (p.y > groundY + 10) {
            // Stop movement but keep it on screen for a while
            p.y = groundY + 10;
            p.velocityY = 0;
            p.velocityX *= 0.95;
            p.rotationSpeed = 0;
        }

        // Gradually remove confetti after it lands
        if (p.y >= groundY + 10 && p.time > 180) { // 3 seconds after landing
            confettiParticles.splice(i, 1);
        }
    }
}

function drawConfetti() {
    confettiParticles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        // Draw a small rectangle (the confetti shape)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
    });
}

// --- UPDATE FUNCTIONS ---
function updatePlayer() {
    // Body animation
    player.frameCounter = (player.frameCounter + 1) % player.frameDelay;
    if (player.frameCounter === 0) {
        player.currentFrame = (player.currentFrame + 1) % player.animationFrames.length;
    }

    // Ahoge animation (piko piko)
    player.ahogeAngle += 0.05 * player.ahogeDirection;
    if (Math.abs(player.ahogeAngle) > 0.4) {
        player.ahogeDirection *= -1;
    }

    // Spin animation
    if (player.isSpinning) {
        player.rotation += 0.3; // Adjust rotation speed as needed
    }

    // Variable Jump
    // Variable Jump
    if (player.isJumpKeyDown && player.jumpHoldFrames < maxJumpHoldFrames) {
        player.velocityY -= jumpHoldStrength;
        player.jumpHoldFrames++;
    }
    player.y += player.velocityY;

    // Check ground collision
    if (player.y >= groundY) {
        if (player.isJumping) {
            // Landing particles
            for (let i = 0; i < 5; i++) createParticle(player.x, player.y, 'dust');
        }
        player.y = groundY; // Snap to ground
        player.isJumping = false;
        player.velocityY = 0;
        player.jumpHoldFrames = 0;
        player.jumpCount = 0; // Reset jump count on landing
        player.isSpinning = false; // Stop spinning on landing
        player.rotation = 0; // Reset rotation

        // Running particles
        if (Math.random() < 0.3) {
            createParticle(player.x - 10, player.y, 'dust');
        }
    } else {
        player.velocityY += gravity;
    }

    // Handle Sliding
    if (player.isSliding) {
        player.slideTimer++;
        if (player.slideTimer > player.maxSlideFrames) {
            // End slide naturally
            player.isSliding = false;
            player.height = player.originalHeight;
            // No need to adjust Y if Y is feet position
        }

        // Slide particles
        if (player.slideTimer % 5 === 0) {
            createParticle(player.x - 15, player.y, 'dust');
        }
    }
}

function updateObstacleAnimations() {
    obstacles.forEach(o => {
        if (o.isJumping) {
            o.animVelY += o.animGravity;
            o.animOffsetY += o.animVelY;
            if (o.animOffsetY >= 0) { // Hit the "ground" (its original position)
                o.animOffsetY = 0;
                o.animVelY = -4; // Jump again
            }
        }
    });
}

function updateMilestoneAnimation() {
    if (milestoneAnimation.isActive) {
        milestoneAnimation.progress++;
        if (milestoneAnimation.progress >= milestoneAnimation.duration) {
            milestoneAnimation.isActive = false;
        }
    }
}

// --- Obstacle Pattern Generation ---

function createSingleLowObstacle() {
    const h = Math.random() * 40 + 20;
    const newObstacle = { x: canvas.width, y: groundY - h, width: 20, height: h, type: 'low' };
    if (h > 40) { // It's a jumping frog
        newObstacle.isJumping = true;
        newObstacle.animOffsetY = 0;
        newObstacle.animVelY = -4;
        newObstacle.animGravity = 0.2;
    }
    obstacles.push(newObstacle);
}

function createSingleHighObstacle() {
    const subType = Math.random() < 0.5 ? 'goldfish' : 'taiyaki';
    obstacles.push({ x: canvas.width, y: groundY - 80, width: 30, height: 50, type: 'high', subType: subType });
}

function createSingleCeilingObstacle() {
    const h = Math.random() * 50 + 20;
    obstacles.push({ x: canvas.width, y: 0, width: 25, height: h, type: 'ceiling' });
}

function createDoubleLowObstacle() {
    const h1 = Math.random() * 30 + 20;
    const h2 = Math.random() * 30 + 20;
    const gap = Math.random() * 60 + 90 + (gameSpeed * 4);
    obstacles.push({ x: canvas.width, y: groundY - h1, width: 20, height: h1, type: 'low' });
    obstacles.push({ x: canvas.width + gap, y: groundY - h2, width: 20, height: h2, type: 'low' });
}

function createWideLowObstacle() {
    const h = Math.random() * 25 + 20;
    const gap = Math.random() * 20 + 75;
    const firstObstacleWidth = 20;
    obstacles.push({ x: canvas.width, y: groundY - h, width: firstObstacleWidth, height: h, type: 'low' });
    obstacles.push({ x: canvas.width + firstObstacleWidth + gap, y: groundY - h, width: 20, height: h, type: 'low' });
}

function createTripleLowObstacle() {
    const h = Math.random() * 25 + 20;
    const gap = Math.random() * 50 + 100 + (gameSpeed * 3);
    obstacles.push({ x: canvas.width, y: groundY - h, width: 20, height: h, type: 'low' });
    obstacles.push({ x: canvas.width + gap, y: groundY - h, width: 20, height: h, type: 'low' });
    obstacles.push({ x: canvas.width + gap * 2, y: groundY - h, width: 20, height: h, type: 'low' });
}

function createLowAndCeilingObstacle() {
    const lowHeight = Math.random() * 30 + 20;
    const ceilingHeight = Math.random() * 40 + 20;
    const gap = Math.random() * 40 + 120;
    obstacles.push({ x: canvas.width, y: groundY - lowHeight, width: 20, height: lowHeight, type: 'low' });
    obstacles.push({ x: canvas.width + gap, y: 0, width: 25, height: ceilingHeight, type: 'ceiling' });
}

function createHighAndLowObstacle() {
    const lowHeight = Math.random() * 30 + 20;
    const subType = Math.random() < 0.5 ? 'goldfish' : 'taiyaki';
    const gap = Math.random() * 50 + 150 + (gameSpeed * 5);
    obstacles.push({ x: canvas.width, y: groundY - 80, width: 30, height: 50, type: 'high', subType: subType });
    obstacles.push({ x: canvas.width + gap, y: groundY - lowHeight, width: 20, height: lowHeight, type: 'low' });
}

function createCoinsPattern() {
    // Create a line of coins
    const startX = canvas.width + 50;
    const y = groundY - 40 - Math.random() * 60; // Random height
    for (let i = 0; i < 5; i++) {
        coins.push({
            x: startX + i * 30,
            y: y,
            size: 10,
            collected: false
        });
    }
}


function updateObstacles() {
    obstacleTimer++;

    // Time to generate a new obstacle pattern?
    if (obstacleTimer >= obstacleInterval) {
        const availableSlots = maxObstacles - obstacles.length;

        if (availableSlots > 0) {
            const patternFunctions = [
                { func: createSingleLowObstacle, count: 1 },
                { func: createSingleHighObstacle, count: 1 },
                { func: createSingleCeilingObstacle, count: 1 },
                { func: createDoubleLowObstacle, count: 2 },
                { func: createWideLowObstacle, count: 2 },
                { func: createLowAndCeilingObstacle, count: 2 },
                { func: createHighAndLowObstacle, count: 2 },
                { func: createTripleLowObstacle, count: 3 }
            ];

            // Filter patterns that fit in the available slots
            const possiblePatterns = patternFunctions.filter(p => p.count <= availableSlots);

            if (possiblePatterns.length > 0) {
                // Choose a random pattern from the possible ones
                const pattern = possiblePatterns[Math.floor(Math.random() * possiblePatterns.length)];
                pattern.func();

                // Chance to spawn coins with obstacles
                if (Math.random() < 0.5) {
                    createCoinsPattern();
                }

                // Reset timer and set a new random interval
                obstacleTimer = 0;
                const baseInterval = 900 / gameSpeed;
                const randomFactor = baseInterval * 0.6;
                obstacleInterval = baseInterval + (Math.random() * randomFactor) - (randomFactor / 2);
                // Ensure interval is not too short, to prevent immediate re-triggering
                obstacleInterval = Math.max(obstacleInterval, minObstacleGap / gameSpeed);
            }
        }
    }

    // Move existing obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

function updateCoins() {
    for (let i = coins.length - 1; i >= 0; i--) {
        let coin = coins[i];
        coin.x -= gameSpeed;

        // Collision with player
        const dx = player.x - coin.x;
        const dy = (player.y - player.height / 2) - coin.y; // Center of player vs coin
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.width + coin.size) { // Simple radius check
            // Collected!
            coinScore++;
            score += 50; // Bonus score
            coins.splice(i, 1);

            // Sparkle effect
            for (let k = 0; k < 5; k++) {
                createParticle(coin.x, coin.y, 'jump'); // Reuse jump particle for sparkle
            }
            continue;
        }

        if (coin.x < -20) {
            coins.splice(i, 1);
        }
    }
}

function checkCollisions() {
    const playerFrame = player.animationFrames[player.currentFrame];
    // Use current player dimensions (handled by draw/update logic, but here we need explicit hit box)
    // If sliding, height is smaller
    const currentH = player.isSliding ? player.slideHeight : playerFrame.h;
    const currentW = player.isSliding ? playerFrame.w + 15 : playerFrame.w;

    const playerHitbox = {
        x: player.x - currentW / 2,
        y: player.y - currentH,
        width: currentW,
        height: currentH
    };

    for (const obstacle of obstacles) {
        // A simple bounding box collision check is not accurate for a rotated player.
        // For this game, we'll check collision against the un-rotated hitbox, which is a good enough approximation.
        if (playerHitbox.x < obstacle.x + obstacle.width && playerHitbox.x + playerHitbox.width > obstacle.x && playerHitbox.y < obstacle.y + obstacle.height && playerHitbox.y + playerHitbox.height > obstacle.y) {
            gameOver = true;

            // Play game over sound
            gameOverSound.currentTime = 0;
            gameOverSound.play();

            player.isJumpKeyDown = false;

            if (score > highScore) {
                highScore = Math.floor(score);
                localStorage.setItem('runnerHighScore', highScore);
            }
        }
    }
}

function update() {
    updatePlayer();
    updateObstacles();
    updateObstacleAnimations();
    updateCoins();
    checkCollisions();
    score += 1;
    updateMilestoneAnimation();
    updateBackground(); // Update background
    updateParticles(); // Update particles
    updateConfetti();

    // Check for 1000-point milestone
    const currentMilestone = Math.floor(score / 1000);
    if (currentMilestone > lastMilestone) {
        lastMilestone = currentMilestone;
        const milestoneScore = currentMilestone * 1000;

        milestoneAnimation.isActive = true;
        milestoneAnimation.progress = 0;
        milestoneAnimation.text = `${milestoneScore}`;

        if (milestoneScore === 3000) {
            milestoneAnimation.color = 'rainbow';
            createConfetti();
            if (specialNotification) {
                specialNotification.textContent = 'ch登録者数3000人おめでとう！！';
                specialNotification.classList.add('show');
                // Remove the class after the animation ends to allow re-triggering
                setTimeout(() => {
                    specialNotification.classList.remove('show');
                }, 4000); // Assuming a 4s animation
            }
        } else if (milestoneScore === 7000) {
            milestoneAnimation.color = 'rainbow';
        } else if ((currentMilestone % 2) !== 0) { // Odd thousands
            milestoneAnimation.color = '#e53935'; // Red
        } else { // Even thousands
            milestoneAnimation.color = '#007aff'; // Blue
        }
    }

    const currentBgLevel = Math.floor(score / 500);
    if (currentBgLevel > scoreLevel) {
        scoreLevel = currentBgLevel;
        backgroundColorIndex = (backgroundColorIndex + 1) % backgroundColors.length;
    }

    const currentSpeedLevel = Math.floor(score / 1000);
    if (currentSpeedLevel > speedLevel) {
        speedLevel = currentSpeedLevel;
        gameSpeed = Math.min(maxGameSpeed, initialGameSpeed + speedLevel);
    }
}

// --- MAIN GAME LOOP ---
function gameLoop() {
    if (gameOver) {
        draw();
        // Stop the loop if game is over
        return;
    }
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
resetGame();
