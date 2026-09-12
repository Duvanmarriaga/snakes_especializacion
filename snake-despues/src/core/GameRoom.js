const WaitingState = require('../states/WaitingState');
const ClassicCollisionStrategy = require('../strategies/ClassicCollisionStrategy');
const FoodFactory = require('../factories/FoodFactory');
const SpeedPowerUpFactory = require('../factories/SpeedPowerUpFactory');
const GrowPowerUpFactory = require('../factories/GrowPowerUpFactory');
const ObstacleFactory = require('../factories/ObstacleFactory');
const {
  BOARD_SIZE,
  INITIAL_TICK_MS,
  MIN_TICK_MS,
  SPEED_UP_INTERVAL_MS,
  SPEED_UP_STEP_MS,
  MAX_PLAYERS,
  POWERUP_SPAWN_CHANCE,
  OBSTACLE_COUNT,
} = require('../config');

class GameRoom {
  constructor(code, collisionStrategy = new ClassicCollisionStrategy()) {
    this.code = code;
    this.players = [];
    this.observers = [];
    this.collisionStrategy = collisionStrategy;
    this.foodFactory = new FoodFactory();
    this.powerUpFactories = [new SpeedPowerUpFactory(), new GrowPowerUpFactory()];
    this.obstacleFactory = new ObstacleFactory();
    this.obstacles = this.spawnObstacles();
    this.food = this.foodFactory.createEntity(this.randomFreePosition());
    this.powerUp = null;
    this.interval = null;
    this.speedUpInterval = null;
    this.tickMs = INITIAL_TICK_MS;
    this.setState(new WaitingState(this));
  }

  addObserver(observer) {
    this.observers.push(observer);
  }

  notify(event, payload) {
    this.observers.forEach((observer) => observer.update(event, payload));
  }

  setState(state) {
    this.state = state;
    require('./RoomManager').getInstance().broadcastRooms();
  }

  isFull() {
    return this.players.length >= MAX_PLAYERS;
  }

  isEmpty() {
    return this.players.length === 0;
  }

  addPlayer(player) {
    this.players.push(player);
    this.state.onPlayerJoined();
    require('./RoomManager').getInstance().broadcastRooms();
  }

  removePlayer(playerId) {
    this.players = this.players.filter((p) => p.id !== playerId);
    if (this.players.length === 0) {
      this.stopGameLoop();
    }
    require('./RoomManager').getInstance().broadcastRooms();
  }

  handleDirection(playerId, dir) {
    const player = this.players.find((p) => p.id === playerId);
    if (player) player.snake.setDirection(dir);
  }

  requestStart() {
    this.state.onStartRequested();
  }

  requestRestart() {
    this.state.onRestartRequested();
  }

  resetPlayers() {
    this.players.forEach((player, index) => {
      player.snake.reset({ x: 3 + index * 5, y: 3 + index * 5 });
    });
    this.obstacles = this.spawnObstacles();
    this.food = this.foodFactory.createEntity(this.randomFreePosition());
    this.powerUp = null;
  }

  reservedStartCells() {
    const cells = [];
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const x = 3 + i * 5;
      const y = 3 + i * 5;
      cells.push({ x, y }, { x: x - 1, y }, { x: x - 2, y });
    }
    return cells;
  }

  spawnObstacles() {
    this.obstacles = [];
    const reserved = this.reservedStartCells();
    for (let i = 0; i < OBSTACLE_COUNT; i++) {
      this.obstacles.push(this.obstacleFactory.createEntity(this.randomFreePosition(reserved)));
    }
    return this.obstacles;
  }

  startGameLoop() {
    this.tickMs = INITIAL_TICK_MS;
    this.scheduleTick();
    this.speedUpInterval = setInterval(() => this.increaseSpeed(), SPEED_UP_INTERVAL_MS);
  }

  scheduleTick() {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.state.tick(), this.tickMs);
  }

  increaseSpeed() {
    if (this.tickMs <= MIN_TICK_MS) return;
    this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEED_UP_STEP_MS);
    this.scheduleTick();
  }

  stopGameLoop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.speedUpInterval) {
      clearInterval(this.speedUpInterval);
      this.speedUpInterval = null;
    }
  }

  randomFreePosition(extraBlocked = []) {
    let position;
    do {
      position = { x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) };
    } while (this.isOccupied(position) || extraBlocked.some((c) => c.x === position.x && c.y === position.y));
    return position;
  }

  isOccupied(point) {
    return this.players.some((p) => p.snake.occupies(point)) || this.collidesWithObstacle(point);
  }

  runRound() {
    for (const player of this.players) {
      if (!player.snake.alive) continue;
      const nextHead = player.snake.peekNextHead();
      const resolvedHead = this.collisionStrategy.resolveWallCollision(nextHead, BOARD_SIZE);

      if (
        !resolvedHead ||
        player.snake.occupies(resolvedHead) ||
        this.collidesWithOtherSnake(player, resolvedHead) ||
        this.collidesWithObstacle(resolvedHead)
      ) {
        player.snake.kill();
        continue;
      }

      const grew = this.tryConsume(player, resolvedHead);
      player.snake.advance(resolvedHead, grew);
    }

    this.maybeSpawnPowerUp();
    this.notify('state', this.getSnapshot());
    return this.players.filter((p) => p.snake.alive).length;
  }

  collidesWithOtherSnake(player, point) {
    return this.players.some((other) => other.id !== player.id && other.snake.alive && other.snake.occupies(point));
  }

  collidesWithObstacle(point) {
    return this.obstacles.some((o) => o.x === point.x && o.y === point.y);
  }

  tryConsume(player, point) {
    if (point.x === this.food.x && point.y === this.food.y) {
      player.snake.score += this.food.value;
      this.food = this.foodFactory.createEntity(this.randomFreePosition());
      return true;
    }
    if (this.powerUp && point.x === this.powerUp.x && point.y === this.powerUp.y) {
      player.snake.score += this.powerUp.value;
      const grew = this.powerUp.applyTo(player.snake);
      this.powerUp = null;
      return grew;
    }
    return false;
  }

  maybeSpawnPowerUp() {
    if (!this.powerUp && Math.random() < POWERUP_SPAWN_CHANCE) {
      const factory = this.powerUpFactories[Math.floor(Math.random() * this.powerUpFactories.length)];
      this.powerUp = factory.createEntity(this.randomFreePosition());
    }
  }

  getSnapshot() {
    return {
      state: this.state.getName(),
      food: { x: this.food.x, y: this.food.y },
      powerup: this.powerUp ? { x: this.powerUp.x, y: this.powerUp.y, kind: this.powerUp.kind } : null,
      obstacles: this.obstacles.map((o) => ({ x: o.x, y: o.y })),
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        body: p.snake.body,
        alive: p.snake.alive,
        score: p.snake.score,
      })),
    };
  }
}

module.exports = GameRoom;
