# Diagnóstico del código "antes" (`snake-antes/server.js`)

Seis problemas concretos, cada uno citado por archivo y línea exacta del código original, junto con la violación de diseño que representa y cómo se resuelve en `snake-despues`.

## 1. Estado global mutable

**Dónde:** `snake-antes/server.js:8-9`
```js
let rooms = {};
let nextPlayerId = 1;
```
Todas las salas y jugadores del servidor viven en variables de módulo que cualquier callback (`join`, `move`, `restart`, `close`, el propio game loop) lee y muta sin control. No hay un punto único que garantice consistencia del registro de salas.

**Cómo se resuelve:** `RoomManager` (Singleton) encapsula el registro de salas detrás de una única instancia con una API explícita (`getOrCreateRoom`, `getRoom`, `removeRoomIfEmpty`). Ver [`singleton-roommanager.md`](patrones/singleton-roommanager.md).

## 2. Despachador de mensajes por cadena de `if/else`

**Dónde:** `snake-antes/server.js:39` (`if (msg.type === 'join')`), `:98` (`if (msg.type === 'start')`), `:120` (`if (msg.type === 'spectate')`), `:142` (`if (msg.type === 'move')`), `:158` (`if (msg.type === 'restart')`), todos dentro del mismo `ws.on('message', ...)`.

Añadir un nuevo tipo de mensaje (por ejemplo, `start` para permitir arrancar la partida con un solo jugador) obliga a editar este mismo bloque cada vez, copiando y pegando el mismo `if` — viola el Principio Abierto/Cerrado (OCP). De hecho, el mensaje `start` añadido para el modo un jugador es la prueba en vivo del problema: es una tercera copia casi idéntica del bloque de cuenta regresiva (ver punto 3).

**Cómo se resuelve:** `snake-despues/src/ws/connectionHandler.js` reemplaza la cadena de `if` por una tabla de despacho (`HANDLERS = { join, move, start, restart }`); agregar el tipo `start` para el modo un jugador fue agregar una entrada a esa tabla y una función `handleStart`, no editar un condicional creciente.

## 3. Bloque de cuenta regresiva duplicado literalmente

**Dónde:** `snake-antes/server.js:80-94` (dentro de `join`), `:98-118` (dentro de `start`, el mensaje agregado para permitir jugar de a una persona) y `:158-196` (dentro de `restart`) — el mismo `setInterval` de cuenta regresiva, copiado y pegado carácter por carácter tres veces.

**Cómo se resuelve:** `CountdownState` (State) centraliza esa lógica en un único lugar; `WaitingState.onPlayerJoined()`, `WaitingState.onStartRequested()` (modo un jugador) y `GameOverState.onRestartRequested()` simplemente transicionan a `new CountdownState(room)` sin repetir el `setInterval`. Ver [`state-roomstate.md`](patrones/state-roomstate.md).

## 4. Números mágicos repetidos sin una constante nombrada

**Dónde:** el tamaño de tablero `30` aparece suelto en `server.js:222`, `:223`, `:256` (dos veces), `:308`, `:309`, `:336`, `:337`; el máximo de jugadores `4` en `:55`; el intervalo del loop `150` en `:372`; la probabilidad de power-up `0.02` en `:332`; y la cantidad de obstáculos `10` (agregada junto con la funcionalidad de obstáculos) en `:218`.

Si se quisiera cambiar el tamaño del tablero habría que tocar 7 sitios distintos y confiar en no olvidar ninguno — y cada función nueva que se agrega (como `generateObstacles`) reintroduce el mismo `30` suelto en vez de reutilizar una constante.

**Cómo se resuelve:** `snake-despues/src/config.js` centraliza `BOARD_SIZE`, `MAX_PLAYERS`, `TICK_MS`, `POWERUP_SPAWN_CHANCE`, `MIN_PLAYERS_TO_START`, `COUNTDOWN_SECONDS` y `OBSTACLE_COUNT` como única fuente de verdad, importada donde se necesita.

## 5. Comparación "misma celda" duplicada ocho veces

**Dónde:** la misma comparación `x === X && y === Y` se reescribe con variables distintas en `server.js:261-267` (colisión con el propio cuerpo), `:273-283` (colisión con otras serpientes), `:289-295` (colisión con un obstáculo), `:303` y `:318` (evitar comida/power-up al reaparecer), y otra vez en `generateObstacles` (`:226`, `:230`, `:232`) y en el spawn de power-up (`:340`, `:344`). La funcionalidad de obstáculos agregada duplicó el problema en vez de reutilizar nada: cada punto nuevo que necesita "¿esta celda está ocupada?" vuelve a escribir su propio bucle.

**Cómo se resuelve:** `Snake.occupies(point)` (`snake-despues/src/core/Snake.js`) y `GameRoom.collidesWithObstacle(point)` (`snake-despues/src/core/GameRoom.js`) concentran esa comparación en un único lugar cada uno, reutilizados por `GameRoom.runRound`, `collidesWithOtherSnake`, `isOccupied` y `spawnObstacles` — agregar obstáculos en la versión "después" no repitió ni una sola vez esa comparación.

## 6. El game loop mezcla física, colisiones, spawn de entidades y transporte WebSocket

**Dónde:** `snake-antes/server.js:238-373` (función `startGameLoop`) — una sola función pasada a `setInterval` mueve las serpientes, calcula las cuatro colisiones (borde, cuerpo propio, otras serpientes y, ahora, obstáculos), genera comida y power-ups, evalúa el fin de partida **y** llama `ws.send` a cada jugador, todo en el mismo bloque. Viola el Principio de Responsabilidad Única (SRP). Agregar la colisión con obstáculos solo pudo hacerse insertando otro bloque `let hitObstacle = false; for (...) {...}` más dentro de esta misma función.

**Cómo se resuelve:** en `snake-despues/src/core/GameRoom.js`, `runRound()` solo calcula el nuevo estado del juego y termina con `this.notify('state', ...)`; el envío por WebSocket vive exclusivamente en `BroadcastObserver` (Observer), que ni siquiera es conocido por `GameRoom` más allá de la interfaz `update(event, payload)`. Ver [`observer-broadcast.md`](patrones/observer-broadcast.md).
