// UI drawing functions
export class UISystem {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  drawText(text, x, y, color = 'black') {
    this.ctx.strokeText(text, x, y);
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }

  drawScore(score, coinScore, highScore) {
    this.ctx.fillStyle = 'black';
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 3;
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'left';

    this.drawText(`Score: ${score}`, 10, 30);
    this.drawText(`Coins: ${coinScore}`, 10, 60, '#FFD700');
    this.drawText(`Best: ${highScore}`, 10, 90);
  }

  drawGameOver(score, highScore) {
    // Dark overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // White rounded rectangle background
    const boxWidth = 350;
    const boxHeight = 300;
    const boxX = this.canvas.width / 2 - boxWidth / 2;
    const boxY = this.canvas.height / 2 - boxHeight / 2;
    const radius = 20;

    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.moveTo(boxX + radius, boxY);
    this.ctx.lineTo(boxX + boxWidth - radius, boxY);
    this.ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
    this.ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
    this.ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
    this.ctx.lineTo(boxX + radius, boxY + boxHeight);
    this.ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
    this.ctx.lineTo(boxX, boxY + radius);
    this.ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
    this.ctx.closePath();
    this.ctx.fill();

    // Game over text
    this.ctx.fillStyle = 'black';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);

    this.ctx.font = '28px Arial';
    this.ctx.fillText(`Score: ${score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
    this.ctx.fillText(`Best: ${highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 50);

    this.ctx.font = '20px Arial';
    this.ctx.fillText('Click to restart', this.canvas.width / 2, this.canvas.height / 2 + 100);
  }
}
