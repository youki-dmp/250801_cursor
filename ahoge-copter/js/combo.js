// Combo system
import { comboTimeout } from './constants.js';

export class ComboSystem {
  constructor(sounds) {
    this.sounds = sounds;
    this.count = 0;
    this.multiplier = 1.0;
    this.lastLandingTime = 0;
    this.lastPlatformId = null;
    this.particles = [];
  }

  update() {
    // Check timeout
    if (this.count > 0 && Date.now() - this.lastLandingTime > comboTimeout) {
      this.count = 0;
      this.updateMultiplier();
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  onLanding(platformId, playerX, playerY) {
    if (this.lastPlatformId !== platformId) {
      this.count++;
      this.lastLandingTime = Date.now();
      this.updateMultiplier();
      this.lastPlatformId = platformId;

      if (this.count % 5 === 0) {
        this.createParticle(playerX, playerY - 30);
        this.sounds.jump.currentTime = 0;
        this.sounds.jump.play().catch(() => { });
      }
    }
  }

  reset() {
    this.count = 0;
    this.multiplier = 1.0;
    this.lastPlatformId = null;
  }

  resetOnCopter() {
    if (this.count > 0) {
      this.count = 0;
      this.updateMultiplier();
    }
  }

  updateMultiplier() {
    if (this.count >= 20) {
      this.multiplier = 3.0;
    } else if (this.count >= 10) {
      this.multiplier = 2.0;
    } else if (this.count >= 5) {
      this.multiplier = 1.5;
    } else {
      this.multiplier = 1.0;
    }
  }

  createParticle(x, y) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
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

  drawParticles(ctx) {
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

  drawUI(ctx, canvas) {
    if (this.count < 2) return;

    ctx.save();
    ctx.textAlign = 'center';

    const pulseScale = 1 + Math.sin(Date.now() / 100) * 0.1;
    ctx.font = `bold ${30 * pulseScale}px Arial`;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;
    ctx.fillStyle = this.multiplier >= 3.0 ? '#FF4500' : this.multiplier >= 2.0 ? '#FF8C00' : '#FFD700';

    const comboText = `${this.count} COMBO!`;
    ctx.strokeText(comboText, canvas.width / 2, 120);
    ctx.fillText(comboText, canvas.width / 2, 120);

    ctx.font = '20px Arial';
    ctx.fillStyle = 'white';
    const multText = `×${this.multiplier.toFixed(1)}`;
    ctx.strokeText(multText, canvas.width / 2, 150);
    ctx.fillText(multText, canvas.width / 2, 150);

    ctx.restore();
  }
}
