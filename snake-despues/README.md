# snake-despues — arquitectura en capas + 5 patrones GoF

Mismo juego que [`../snake-antes`](../snake-antes) (Snake multijugador en tiempo real, Node.js + WebSocket nativo, mismo protocolo de mensajes), refactorizado en `src/` para resolver, uno a uno, los problemas de diseño diagnosticados en la versión "antes" ([`docs/diagnostico.md`](docs/diagnostico.md)).

## Cómo ejecutarlo

```bash
npm install
npm start          # sirve en http://localhost:3002 (o PORT=xxxx npm start)
npm test           # node:test — un caso por patrón, aislado y sin WebSocket real
```

Cómo jugar: abre `http://localhost:3002`, escribe un nombre y un código de sala y pulsa "Unirse". Con 2+ jugadores en la sala arranca la cuenta regresiva automáticamente; con 1 solo jugador puedes pulsar "Empezar". El tablero tiene obstáculos fijos además de comida y power-ups. Controles: flechas, WASD, botones táctiles o swipe.

## Arquitectura

```
src/
├── server.js               # HTTP estático + WebSocket server (composition root)
├── config.js                # única fuente de verdad: BOARD_SIZE, TICK_MS, MAX_PLAYERS...
├── ws/connectionHandler.js  # tabla de despacho de mensajes (join/move/start/restart)
├── core/
│   ├── RoomManager.js        # Singleton — registro único de salas
│   ├── GameRoom.js            # entidad principal: reglas del juego, subject de Observer
│   ├── Player.js               # jugador (id, nombre, snake, socket)
│   ├── Snake.js                 # cuerpo, dirección, colisión consigo misma
│   └── entities/Food.js
├── factories/                # Factory Method
│   ├── EntityFactory.js
│   └── FoodFactory.js
├── strategies/                # Strategy
│   ├── CollisionStrategy.js
│   ├── ClassicCollisionStrategy.js
│   └── WrapAroundCollisionStrategy.js
├── states/                     # State
│   ├── RoomState.js
│   ├── WaitingState.js
│   ├── CountdownState.js
│   ├── PlayingState.js
│   └── GameOverState.js
└── observers/                  # Observer
    └── BroadcastObserver.js
```

`connectionHandler.js` recibe cada mensaje WebSocket y lo despacha por tabla (`HANDLERS = { join, move, start, restart }`) hacia `RoomManager` y `GameRoom`. `GameRoom` es el corazón del dominio: no conoce WebSocket, no conoce el string de la fase actual, y no construye entidades a mano — delega esas tres responsabilidades en Observer, State y Factory Method respectivamente, y recibe la regla de colisión de borde por Strategy.

## Los 5 patrones aplicados

| Patrón | Clase(s) | Qué resuelve |
|---|---|---|
| **Singleton** | `RoomManager` | Reemplaza la variable global `rooms` por un único registro de salas con API explícita. |
| **Factory Method** | `EntityFactory` → `FoodFactory` | Crea entidades del tablero (comida) sin que `GameRoom` construya el objeto a mano ni conozca sus campos internos. |
| **Strategy** | `CollisionStrategy` → `ClassicCollisionStrategy`, `WrapAroundCollisionStrategy` | Aísla la regla de colisión con el borde del tablero para poder añadir modos de juego sin tocar `GameRoom`. |
| **State** | `RoomState` → `WaitingState`, `CountdownState`, `PlayingState`, `GameOverState` | Reemplaza el campo `state: string` y la cuenta regresiva duplicada por transiciones explícitas por fase. |
| **Observer** | `GameRoom` (subject) + `BroadcastObserver` | Desacopla la lógica del juego del envío de mensajes WebSocket. |

Cada fila del diagnóstico de `snake-antes` tiene una línea exacta de código y su contraparte en `snake-despues` — ver [`docs/diagnostico.md`](docs/diagnostico.md).

### Singleton — `RoomManager`

`src/core/RoomManager.js` guarda la instancia en una variable de módulo; el constructor la devuelve si ya existe, y `RoomManager.getInstance()` es el único punto de acceso. `connectionHandler.js` siempre llama `getInstance()` en vez de crear el registro de salas a mano — nunca hace `new RoomManager()` para operar sobre salas.

- **Por qué Singleton y no una variable global o un parámetro inyectado en cada handler:** el dominio necesita **un único** registro de salas por proceso; `getInstance()` deja explícita esa intención y permite sustituir la instancia por un doble de prueba si hiciera falta (ver `RoomManager.getInstance() siempre devuelve la misma instancia` en `tests/patterns.test.js`). Detalle completo en [`docs/patrones/singleton-roommanager.md`](docs/patrones/singleton-roommanager.md).

### Factory Method — `EntityFactory` / `FoodFactory`

`EntityFactory` (`src/factories/EntityFactory.js`) declara `createEntity(position)` como método abstracto; `FoodFactory` lo implementa devolviendo el producto concreto `Food`. `GameRoom` solo pide `this.foodFactory.createEntity(this.randomFreePosition())` (`src/core/GameRoom.js:13,70,122`) sin conocer los campos internos de `Food` ni repetir el bucle de "buscar posición libre".

- **Por qué Factory Method y no construir el objeto en línea:** delega "crear el producto correcto" a una subclase de `EntityFactory`, así que agregar un segundo tipo de entidad es una clase de producto y una factory nuevas, no un cambio en `GameRoom`. Detalle en [`docs/patrones/factory-method-entityfactory.md`](docs/patrones/factory-method-entityfactory.md).

### Strategy — `CollisionStrategy`

`GameRoom` recibe la estrategia por constructor (`new GameRoom(code, collisionStrategy)`) y la invoca en `runRound()` (`src/core/GameRoom.js:100`) sin saber cuál es. `ClassicCollisionStrategy.resolveWallCollision` devuelve `null` cuando la cabeza sale del tablero (la serpiente muere); `WrapAroundCollisionStrategy` calcula la posición al otro lado con módulo (`(head.x + boardSize) % boardSize`).

- **Por qué Strategy y no un flag `wrapMode` con un `if`:** la única parte que varía entre modos de juego es la regla de colisión con el borde; encapsularla permite agregar un tercer modo sin tocar `GameRoom` ni el resto de `runRound()`. Detalle en [`docs/patrones/strategy-collision.md`](docs/patrones/strategy-collision.md).

### State — `RoomState`

`GameRoom` delega `onPlayerJoined()`, `onStartRequested()`, `onRestartRequested()` y `tick()` en el objeto `state` actual (`src/core/GameRoom.js:41,59,63,74`) en vez de un `switch` sobre un string. Cada estado concreto decide la transición llamando `room.setState(new SiguienteState(room))`: `WaitingState` → `CountdownState` (por `onPlayerJoined()` con ≥2 jugadores, o por `onStartRequested()` con ≥1, el modo un jugador) → `PlayingState` → `GameOverState` → (`onRestartRequested()`) `WaitingState`.

- **Por qué State y no un string con `switch` o banderas booleanas:** el comportamiento de unirse, reiniciar y avanzar un tick cambia genuinamente según la fase, y la cuenta regresiva solo existe dentro de `CountdownState` — modelar cada fase como clase elimina la duplicación que tenía `snake-antes` entre `join`/`start`/`restart`. Detalle en [`docs/patrones/state-roomstate.md`](docs/patrones/state-roomstate.md).

### Observer — `GameRoom` (subject) + `BroadcastObserver`

`GameRoom` solo conoce la interfaz `update(event, payload)`; nunca importa `ws`. Al final de cada ronda llama `this.notify('state', this.getSnapshot())` (`src/core/GameRoom.js:111`), y `CountdownState` llama `room.notify('countdown', { value })`. `BroadcastObserver` (`src/observers/BroadcastObserver.js`) es el observer concreto que traduce esos eventos a JSON y los envía a cada `Player` de la sala.

- **Por qué Observer y no seguir llamando `ws.send` desde `GameRoom`:** el juego tiene un sujeto real (el estado de la sala cambia cada tick) y potencialmente varios interesados en enterarse; esto además permite testear `runRound()` sin abrir un socket real — ver el test `Observer: BroadcastObserver reenvia cada evento a todos los jugadores de la sala` en `tests/patterns.test.js`. Detalle en [`docs/patrones/observer-broadcast.md`](docs/patrones/observer-broadcast.md).

## Tests

`tests/patterns.test.js` (Node's `node:test`, sin dependencias) tiene un caso por patrón, cada uno usando dobles de prueba (`fakeRoom`) en vez de un servidor o socket real:

```bash
npm test
```

## Más detalle

Cada patrón tiene su propio documento con diagrama (Mermaid), justificación de por qué ese patrón y no una alternativa descartada, y la cita exacta del problema en `snake-antes`:

- [`docs/diagnostico.md`](docs/diagnostico.md) — los 5 problemas del código "antes", citados por línea.
- [`docs/patrones/singleton-roommanager.md`](docs/patrones/singleton-roommanager.md)
- [`docs/patrones/factory-method-entityfactory.md`](docs/patrones/factory-method-entityfactory.md)
- [`docs/patrones/strategy-collision.md`](docs/patrones/strategy-collision.md)
- [`docs/patrones/state-roomstate.md`](docs/patrones/state-roomstate.md)
- [`docs/patrones/observer-broadcast.md`](docs/patrones/observer-broadcast.md)
