// Unica fuente de verdad para las constantes del juego.
// En la version "antes" estos mismos valores estaban repetidos como numeros
// magicos (30, 4, 150, 0.02) en varios puntos de server.js.
module.exports = {
  BOARD_SIZE: 30,
  TICK_MS: 150,
  MAX_PLAYERS: 4,
  MIN_PLAYERS_TO_START: 2,
  POWERUP_SPAWN_CHANCE: 0.02,
  COUNTDOWN_SECONDS: 3,
};
