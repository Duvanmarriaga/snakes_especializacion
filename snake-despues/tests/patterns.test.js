const { test } = require('node:test');
const assert = require('node:assert');

const RoomManager = require('../src/core/RoomManager');
const Snake = require('../src/core/Snake');

const FoodFactory = require('../src/factories/FoodFactory');
const Food = require('../src/core/entities/Food');

const ClassicCollisionStrategy = require('../src/strategies/ClassicCollisionStrategy');
const WrapAroundCollisionStrategy = require('../src/strategies/WrapAroundCollisionStrategy');

const WaitingState = require('../src/states/WaitingState');
const CountdownState = require('../src/states/CountdownState');
const PlayingState = require('../src/states/PlayingState');
const GameOverState = require('../src/states/GameOverState');

const BroadcastObserver = require('../src/observers/BroadcastObserver');

test('Singleton: RoomManager.getInstance() siempre devuelve la misma instancia', () => {
  const a = RoomManager.getInstance();
  const b = RoomManager.getInstance();
  const c = new RoomManager();

  assert.strictEqual(a, b);
  assert.strictEqual(a, c);
});

test('Factory Method: la factory concreta crea el producto correcto', () => {
  const food = new FoodFactory().createEntity({ x: 2, y: 3 });

  assert.ok(food instanceof Food);
  assert.strictEqual(food.kind, 'food');
  assert.strictEqual(food.x, 2);
  assert.strictEqual(food.y, 3);
});

test('Strategy: colision clasica mata en el borde, wrap-around teletransporta', () => {
  const classic = new ClassicCollisionStrategy();
  const wrap = new WrapAroundCollisionStrategy();

  assert.strictEqual(classic.resolveWallCollision({ x: -1, y: 5 }, 30), null);
  assert.deepStrictEqual(classic.resolveWallCollision({ x: 5, y: 5 }, 30), { x: 5, y: 5 });
  assert.deepStrictEqual(wrap.resolveWallCollision({ x: -1, y: 5 }, 30), { x: 29, y: 5 });
  assert.deepStrictEqual(wrap.resolveWallCollision({ x: 30, y: 5 }, 30), { x: 0, y: 5 });
});

test('State: la sala pasa de Waiting a Countdown al alcanzar el minimo de jugadores', () => {
  const fakeRoom = {
    players: [{}, {}],
    notify: () => {},
    setState(state) {
      this.state = state;
    },
  };
  const waiting = new WaitingState(fakeRoom);
  waiting.onPlayerJoined();

  assert.ok(fakeRoom.state instanceof CountdownState);
  assert.strictEqual(fakeRoom.state.getName(), 'countdown');
  clearInterval(fakeRoom.state.timer);
});

test('State: un unico jugador puede forzar el inicio de la partida (modo un jugador)', () => {
  const fakeRoom = {
    players: [{}],
    notify: () => {},
    setState(state) {
      this.state = state;
    },
  };
  const waiting = new WaitingState(fakeRoom);
  waiting.onPlayerJoined();
  assert.strictEqual(fakeRoom.state, undefined);

  waiting.onStartRequested();
  assert.ok(fakeRoom.state instanceof CountdownState);
  clearInterval(fakeRoom.state.timer);
});

test('State: al morir el unico jugador se notifica el snapshot final en estado gameover', () => {
  const notified = [];
  const fakeRoom = {
    players: [{ snake: { alive: false } }],
    startGameLoop: () => {},
    stopGameLoop: () => {},
    runRound: () => 0,
    getSnapshot() {
      return { state: this.state.getName() };
    },
    notify(event, payload) {
      notified.push(payload);
    },
    setState(state) {
      this.state = state;
    },
  };
  const playing = new PlayingState(fakeRoom);
  fakeRoom.setState(playing);
  playing.tick();

  assert.ok(fakeRoom.state instanceof GameOverState);
  assert.strictEqual(notified.length, 1);
  assert.strictEqual(notified[0].state, 'gameover');
});

test('Observer: BroadcastObserver reenvia cada evento a todos los jugadores de la sala', () => {
  const sent = [];
  const fakeRoom = {
    players: [{ send: (msg) => sent.push(msg) }, { send: (msg) => sent.push(msg) }],
  };
  const observer = new BroadcastObserver(fakeRoom);
  observer.update('countdown', { value: 2 });

  assert.strictEqual(sent.length, 2);
  assert.deepStrictEqual(sent[0], { type: 'countdown', value: 2 });
});

test('Snake.occupies detecta colision en una celda compartida', () => {
  const snake = new Snake(1, 'p1', { x: 5, y: 5 });
  assert.strictEqual(snake.occupies({ x: 5, y: 5 }), true);
  assert.strictEqual(snake.occupies({ x: 0, y: 0 }), false);
});
