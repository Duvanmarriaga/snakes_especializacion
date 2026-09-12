const DELTAS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

class Snake {
  constructor(id, name, startPosition) {
    this.id = id;
    this.name = name;
    this.reset(startPosition);
  }

  reset(startPosition) {
    this.body = [
      { x: startPosition.x, y: startPosition.y },
      { x: startPosition.x - 1, y: startPosition.y },
      { x: startPosition.x - 2, y: startPosition.y },
    ];
    this.direction = 'right';
    this.pendingDirection = 'right';
    this.alive = true;
    this.score = 0;
  }

  setDirection(dir) {
    if (!DELTAS[dir]) return;
    if (dir !== OPPOSITE[this.direction]) {
      this.pendingDirection = dir;
    }
  }

  peekNextHead() {
    this.direction = this.pendingDirection;
    const head = this.body[0];
    const delta = DELTAS[this.direction];
    return { x: head.x + delta.x, y: head.y + delta.y };
  }

  advance(newHead, grow) {
    this.body.unshift(newHead);
    if (!grow) this.body.pop();
  }

  // Unico lugar del proyecto donde se compara "misma celda que un segmento":
  // reemplaza los 4 bucles casi identicos que existian en snake-antes/server.js.
  occupies(point) {
    return this.body.some((segment) => segment.x === point.x && segment.y === point.y);
  }

  kill() {
    this.alive = false;
  }
}

module.exports = Snake;
