import { Snake, GameState } from '../types/game';

interface MinimapProps {
  gameState: GameState;
  playerSnake: Snake | null;
}

export default function Minimap({ gameState, playerSnake }: MinimapProps) {
  if (!playerSnake) return null;

  const minimapSize = 150;
  const scale = minimapSize / Math.max(gameState.mapSize.width, gameState.mapSize.height);

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-60 border-2 border-gray-600 rounded-lg overflow-hidden z-40">
      <svg width={minimapSize} height={minimapSize}>
        <rect width={minimapSize} height={minimapSize} fill="#1a1a1a" />

        <rect
          x={0}
          y={0}
          width={gameState.mapSize.width * scale}
          height={gameState.mapSize.height * scale}
          fill="none"
          stroke="#444"
          strokeWidth={1}
        />

        {Array.from(gameState.snakes.values()).map((snake) => {
          if (snake.isDead) return null;
          const head = snake.segments[0];
          return (
            <circle
              key={snake.id}
              cx={head.x * scale}
              cy={head.y * scale}
              r={snake.id === playerSnake.id ? 4 : 2}
              fill={snake.id === playerSnake.id ? '#ffff00' : snake.color}
              opacity={0.8}
            />
          );
        })}
      </svg>
    </div>
  );
}
