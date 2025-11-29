// Enemy system
export class EnemySystem {
  constructor(canvas, sounds) {
    this.canvas = canvas;
    this.sounds = sounds;
    this.enemies = [];
  }

  update(score, cameraY, player, gameState) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      enemy.x += enemy.vx;
      enemy.y += enemy.vy;
      enemy.animFrame++;

      // Wrap birds around screen
      if (enemy.type === 'bird') {
        if (enemy.x < -50) enemy.x = this.canvas.width + 50;
        if (enemy.x > this.canvas.width + 50) enemy.x = -50;
      }

      // Check collision with player
      const playerCenterX = player.x;
      const playerCenterY = player.y - player.height / 2;

      if (playerCenterX > enemy.x - enemy.width / 2 &&
        playerCenterX < enemy.x + enemy.width / 2 &&
        playerCenterY > enemy.y - enemy.height / 2 &&
        playerCenterY < enemy.y + enemy.height / 2) {
        gameState.gameOver = true;
        this.sounds.gameOver.currentTime = 0;
        this.sounds.gameOver.play().catch(() => { });
        this.sounds.copter.pause();
        this.sounds.copter.currentTime = 0;
      }

      // Remove enemies that are too far
      if (enemy.y > cameraY + this.canvas.height + 200 || enemy.y < cameraY - 200) {
        this.enemies.splice(i, 1);
      }
    }
  }

  spawn(x, y, score) {
    if (score > 100 && Math.random() < 0.15) {
      const enemyType = Math.random() < 0.6 ? 'bird' : 'balloon';

      this.enemies.push({
        x: x,
        y: y,
        type: enemyType,
        width: enemyType === 'bird' ? 30 : 25,
        height: enemyType === 'bird' ? 20 : 35,
        vx: enemyType === 'bird' ? (Math.random() < 0.5 ? 2 : -2) : 0,
        vy: enemyType === 'balloon' ? -0.5 : 0,
        animFrame: 0
      });
    }
  }

  draw(ctx) {
    this.enemies.forEach(enemy => {
      ctx.save();

      if (enemy.type === 'bird') {
        const wingFlap = Math.sin(enemy.animFrame * 0.2) * 5;

        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y, enemy.width / 2, enemy.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.ellipse(enemy.x - 10, enemy.y + wingFlap, 8, 12, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(enemy.x + 10, enemy.y - wingFlap, 8, 12, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(enemy.x + 5, enemy.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(enemy.x + 6, enemy.y - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();

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

  reset() {
    this.enemies = [];
  }
}
