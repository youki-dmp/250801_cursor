// Game configuration constants
export const config = {
  gravity: 0.4,
  jumpSpeed: -12,
  springJumpSpeed: -18,
  moveSpeed: 5,
  copterGravity: 0.12,
  basePlatformSpacing: 80,
  platformWidth: 70,
  platformHeight: 15
};

// Difficulty scaling thresholds
export const difficultyThresholds = [
  { score: 0, spacingMultiplier: 1.0, fragileRate: 0.15, movingSpeed: 2 },
  { score: 200, spacingMultiplier: 1.2, fragileRate: 0.25, movingSpeed: 2.5 },
  { score: 500, spacingMultiplier: 1.4, fragileRate: 0.35, movingSpeed: 3 },
  { score: 1000, spacingMultiplier: 1.6, fragileRate: 0.45, movingSpeed: 3.5 },
  { score: 2000, spacingMultiplier: 1.8, fragileRate: 0.55, movingSpeed: 4 }
];

// Platform types
export const PlatformType = {
  NORMAL: 'normal',
  FRAGILE: 'fragile',
  MOVING: 'moving',
  SPRING: 'spring'
};

export const comboTimeout = 2000; // 2 seconds to maintain combo
