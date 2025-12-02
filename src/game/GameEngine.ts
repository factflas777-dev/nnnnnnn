import { Snake, Food, GameState, Vector2 } from '../types/game';
import { generateFood, generateAISnake } from './GameUtils';
import { updateSnakePhysics, checkCollisions, updateAI } from './GamePhysics';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private startTime: number = 0;

  private readonly MAP_WIDTH = 5000;
  private readonly MAP_HEIGHT = 5000;
  private readonly INITIAL_FOOD_COUNT = 500;
  private readonly MAX_AI_SNAKES = 15;

  private mousePos: Vector2 = { x: 0, y: 0 };
  private touchPos: Vector2 | null = null;
  private isBoosting: boolean = false;
  private faceTextures: Map<string, HTMLImageElement> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.gameState = {
      snakes: new Map(),
      foods: [],
      playerSnake: null,
      camera: { x: 0, y: 0, zoom: 1 },
      mapSize: { width: this.MAP_WIDTH, height: this.MAP_HEIGHT }
    };

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  public initialize(playerName: string, color: string, skin: string, faceUrl?: string) {
    this.gameState.foods = [];
    for (let i = 0; i < this.INITIAL_FOOD_COUNT; i++) {
      this.gameState.foods.push(generateFood(this.MAP_WIDTH, this.MAP_HEIGHT));
    }

    const startX = this.MAP_WIDTH / 2 + (Math.random() - 0.5) * 1000;
    const startY = this.MAP_HEIGHT / 2 + (Math.random() - 0.5) * 1000;

    this.gameState.playerSnake = this.createSnake('player', playerName, startX, startY, color, skin, faceUrl);
    this.gameState.snakes.set('player', this.gameState.playerSnake);

    if (faceUrl) {
      this.loadFaceTexture('player', faceUrl);
    }

    for (let i = 0; i < this.MAX_AI_SNAKES; i++) {
      const aiSnake = generateAISnake(this.MAP_WIDTH, this.MAP_HEIGHT, i);
      this.gameState.snakes.set(aiSnake.id, aiSnake);
    }

    this.startTime = Date.now();
  }

  private createSnake(id: string, username: string, x: number, y: number, color: string, skin: string, faceUrl?: string): Snake {
    const segments: { x: number; y: number; radius: number }[] = [];
    const initialSegments = 10;
    const segmentRadius = 8;

    for (let i = 0; i < initialSegments; i++) {
      segments.push({ x: x - i * segmentRadius, y, radius: segmentRadius });
    }

    return {
      id,
      username,
      segments,
      color,
      skin,
      direction: 0,
      targetDirection: 0,
      speed: 3,
      mass: initialSegments * 10,
      isBoosting: false,
      isDead: false,
      score: 0,
      kills: 0,
      isAI: id !== 'player',
      faceUrl: faceUrl
    };
  }

  private loadFaceTexture(snakeId: string, faceUrl: string) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.faceTextures.set(snakeId, img);
    };
    img.onerror = () => {
      console.error(`Failed to load face texture for ${snakeId}`);
    };
    img.src = faceUrl;
  }

  public start() {
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private gameLoop = () => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 16.67;
    this.lastFrameTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number) {
    if (!this.gameState.playerSnake || this.gameState.playerSnake.isDead) return;

    this.gameState.playerSnake.isBoosting = this.isBoosting;

    if (this.touchPos) {
      const dx = this.touchPos.x - this.canvas.width / 2;
      const dy = this.touchPos.y - this.canvas.height / 2;
      this.gameState.playerSnake.targetDirection = Math.atan2(dy, dx);
    } else {
      const dx = this.mousePos.x - this.canvas.width / 2;
      const dy = this.mousePos.y - this.canvas.height / 2;
      this.gameState.playerSnake.targetDirection = Math.atan2(dy, dx);
    }

    this.gameState.snakes.forEach(snake => {
      if (snake.isDead) return;

      if (snake.isAI) {
        updateAI(snake, this.gameState.foods, Array.from(this.gameState.snakes.values()));
      }

      updateSnakePhysics(snake, deltaTime);
    });

    checkCollisions(this.gameState);

    if (this.gameState.foods.length < this.INITIAL_FOOD_COUNT) {
      const toAdd = this.INITIAL_FOOD_COUNT - this.gameState.foods.length;
      for (let i = 0; i < toAdd; i++) {
        this.gameState.foods.push(generateFood(this.MAP_WIDTH, this.MAP_HEIGHT));
      }
    }

    this.gameState.snakes.forEach((snake, id) => {
      if (snake.isDead && snake.isAI) {
        this.gameState.snakes.delete(id);
        const newAI = generateAISnake(this.MAP_WIDTH, this.MAP_HEIGHT, Math.floor(Math.random() * 1000));
        this.gameState.snakes.set(newAI.id, newAI);
      }
    });

    if (this.gameState.playerSnake) {
      const head = this.gameState.playerSnake.segments[0];
      this.gameState.camera.x = head.x;
      this.gameState.camera.y = head.y;

      const baseMass = 100;
      const zoomFactor = Math.max(0.5, Math.min(1.5, baseMass / this.gameState.playerSnake.mass));
      this.gameState.camera.zoom = zoomFactor;
    }
  }

  private render() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();

    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.gameState.camera.zoom, this.gameState.camera.zoom);
    this.ctx.translate(-this.gameState.camera.x, -this.gameState.camera.y);

    this.drawGrid();
    this.drawMapBorder();
    this.drawFood();
    this.drawSnakes();

    this.ctx.restore();
  }

  private drawGrid() {
    const gridSize = 50;
    const startX = Math.floor((this.gameState.camera.x - this.canvas.width / this.gameState.camera.zoom) / gridSize) * gridSize;
    const endX = Math.ceil((this.gameState.camera.x + this.canvas.width / this.gameState.camera.zoom) / gridSize) * gridSize;
    const startY = Math.floor((this.gameState.camera.y - this.canvas.height / this.gameState.camera.zoom) / gridSize) * gridSize;
    const endY = Math.ceil((this.gameState.camera.y + this.canvas.height / this.gameState.camera.zoom) / gridSize) * gridSize;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    for (let x = startX; x <= endX; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
      this.ctx.stroke();
    }

    for (let y = startY; y <= endY; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
      this.ctx.stroke();
    }
  }

  private drawMapBorder() {
    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 10;
    this.ctx.strokeRect(0, 0, this.MAP_WIDTH, this.MAP_HEIGHT);
  }

  private drawFood() {
    this.gameState.foods.forEach(food => {
      this.ctx.beginPath();
      this.ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = food.color;
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
  }

  private drawSnakes() {
    const snakesArray = Array.from(this.gameState.snakes.values()).sort((a, b) => a.mass - b.mass);

    snakesArray.forEach(snake => {
      if (snake.isDead) return;

      for (let i = snake.segments.length - 1; i >= 0; i--) {
        const segment = snake.segments[i];

        this.ctx.beginPath();
        this.ctx.arc(segment.x, segment.y, segment.radius, 0, Math.PI * 2);

        if (i === 0) {
          this.ctx.fillStyle = snake.color;
        } else {
          this.ctx.fillStyle = this.adjustBrightness(snake.color, 0.8);
        }
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        if (snake.skin !== 'default' && i % 2 === 0) {
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      }

      const head = snake.segments[0];
      const faceTexture = this.faceTextures.get(snake.id);

      if (faceTexture && snake.faceUrl) {
        this.ctx.save();
        this.ctx.translate(head.x, head.y);
        this.ctx.rotate(snake.direction);

        this.ctx.beginPath();
        this.ctx.arc(0, 0, head.radius, 0, Math.PI * 2);
        this.ctx.clip();

        const size = head.radius * 2;
        this.ctx.drawImage(faceTexture, -head.radius, -head.radius, size, size);

        this.ctx.restore();

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(head.x, head.y, head.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
      } else {
        this.ctx.save();
        this.ctx.translate(head.x, head.y);
        this.ctx.rotate(snake.direction);

        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(head.radius * 0.3, -head.radius * 0.3, head.radius * 0.25, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(head.radius * 0.3, head.radius * 0.3, head.radius * 0.25, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(head.radius * 0.35, -head.radius * 0.3, head.radius * 0.15, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(head.radius * 0.35, head.radius * 0.3, head.radius * 0.15, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
      }

      this.ctx.save();
      this.ctx.font = 'bold 14px Arial';
      this.ctx.fillStyle = 'white';
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 3;
      this.ctx.textAlign = 'center';
      this.ctx.strokeText(snake.username, head.x, head.y - head.radius - 10);
      this.ctx.fillText(snake.username, head.x, head.y - head.radius - 10);
      this.ctx.restore();
    });
  }

  private adjustBrightness(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = Math.floor(parseInt(hex.substr(0, 2), 16) * factor);
    const g = Math.floor(parseInt(hex.substr(2, 2), 16) * factor);
    const b = Math.floor(parseInt(hex.substr(4, 2), 16) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }

  public setMousePosition(x: number, y: number) {
    this.mousePos = { x, y };
  }

  public setTouchPosition(x: number | null, y: number | null) {
    if (x === null || y === null) {
      this.touchPos = null;
    } else {
      this.touchPos = { x, y };
    }
  }

  public setBoosting(boosting: boolean) {
    this.isBoosting = boosting;
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getTimeAlive(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  public respawn(playerName: string, color: string, skin: string, faceUrl?: string) {
    const startX = this.MAP_WIDTH / 2 + (Math.random() - 0.5) * 1000;
    const startY = this.MAP_HEIGHT / 2 + (Math.random() - 0.5) * 1000;

    this.gameState.playerSnake = this.createSnake('player', playerName, startX, startY, color, skin, faceUrl);
    this.gameState.snakes.set('player', this.gameState.playerSnake);

    if (faceUrl) {
      this.loadFaceTexture('player', faceUrl);
    }

    this.startTime = Date.now();
  }
}
