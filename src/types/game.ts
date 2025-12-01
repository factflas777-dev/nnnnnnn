export interface Vector2 {
  x: number;
  y: number;
}

export interface SnakeSegment {
  x: number;
  y: number;
  radius: number;
}

export interface Snake {
  id: string;
  username: string;
  segments: SnakeSegment[];
  color: string;
  skin: string;
  direction: number;
  targetDirection: number;
  speed: number;
  mass: number;
  isBoosting: boolean;
  isDead: boolean;
  score: number;
  kills: number;
  isAI?: boolean;
}

export interface Food {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  value: number;
}

export interface GameState {
  snakes: Map<string, Snake>;
  foods: Food[];
  playerSnake: Snake | null;
  camera: {
    x: number;
    y: number;
    zoom: number;
  };
  mapSize: {
    width: number;
    height: number;
  };
}

export interface LeaderboardEntry {
  username: string;
  score: number;
  id: string;
}

export interface PlayerStats {
  score: number;
  mass: number;
  kills: number;
  timeAlive: number;
  rank: number;
}
