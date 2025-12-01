import { Snake, Food, GameState } from '../types/game';
import { calculateDistance, lerpAngle, generateFood } from './GameUtils';

export function updateSnakePhysics(snake: Snake, deltaTime: number) {
  const turnSpeed = 0.08 * deltaTime;
  snake.direction = lerpAngle(snake.direction, snake.targetDirection, turnSpeed);

  let actualSpeed = snake.speed;
  if (snake.isBoosting && snake.mass > 50) {
    actualSpeed *= 1.8;
    snake.mass -= 0.3 * deltaTime;
    snake.score = Math.max(0, snake.score - 1);
  }

  const head = snake.segments[0];
  const newX = head.x + Math.cos(snake.direction) * actualSpeed * deltaTime;
  const newY = head.y + Math.sin(snake.direction) * actualSpeed * deltaTime;

  snake.segments.unshift({
    x: newX,
    y: newY,
    radius: head.radius
  });

  let totalRadius = 0;
  snake.segments.forEach(seg => totalRadius += seg.radius);

  const maxLength = Math.floor(snake.mass / 8);
  while (snake.segments.length > maxLength) {
    snake.segments.pop();
  }

  const baseRadius = 8;
  const radiusMultiplier = Math.log(snake.mass / 10 + 1) * 2;
  const targetRadius = baseRadius + radiusMultiplier;

  snake.segments.forEach((segment, index) => {
    const segmentScale = 1 - (index / snake.segments.length) * 0.3;
    segment.radius = targetRadius * segmentScale;
  });

  for (let i = 1; i < snake.segments.length; i++) {
    const current = snake.segments[i];
    const previous = snake.segments[i - 1];

    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const targetDistance = (previous.radius + current.radius) * 0.5;

    if (distance > targetDistance) {
      const ratio = targetDistance / distance;
      current.x = previous.x + dx * ratio;
      current.y = previous.y + dy * ratio;
    }
  }
}

export function checkCollisions(gameState: GameState) {
  const { snakes, foods, playerSnake } = gameState;

  snakes.forEach(snake => {
    if (snake.isDead) return;

    const head = snake.segments[0];

    for (let i = foods.length - 1; i >= 0; i--) {
      const food = foods[i];
      const distance = calculateDistance(head.x, head.y, food.x, food.y);

      if (distance < head.radius + food.radius) {
        snake.mass += food.value * 5;
        snake.score += 1;
        foods.splice(i, 1);
      }
    }

    snakes.forEach(otherSnake => {
      if (otherSnake.id === snake.id || otherSnake.isDead) return;

      for (let i = 1; i < otherSnake.segments.length; i++) {
        const segment = otherSnake.segments[i];
        const distance = calculateDistance(head.x, head.y, segment.x, segment.y);

        if (distance < head.radius + segment.radius - 5) {
          snake.isDead = true;

          const segments = snake.segments;
          for (let j = 0; j < segments.length; j += 2) {
            const seg = segments[j];
            foods.push({
              id: `food_death_${Math.random()}`,
              x: seg.x + (Math.random() - 0.5) * 20,
              y: seg.y + (Math.random() - 0.5) * 20,
              radius: 5,
              color: snake.color,
              value: 2
            });
          }

          if (!snake.isAI) {
            otherSnake.kills++;
            otherSnake.score += 50;
          }

          break;
        }
      }
    });

    if (head.x < 0 || head.x > gameState.mapSize.width ||
        head.y < 0 || head.y > gameState.mapSize.height) {
      snake.isDead = true;
    }
  });
}

export function updateAI(snake: Snake, foods: Food[], allSnakes: Snake[]) {
  const head = snake.segments[0];
  let targetX = head.x;
  let targetY = head.y;
  let foundTarget = false;

  const visionRange = 300;

  const nearbyFood = foods.filter(food => {
    const distance = calculateDistance(head.x, head.y, food.x, food.y);
    return distance < visionRange;
  });

  if (nearbyFood.length > 0) {
    nearbyFood.sort((a, b) => {
      const distA = calculateDistance(head.x, head.y, a.x, a.y);
      const distB = calculateDistance(head.x, head.y, b.x, b.y);
      return distA - distB;
    });

    const closestFood = nearbyFood[0];
    targetX = closestFood.x;
    targetY = closestFood.y;
    foundTarget = true;
  }

  const dangerSnakes = allSnakes.filter(other => {
    if (other.id === snake.id || other.isDead) return false;
    if (other.mass <= snake.mass) return false;

    const distance = calculateDistance(head.x, head.y, other.segments[0].x, other.segments[0].y);
    return distance < visionRange * 0.7;
  });

  if (dangerSnakes.length > 0) {
    const dangerSnake = dangerSnakes[0];
    const dangerHead = dangerSnake.segments[0];

    targetX = head.x + (head.x - dangerHead.x);
    targetY = head.y + (head.y - dangerHead.y);
    foundTarget = true;
    snake.isBoosting = true;
  } else {
    snake.isBoosting = false;
  }

  if (!foundTarget) {
    if (Math.random() < 0.02) {
      snake.targetDirection += (Math.random() - 0.5) * 0.5;
    }
  } else {
    const dx = targetX - head.x;
    const dy = targetY - head.y;
    snake.targetDirection = Math.atan2(dy, dx);
  }
}
