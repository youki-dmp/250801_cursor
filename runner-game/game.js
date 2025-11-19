// Version: 0.5 (Double Jump & More Patterns)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const jumpButton = document.getElementById('jumpButton');
const specialNotification = document.getElementById('special-notification');

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
};

// --- Game State ---
let obstacles = [];
let score = 0;
let highScore = 0;
let scoreLevel = 0;
let speedLevel = 0;
let backgroundColorIndex = 0;
let gameOver = false;
let gameSpeed = initialGameSpeed;
let obstacleTimer = 0;
let obstacleInterval = 120; // Initial interval before the first obstacle
let lastMilestone = 0;

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
const maxConfetti = 250;
const confettiColors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3', '#ffffff', '#cccccc'];

// --- Ground ---
let groundY;

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
    lastMilestone = 0;
    confettiParticles = [];
    
    resizeCanvas(); // Set initial canvas size and player position
    
    requestAnimationFrame(gameLoop);
}

// --- EVENT LISTENERS ---
window.addEventListener('resize', resizeCanvas);

function handleJumpStart() {
    if (gameOver) return;
    if (player.jumpCount < player.maxJumps) {
        if (player.jumpCount === 1) { // This is the second jump
            player.velocityY = doubleJumpStrength;
            player.isSpinning = true;
        } else { // This is the first jump
            player.velocityY = initialJumpStrength;
        }
        player.isJumping = true;
        player.jumpCount++;
    }
    player.isJumpKeyDown = true;
}

function handleJumpEnd() {
    player.isJumpKeyDown = false;
    player.jumpHoldFrames = 0;
}

window.addEventListener('keydown', (e) => { if (e.code === 'Space') handleJumpStart(); });
window.addEventListener('keyup', (e) => { if (e.code === 'Space') handleJumpEnd(); });
jumpButton.addEventListener('mousedown', handleJumpStart);
jumpButton.addEventListener('mouseup', handleJumpEnd);
jumpButton.addEventListener('touchstart', (e) => { e.preventDefault(); handleJumpStart(); });
jumpButton.addEventListener('touchend', (e) => { e.preventDefault(); handleJumpEnd(); });
canvas.addEventListener('click', () => { if (gameOver) resetGame(); });

// --- DRAW FUNCTIONS ---
function drawPlayer() {
    const frame = player.animationFrames[player.currentFrame];
    const playerDrawX = player.x - frame.w / 2;
    const playerDrawY = player.y - frame.h;

    ctx.save();
    // Translate and rotate for the spinning double jump
    if (player.isSpinning) {
        ctx.translate(player.x, player.y - frame.h / 2);
        ctx.rotate(player.rotation);
        ctx.translate(-player.x, -(player.y - frame.h / 2));
    }

    // 1. Draw the blue body as the base
    ctx.fillStyle = 'blue';
    ctx.fillRect(playerDrawX, playerDrawY, frame.w, frame.h);

    // 2. Draw the white tank top
    ctx.fillStyle = 'white';
    const sideMargin = frame.w * 0.15;
    const strapWidth = frame.w * 0.2;
    const strapHeight = frame.h * 0.2;
    const chestY = playerDrawY + strapHeight;
    const chestHeight = frame.h - (strapHeight * 2);
    ctx.fillRect(playerDrawX + sideMargin, chestY, frame.w - (sideMargin * 2), chestHeight);
    ctx.fillRect(playerDrawX + sideMargin, playerDrawY, strapWidth, strapHeight);
    ctx.fillRect(playerDrawX + frame.w - sideMargin - strapWidth, playerDrawY, strapWidth, strapHeight);

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
                // Draw a single, consistent frog sprite
                // Body
                ctx.beginPath();
                ctx.arc(obstacle.width / 2, obstacle.height, obstacle.width / 2, Math.PI, 2 * Math.PI);
                ctx.fill();
                // Eyes
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(obstacle.width * 0.3, obstacle.height * 0.5, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(obstacle.width * 0.7, obstacle.height * 0.5, 5, 0, 2 * Math.PI);
                ctx.fill();
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

function drawUI() {
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${Math.floor(score)}`, 10, 25);
    ctx.fillText(`High Score: ${highScore}`, 10, 50);

    ctx.textAlign = 'right';
    ctx.fillText(`Speed: ${gameSpeed.toFixed(1)}`, canvas.width - 10, 25);
    ctx.textAlign = 'left'; // Reset align

    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = '30px Arial';
        ctx.fillText(`Final Score: ${Math.floor(score)}`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 50);
        ctx.font = '20px Arial';
        ctx.fillText('Click to Restart', canvas.width / 2, canvas.height / 2 + 90);
        ctx.textAlign = 'left';
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
    ctx.fillStyle = backgroundColors[backgroundColorIndex];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#333';
    ctx.fillRect(0, groundY, canvas.width, 20);
    drawMilestoneAnimation(); // Draw behind player
    drawConfetti();
    drawPlayer();
    drawObstacles();
    drawUI();
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
    if (player.isJumpKeyDown && player.jumpHoldFrames < maxJumpHoldFrames) {
        player.velocityY -= jumpHoldStrength;
        player.jumpHoldFrames++;
    }
    player.y += player.velocityY;
    if (player.y >= groundY) {
        player.y = groundY;
        player.isJumping = false;
        player.velocityY = 0;
        player.jumpHoldFrames = 0;
        player.jumpCount = 0; // Reset jump count on landing
        player.isSpinning = false; // Stop spinning on landing
        player.rotation = 0; // Reset rotation
    } else {
        player.velocityY += gravity;
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

function checkCollisions() {
    const playerFrame = player.animationFrames[player.currentFrame];
    const playerHitbox = { x: player.x - playerFrame.w / 2, y: player.y - playerFrame.h, width: playerFrame.w, height: playerFrame.h };
    for (const obstacle of obstacles) {
        // A simple bounding box collision check is not accurate for a rotated player.
        // For this game, we'll check collision against the un-rotated hitbox, which is a good enough approximation.
        if (playerHitbox.x < obstacle.x + obstacle.width && playerHitbox.x + playerHitbox.width > obstacle.x && playerHitbox.y < obstacle.y + obstacle.height && playerHitbox.y + playerHitbox.height > obstacle.y) {
            gameOver = true;
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
    checkCollisions();
    score += 1;
    updateMilestoneAnimation();
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
