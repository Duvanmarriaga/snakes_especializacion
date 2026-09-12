# snake-antes — versión "sin arquitectura"

Snake multijugador en tiempo real (Node.js + WebSocket nativo) implementado como un único archivo funcional: `server.js`. Es el punto de partida del proyecto integrador — sirve como línea base "antes" para contrastar con la refactorización en [`../snake-despues`](../snake-despues), que aplica 5 patrones GoF sobre este mismo juego.

No hay nada roto aquí: el juego funciona igual que la versión refactorizada. El objetivo de esta versión es mostrar, con código real y citable, los *smells* de diseño que la arquitectura de `snake-despues` resuelve.

## Cómo ejecutarlo

```bash
npm install
npm start          # sirve en http://localhost:3001 (o PORT=xxxx npm start)
```

Abre `http://localhost:3001` en una o más pestañas: escribe un nombre y un código de sala y pulsa "Unirse". Con 2+ jugadores en la sala arranca la cuenta regresiva automáticamente; con 1 solo jugador puedes pulsar "Empezar". Controles: flechas, WASD, botones táctiles o swipe sobre el tablero.

## Cómo funciona

Todo el backend vive en `server.js` (285 líneas):

- **Estado del servidor**: dos variables globales de módulo, `rooms` (registro de salas) y `nextPlayerId` (contador de ids), mutadas directamente por cualquier callback.
- **Protocolo WebSocket**: un único listener `wss.on('connection', ...)` que recibe mensajes JSON con un campo `type` (`join`, `start`, `move`, `restart`) y despacha con una cadena de `if (msg.type === ...)` dentro del mismo callback `ws.on('message', ...)`.
- **Ciclo de vida de una sala**: cada sala es un objeto plano `{ code, players, food, state, countdown, interval }`, donde `state` es un string (`'waiting' | 'countdown' | 'playing' | 'gameover'`) comparado con `===` en cada handler.
- **Game loop**: `startGameLoop(code)` registra un único `setInterval` de 150 ms que, en la misma función, mueve cada serpiente, resuelve las tres colisiones (borde del tablero, cuerpo propio, otras serpientes), genera comida nueva cuando corresponde, evalúa el fin de partida y llama `ws.send(...)` a cada jugador con el snapshot del estado.

## Por qué existe esta versión (diagnóstico citable)

El diagnóstico completo, con línea exacta de cada problema y cómo se resuelve del otro lado, está en [`../snake-despues/docs/diagnostico.md`](../snake-despues/docs/diagnostico.md). Resumen:

| # | Problema | Dónde (`server.js`) | Se resuelve en `snake-despues` con |
|---|---|---|---|
| 1 | Estado global mutable (`let rooms = {}`) | líneas 8-9 | **Singleton** — `RoomManager` |
| 2 | Despachador de mensajes por cadena de `if/else` | líneas 39, 95, 117, 133 | **Tabla de despacho** en `connectionHandler.js` |
| 3 | Bloque de cuenta regresiva duplicado literalmente 3 veces | líneas 77-91, 99-113, 153-167 | **State** — `CountdownState` |
| 4 | Números mágicos repetidos sin constante nombrada (`30`, `4`, `150`) | líneas 52, 207, 247-248, 279 | `src/config.js` como única fuente de verdad |
| 5 | El game loop mezcla física, colisiones, spawn de comida y transporte WebSocket | líneas 189-280 | **Observer** (difusión) + **Strategy** (colisión de borde) + **Factory Method** (comida) |

Estos mismos puntos son los que justifican, uno a uno, cada patrón aplicado en la versión refactorizada — ver [`../snake-despues/README.md`](../snake-despues/README.md).
