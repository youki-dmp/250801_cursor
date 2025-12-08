// Coin collection system
export class CoinSystem {
  constructor(canvas, sounds) {
    this.canvas = canvas;
    this.sounds = sounds;
    this.coins = [];
    this.coinScore = 0;
    this.particles = [];
  }

  update(player, score, comboMultiplier, cameraY) {
    // Update coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.rotation += 0.1;

      // Check collision
      const dx = player.x - coin.x;
      const dy = (player.y - player.height / 2) - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < player.width / 2 + coin.size && !coin.collected) {
        coin.collected = true;
        this.coinScore++;
        const bonusScore = Math.floor(100 * comboMultiplier);

        this.createParticles(coin.x, coin.y);
        this.sounds.jump.currentTime = 0;
        this.sounds.jump.play().catch(() => { });

        this.coins.splice(i, 1);

        const barrierEarned = [1, 5, 10, 20].includes(this.coinScore);
        return { bonusScore, barrierEarned };
      }

      if (coin.y > cameraY + this.canvas.height + 200) {
        this.coins.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    return { bonusScore: 0, barrierEarned: false };
  }

  spawn(x, y) {
    if (Math.random() < 0.3) {
      this.coins.push({
        x: x,
        y: y,
        size: 12,
        collected: false,
        rotation: Math.random() * Math.PI * 2
      });
    }
  }

  createParticles(x, y) {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
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

  draw(ctx) {
    // Draw coins
    this.coins.forEach(coin => {
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

    // Draw particles
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  reset() {
    this.coins = [];
    this.coinScore = 0;
    this.particles = [];
  }
}
