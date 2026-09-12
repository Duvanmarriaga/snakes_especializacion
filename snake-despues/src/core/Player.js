const Snake = require('./Snake');

class Player {
  constructor(id, name, socket, startPosition) {
    this.id = id;
    this.name = name;
    this.socket = socket;
    this.snake = new Snake(id, name, startPosition);
  }

  send(message) {
    if (this.socket.readyState === this.socket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}

module.exports = Player;
