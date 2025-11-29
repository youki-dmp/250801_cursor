// Platform management system
import { config, PlatformType, difficultyThresholds } from './constants.js';

export class PlatformSystem {
  constructor(canvas, sounds) {
    this.canvas = canvas;
    this.sounds = sounds;
    this.platforms = [];
  }

  generateInitial() {
    this.platforms = [];

    // Starting platform
    this.platforms.push({
      x: this.canvas.width / 2 - config.platformWidth / 2,
      y: this.canvas.height - 50,
      width: config.platformWidth,
      height: config.platformHeight,
      type: PlatformType.NORMAL,
      broken: false,
      moveDir: 1,
      moveSpeed: 2,
      id: Date.now() + Math.random()
    });

    // Generate upward platforms
    let currentY = this.canvas.height - 50 - config.basePlatformSpacing;
    while (currentY > -500) {
      const type = this.getRandomType(0);
      const x = Math.random() * (this.canvas.width - config.platformWidth);

      this.platforms.push({
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

  getRandomType(score) {
    const difficulty = this.getCurrentDifficulty(score);
    const rand = Math.random();

    const normalRate = 0.6 - (difficulty.fragileRate - 0.15);
    const fragileRate = normalRate + difficulty.fragileRate;
    const movingRate = fragileRate + 0.15;

    if (rand < normalRate) return PlatformType.NORMAL;
    if (rand < fragileRate) return PlatformType.FRAGILE;
    if (rand < movingRate) return PlatformType.MOVING;
    return PlatformType.SPRING;
  }

  getCurrentDifficulty(score) {
    for (let i = difficultyThresholds.length - 1; i >= 0; i--) {
      if (score >= difficultyThresholds[i].score) {
        return difficultyThresholds[i];
      }
    }
    return difficultyThresholds[0];
  }

  update(score) {
    this.platforms.forEach(p => {
      if (p.type === PlatformType.MOVING) {
        p.x += p.moveSpeed * p.moveDir;
        if (p.x <= 0 || p.x >= this.canvas.width - p.width) {
          p.moveDir *= -1;
        }
      }
    });
  }

  generateNew(cameraY, score, coinSystem, enemySystem) {
    let highest = Math.min(...this.platforms.map(p => p.y));

    const difficulty = this.getCurrentDifficulty(score);
    const platformSpacing = config.basePlatformSpacing * difficulty.spacingMultiplier;

    while (highest > cameraY - this.canvas.height) {
      const type = this.getRandomType(score);
      const x = Math.random() * (this.canvas.width - config.platformWidth);
      highest -= platformSpacing + Math.random() * 40 - 20;

      this.platforms.push({
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

      // Spawn coin near platform
      const coinX = x + Math.random() * config.platformWidth;
      const coinY = highest - 30 - Math.random() * 40;
      coinSystem.spawn(coinX, coinY);

      // Spawn enemy
      const enemyX = Math.random() * this.canvas.width;
      const enemyY = highest - 50 - Math.random() * 100;
      enemySystem.spawn(enemyX, enemyY, score);
    }

    // Remove platforms below screen
    this.platforms = this.platforms.filter(p => p.y < cameraY + this.canvas.height + 100);
  }

  checkCollision(player, comboSystem) {
    player.isOnPlatform = false;
    let landed = false;

    this.platforms.forEach(platform => {
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
          landed = true;

          // Combo
          comboSystem.onLanding(platform.id, player.x, player.y);

          // Jump
          if (platform.type === PlatformType.SPRING) {
            player.velocityY = config.springJumpSpeed;
            this.sounds.spring.currentTime = 0;
            this.sounds.spring.play().catch(() => { });
          } else {
            player.velocityY = config.jumpSpeed;
            this.sounds.jump.currentTime = 0;
            this.sounds.jump.play().catch(() => { });
          }

          // Break fragile
          if (platform.type === PlatformType.FRAGILE) {
            platform.broken = true;
            this.sounds.break.currentTime = 0;
            this.sounds.break.play().catch(() => { });
          }
        }
      }
    });

    return landed;
  }

  draw(ctx) {
    this.platforms.forEach(platform => {
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

  reset() {
    this.platforms = [];
  }
}
