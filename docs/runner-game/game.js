// Version: 0.3
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const jumpButton = document.getElementById('jumpButton');

// --- Game Configuration ---
const gravity = 0.8;
const initialJumpStrength = -10;
const jumpHoldStrength = 0.5;
const maxJumpHoldFrames = 12;
const initialGameSpeed = 4;
const maxGameSpeed = 10;
const backgroundColors = ['#eeeeee', '#e0f7fa', '#fff9c4', '#ffcdd2', '#d1c4e9'];

// --- Player State ---
const player = {
    x: 150,
    y: canvas.height,
    width: 40,
    height: 50,
    velocityY: 0,
    isJumping: false,
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
let obstacleTimer = 0;
let obstacleInterval = 90;
let gameSpeed = initialGameSpeed;

// --- Ground ---
const groundY = canvas.height - 20;

// --- RESET GAME ---
function resetGame() {
    const savedHighScore = localStorage.getItem('runnerHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore, 10);
    }

    player.y = canvas.height;
    player.velocityY = 0;
    player.isJumping = false;
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
    gameSpeed = initialGameSpeed;
    requestAnimationFrame(gameLoop);
}

// --- EVENT LISTENERS ---
function handleJumpStart() {
    if (gameOver) return;
    if (!player.isJumping) {
        player.velocityY = initialJumpStrength;
        player.isJumping = true;
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

    // 4. Draw the ahoge (cowlick)
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

function drawObstacles() {
    obstacles.forEach(obstacle => {
        ctx.save();
        // Apply jumping animation if the obstacle has one
        const yOffset = obstacle.isJumping ? obstacle.animOffsetY : 0;
        ctx.translate(obstacle.x, obstacle.y + yOffset);

        switch (obstacle.type) {
            case 'low': // Frog
                ctx.save();
                // Anchor drawing to the center-bottom of the obstacle's box
                ctx.translate(obstacle.width / 2, obstacle.height);

                // Body (a semicircle centered at the new origin)
                ctx.fillStyle = '#4caf50'; // Green
                ctx.beginPath();
                ctx.arc(0, 0, obstacle.width / 2, Math.PI, 2 * Math.PI);
                ctx.fill();

                // Eyes (relative to the body's center)
                const eyeOffsetY = -obstacle.height * 0.5;
                const eyeOffsetX = obstacle.width * 0.2;
                
                // White part of eyes
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(-eyeOffsetX, eyeOffsetY, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(eyeOffsetX, eyeOffsetY, 5, 0, 2 * Math.PI);
                ctx.fill();

                // Pupils
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(-eyeOffsetX, eyeOffsetY, 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(eyeOffsetX, eyeOffsetY, 2, 0, 2 * Math.PI);
                ctx.fill();

                ctx.restore();
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
    ctx.fillText(`Score: ${Math.floor(score)}`, 10, 25);
    ctx.fillText(`High Score: ${highScore}`, 10, 50);
    ctx.fillText(`Speed: ${gameSpeed.toFixed(1)}`, canvas.width - 100, 25);

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

function draw() {
    ctx.fillStyle = backgroundColors[backgroundColorIndex];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#333';
    ctx.fillRect(0, groundY, canvas.width, 20);
    drawPlayer();
    drawObstacles();
    drawUI();
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

function updateObstacles() {
    obstacleTimer++;
    if (obstacleTimer >= obstacleInterval) {
        const patternType = Math.random();
        const canShowComplexPatterns = gameSpeed > 5;

        if (patternType < 0.5 || !canShowComplexPatterns) { // Basic patterns are more common, especially at start
            const obstacleTypeRoll = Math.random();
            if (obstacleTypeRoll < 0.6) { // Single low
                 const h = Math.random() * 40 + 20;
                 const newObstacle = { x: canvas.width, y: groundY - h, width: 20, height: h, type: 'low' };
                 if (h > 40) { // It's a jumping frog
                    newObstacle.isJumping = true;
                    newObstacle.animOffsetY = 0;
                    newObstacle.animVelY = -4; // Initial jump velocity for the frog animation
                    newObstacle.animGravity = 0.2;
                 }
                 obstacles.push(newObstacle);
            } else if (obstacleTypeRoll < 0.85) { // Single high
                 const subType = Math.random() < 0.5 ? 'goldfish' : 'taiyaki';
                 obstacles.push({ x: canvas.width, y: groundY - 80, width: 30, height: 50, type: 'high', subType: subType });
            } else { // Single ceiling
                 const h = Math.random() * 50 + 20;
                 obstacles.push({ x: canvas.width, y: 0, width: 25, height: h, type: 'ceiling' });
            }
        } else if (patternType < 0.75) { // Double low for continuous jumps
            const h1 = Math.random() * 30 + 20;
            const h2 = Math.random() * 30 + 20;
            // Wider gap for more reaction time, especially at lower speeds.
            const gap = Math.random() * 60 + 90 + (gameSpeed * 4);
            obstacles.push({ x: canvas.width, y: groundY - h1, width: 20, height: h1, type: 'low' });
            obstacles.push({ x: canvas.width + gap, y: groundY - h2, width: 20, height: h2, type: 'low' });
        } else { // Two low obstacles to jump over in one go
            const h = Math.random() * 25 + 20;
            // Narrower gap to make it possible to jump over both.
            const gap = Math.random() * 20 + 75;
            const firstObstacleWidth = 20;
            obstacles.push({ x: canvas.width, y: groundY - h, width: firstObstacleWidth, height: h, type: 'low' });
            obstacles.push({ x: canvas.width + firstObstacleWidth + gap, y: groundY - h, width: 20, height: h, type: 'low' });
        }

        obstacleTimer = 0;
        // Make interval calculation a bit more dynamic
        const baseInterval = 900 / gameSpeed;
        const randomFactor = baseInterval * 0.6; // randomness is proportional to speed
        obstacleInterval = baseInterval + (Math.random() * randomFactor) - (randomFactor / 2); // Centered randomness
    }
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
        return;
    }
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
resetGame();