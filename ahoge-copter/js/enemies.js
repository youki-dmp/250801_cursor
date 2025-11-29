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
      if (enemy.type === 'gyoza') {
        if (enemy.x < -50) enemy.x = this.canvas.width + 50;
        if (enemy.x > this.canvas.width + 50) enemy.x = -50;
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
        gameState.gameOver = true;
        this.sounds.gameOver.currentTime = 0;
        this.sounds.gameOver.play().catch(() => { });
        this.sounds.copter.pause();
        this.sounds.copter.currentTime = 0;
      }

      // Remove enemies that are too far below or way too far above
      if (enemy.y > cameraY + this.canvas.height + 200 || enemy.y < cameraY - this.canvas.height * 2) {
        this.enemies.splice(i, 1);
      }
    }
  }

  spawn(x, y, score) {
    if (score > 10 && Math.random() < 0.3) { // Spawn earlier (score > 10) and more often (30%)
      const enemyType = Math.random() < 0.7 ? 'gyoza' : 'balloon'; // More gyozas

      let vx = 0;
      let vy = 0;
      let spawnX = x;

      if (enemyType === 'gyoza') {
        // 50% chance to spawn from side
        if (Math.random() < 0.5) {
          const fromLeft = Math.random() < 0.5;
          spawnX = fromLeft ? -40 : this.canvas.width + 40;
          vx = fromLeft ? (2 + Math.random()) : -(2 + Math.random());
        } else {
          vx = Math.random() < 0.5 ? 2 : -2;
        }
      } else if (enemyType === 'balloon') {
        vy = -0.5;
      }

      this.enemies.push({
        x: spawnX,
        y: y,
        type: enemyType,
        width: enemyType === 'gyoza' ? 40 : 25,
        height: enemyType === 'gyoza' ? 25 : 35,
        vx: vx,
        vy: vy,
        animFrame: 0
      });
    }
  }

  draw(ctx) {
    this.enemies.forEach(enemy => {
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

  reset() {
    this.enemies = [];
  }
}
