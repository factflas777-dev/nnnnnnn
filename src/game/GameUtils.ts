import { Food, Snake } from '../types/game';

export function generateFood(mapWidth: number, mapHeight: number): Food {
  const colors = [
    '#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff',
    '#ff8844', '#88ff44', '#4488ff', '#ff4488', '#88ff88', '#8844ff'
  ];

  return {
    id: `food_${Math.random().toString(36).substr(2, 9)}`,
    x: Math.random() * mapWidth,
    y: Math.random() * mapHeight,
    radius: 4 + Math.random() * 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    value: 1
  };
}

export function generateAISnake(mapWidth: number, mapHeight: number, index: number): Snake {
  const names = [
    'SlitherBot', 'SnakeAI', 'Viper', 'Cobra', 'Python', 'Anaconda',
    'Sidewinder', 'Rattler', 'Mamba', 'Adder', 'Boa', 'Constrictor',
    'KingSnake', 'GarterSnake', 'CopperHead', 'SeaSnake'
  ];

  const colors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7',
    '#a29bfe', '#fd79a8', '#fdcb6e', '#e17055', '#00b894'
  ];

  const x = Math.random() * mapWidth;
  const y = Math.random() * mapHeight;
  const segments: { x: number; y: number; radius: number }[] = [];
  const initialSegments = 8 + Math.floor(Math.random() * 5);
  const segmentRadius = 8;

  for (let i = 0; i < initialSegments; i++) {
    segments.push({ x: x - i * segmentRadius, y, radius: segmentRadius });
  }

  return {
    id: `ai_${index}_${Date.now()}`,
    username: names[index % names.length],
    segments,
    color: colors[Math.floor(Math.random() * colors.length)],
    skin: 'default',
    direction: Math.random() * Math.PI * 2,
    targetDirection: Math.random() * Math.PI * 2,
    speed: 2.5 + Math.random() * 1,
    mass: initialSegments * 10,
    isBoosting: false,
    isDead: false,
    score: 0,
    kills: 0,
    isAI: true
  };
}

export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function lerpAngle(from: number, to: number, t: number): number {
  const diff = normalizeAngle(to - from);
  return from + diff * t;
}
