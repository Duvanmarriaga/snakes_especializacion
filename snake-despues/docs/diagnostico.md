# Diagnóstico del código "antes" (`snake-antes/server.js`)

Cinco problemas concretos, cada uno citado por archivo y línea exacta del código original, junto con la violación de diseño que representa y cómo se resuelve en `snake-despues`.

## 1. Estado global mutable

**Dónde:** `snake-antes/server.js:8-9`
```js
let rooms = {};
let nextPlayerId = 1;
```
Todas las salas y jugadores del servidor viven en variables de módulo que cualquier callback (`join`, `move`, `restart`, `close`, el propio game loop) lee y muta sin control. No hay un punto único que garantice consistencia del registro de salas.

**Cómo se resuelve:** `RoomManager` (Singleton) encapsula el registro de salas detrás de una única instancia con una API explícita (`getOrCreateRoom`, `getRoom`, `removeRoomIfEmpty`). Ver [`singleton-roommanager.md`](patrones/singleton-roommanager.md).

## 2. Despachador de mensajes por cadena de `if/else`

**Dónde:** `snake-antes/server.js:39` (`if (msg.type === 'join')`), `:95` (`if (msg.type === 'start')`), `:117` (`if (msg.type === 'move')`), `:133` (`if (msg.type === 'restart')`), todos dentro del mismo `ws.on('message', ...)`.

Añadir un nuevo tipo de mensaje (por ejemplo, `start` para permitir arrancar la partida con un solo jugador) obliga a editar este mismo bloque cada vez, copiando y pegando el mismo `if` — viola el Principio Abierto/Cerrado (OCP). De hecho, el mensaje `start` añadido para el modo un jugador es la prueba en vivo del problema: es una tercera copia casi idéntica del bloque de cuenta regresiva (ver punto 3).

**Cómo se resuelve:** `snake-despues/src/ws/connectionHandler.js` reemplaza la cadena de `if` por una tabla de despacho (`HANDLERS = { join, move, start, restart }`); agregar el tipo `start` para el modo un jugador fue agregar una entrada a esa tabla y una función `handleStart`, no editar un condicional creciente.

## 3. Bloque de cuenta regresiva duplicado literalmente

**Dónde:** `snake-antes/server.js:77-91` (dentro de `join`), `:99-113` (dentro de `start`, el mensaje agregado para permitir jugar de a una persona) y `:153-167` (dentro de `restart`) — el mismo `setInterval` de cuenta regresiva, copiado y pegado carácter por carácter tres veces.

**Cómo se resuelve:** `CountdownState` (State) centraliza esa lógica en un único lugar; `WaitingState.onPlayerJoined()`, `WaitingState.onStartRequested()` (modo un jugador) y `GameOverState.onRestartRequested()` simplemente transicionan a `new CountdownState(room)` sin repetir el `setInterval`. Ver [`state-roomstate.md`](patrones/state-roomstate.md).

## 4. Números mágicos repetidos sin una constante nombrada

**Dónde:** el tamaño de tablero `30` aparece suelto en `server.js:207` (dos veces), `:247`, `:248`; el máximo de jugadores `4` en `:52`; el intervalo del loop `150` en `:279`.

Si se quisiera cambiar el tamaño del tablero habría que tocar varios sitios distintos y confiar en no olvidar ninguno.

**Cómo se resuelve:** `snake-despues/src/config.js` centraliza `BOARD_SIZE`, `MAX_PLAYERS`, `TICK_MS`, `MIN_PLAYERS_TO_START` y `COUNTDOWN_SECONDS` como única fuente de verdad, importada donde se necesita.

## 5. El game loop mezcla física, colisiones, spawn de comida y transporte WebSocket

**Dónde:** `snake-antes/server.js:189-280` (función `startGameLoop`) — una sola función pasada a `setInterval` mueve las serpientes, calcula las tres colisiones (borde, cuerpo propio, otras serpientes), genera comida, evalúa el fin de partida **y** llama `ws.send` a cada jugador, todo en el mismo bloque. Viola el Principio de Responsabilidad Única (SRP).

**Cómo se resuelve:** en `snake-despues/src/core/GameRoom.js`, `runRound()` solo calcula el nuevo estado del juego y termina con `this.notify('state', ...)`; el envío por WebSocket vive exclusivamente en `BroadcastObserver` (Observer), que ni siquiera es conocido por `GameRoom` más allá de la interfaz `update(event, payload)`. Ver [`observer-broadcast.md`](patrones/observer-broadcast.md).

Además, la regla de "qué pasa al tocar el borde del tablero" (`server.js:207`) está mezclada en línea con el resto del loop; en `snake-despues` se encapsula en `CollisionStrategy` (Strategy) para poder ofrecer un modo alternativo sin tocar el resto de `runRound()`. Ver [`strategy-collision.md`](patrones/strategy-collision.md).

Y la creación de la comida (`server.js:242-253`, con su propio bucle de "buscar posición libre") se delega en `FoodFactory` (Factory Method) en vez de construir el objeto literal a mano. Ver [`factory-method-entityfactory.md`](patrones/factory-method-entityfactory.md).
