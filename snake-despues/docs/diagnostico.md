# Diagnóstico del código "antes" (`snake-antes/server.js`)

Seis problemas concretos, cada uno citado por archivo y línea exacta del código original, junto con la violación de diseño que representa y cómo se resuelve en `snake-despues`.

## 1. Estado global mutable

**Dónde:** `snake-antes/server.js:11-12`
```js
let rooms = {};
let nextPlayerId = 1;
```
Todas las salas y jugadores del servidor viven en variables de módulo que cualquier callback (`join`, `move`, `restart`, `close`, el propio game loop) lee y muta sin control. No hay un punto único que garantice consistencia del registro de salas.

**Cómo se resuelve:** `RoomManager` (Singleton) encapsula el registro de salas detrás de una única instancia con una API explícita (`getOrCreateRoom`, `getRoom`, `removeRoomIfEmpty`). Ver [`singleton-roommanager.md`](patrones/singleton-roommanager.md).

## 2. Despachador de mensajes por cadena de `if/else`

**Dónde:** `snake-antes/server.js:44` (`if (msg.type === 'join')`), `:101` (`if (msg.type === 'move')`), `:117` (`if (msg.type === 'restart')`), todos dentro del mismo `ws.on('message', ...)`.

Añadir un nuevo tipo de mensaje (por ejemplo, cambiar de modo de juego) obliga a editar este mismo bloque cada vez — viola el Principio Abierto/Cerrado (OCP).

**Cómo se resuelve:** `snake-despues/src/ws/connectionHandler.js` reemplaza la cadena de `if` por una tabla de despacho (`HANDLERS = { join, move, restart }`); agregar un tipo nuevo es agregar una entrada, no editar un condicional creciente.

## 3. Bloque de cuenta regresiva duplicado literalmente

**Dónde:** `snake-antes/server.js:86-99` (dentro de `join`) y `snake-antes/server.js:141-154` (dentro de `restart`) — el mismo `setInterval` de cuenta regresiva, copiado y pegado carácter por carácter.

**Cómo se resuelve:** `CountdownState` (State) centraliza esa lógica en un único lugar; tanto `WaitingState.onPlayerJoined()` como `GameOverState.onRestartRequested()` simplemente transicionan a `new CountdownState(room)`. Ver [`state-roomstate.md`](patrones/state-roomstate.md).

## 4. Números mágicos repetidos sin una constante nombrada

**Dónde:** el tamaño de tablero `30` aparece suelto en `server.js:196`, `:240`, `:241`, `:266`, `:267`; el máximo de jugadores `4` en `:58`; el intervalo del loop `150` en `:298`; la probabilidad de power-up `0.02` en `:262`.

Si se quisiera cambiar el tamaño del tablero habría que tocar 5 sitios distintos y confiar en no olvidar ninguno.

**Cómo se resuelve:** `snake-despues/src/config.js` centraliza `BOARD_SIZE`, `MAX_PLAYERS`, `TICK_MS`, `POWERUP_SPAWN_CHANCE`, `MIN_PLAYERS_TO_START` y `COUNTDOWN_SECONDS` como única fuente de verdad, importada donde se necesita.

## 5. Comparación "misma celda" duplicada cuatro veces

**Dónde:** la misma comparación `seg.x === X && seg.y === Y` se reescribe con variables distintas en `server.js:203-209` (colisión con el propio cuerpo), `:217-226` (colisión con otras serpientes), `:236-244` (evitar la comida al reaparecer) y `:263-271` (evitar el power-up al reaparecer).

**Cómo se resuelve:** `Snake.occupies(point)` (`snake-despues/src/core/Snake.js`) concentra esa comparación en un único método reutilizado por `GameRoom.runRound`, `collidesWithOtherSnake` y `randomFreePosition`.

## 6. El game loop mezcla física, colisiones, spawn de entidades y transporte WebSocket

**Dónde:** `snake-antes/server.js:177-298` — una sola función pasada a `setInterval` mueve las serpientes, calcula las tres colisiones, genera comida y power-ups, evalúa el fin de partida **y** llama `ws.send` a cada jugador, todo en el mismo bloque. Viola el Principio de Responsabilidad Única (SRP).

**Cómo se resuelve:** en `snake-despues/src/core/GameRoom.js`, `runRound()` solo calcula el nuevo estado del juego y termina con `this.notify('state', ...)`; el envío por WebSocket vive exclusivamente en `BroadcastObserver` (Observer), que ni siquiera es conocido por `GameRoom` más allá de la interfaz `update(event, payload)`. Ver [`observer-broadcast.md`](patrones/observer-broadcast.md).
