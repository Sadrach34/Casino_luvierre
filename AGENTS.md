# AGENTS.md — Luvierre (blackjack-rogue)

Blackjack roguelite web (tienda, jokers, tarot, runas) inspirado en Balatro. Nombre interno: `blackjack-rogue`; nombre del juego: **Luvierre**. Tarea escolar, sin fines de lucro, licencia MIT.

## Fuente de verdad
- **Diseño base de la interfaz (canvas de Claude, 17 pantallas):** https://claude.ai/artifact/CmEtSPCzCRZLYRLTWvVAB8#page-dcb81aee8d83 — la web debe verse igual (copia local de las fuentes en `docs/design/`). Sus textos, nombres y efectos son solo ejemplos.
`README.md` es el GDD (reglas, tablas de tarot/runas/jefes, balance, licencias de assets). Toda decisión de diseño nueva se escribe ahí. Lo marcado _Pendiente_ aún no está definido: no inventar, preguntar.

## Stack y comandos
- JavaScript ESM (`"type": "module"`), Node 22. UI: **Vite + JS puro (DOM/CSS)**, sin framework ni Phaser; pantallas portadas de `docs/design/*.dc.html`.
- `npm test` — `node --test` (tests en `test/`).
- `npm run dev` / `npm run build` — servidor y build (copian assets con `scripts/prepare-assets.mjs`). `dev` pasa por `scripts/dev.mjs`: si el puerto 5173 está ocupado por otro proceso Vite/Node lo cierra y arranca el nuevo en el mismo puerto (si lo usa otro programa, no lo toca; `npm run dev -- --port N` para otro puerto).
- `npm run sim`, `sim:dealers`, `sim:engine` — simuladores de balance (`sim:engine` usa el motor real).
- `npm run playtest` (bot por la UI con Playwright) y `npm run shots` (capturas en `shots/`); ambos necesitan `npm run dev` corriendo.

## Debug en dev (log para agentes)
- Al correr `npm run dev`, Vite activa un endpoint `POST /__devlog` (plugin en `vite.config.js`) que escribe en **`dev-debug.log`** (raíz del repo, en `.gitignore`). El archivo se **reinicia** en cada arranque del servidor de dev.
- Cliente: `src/ui/devlog.js` exporta `devlog(level, msg, data?)`, `dlog/dwarn/derror`. En dev envía al servidor y también imprime en consola; en build/producción es no-op. Captura `error` y `unhandledrejection` globales. Disponible como `window.__log` y `window.__luvierre.log`.
- Para depurar, pide al usuario que reproduzca el caso con `npm run dev` corriendo y luego lee `dev-debug.log`. También puedes agregar `devlog(...)` en el código de la UI mientras investigas.

## Guardado de partidas
`src/core/save.js` (serializa run + estado de los RNG; `cfg` no se guarda), `src/ui/savegame.js` (localStorage `luvierre.save.auto|manual`), `src/ui/resume.js`. Autoguardado vía `onScreen` en `main.js` y tras cada mano en `table.js`. En dev, recargar retoma la partida (`?fresh` = menú). **Si agregas campos al estado de `run`, deben ser JSON puro (sin funciones/clases)** y, si cambia el formato, sube `SAVE_VERSION`.

## Estructura
- `src/core/` — lógica pura (config, deck, rng con semilla, scoring, combos, goals, round, run, shop). Sin dependencias de UI; debe correr en Node.
- `src/ui/` — router, componentes, store (localStorage), animaciones y `screens/` (menu, seed, dealers, table, result, shop, over, modals). `src/style/` — `design.css` (portado del diseño), `game.css`, `base.css`.
- `src/i18n/` — `es.json` y `en.json` con TODOS los textos visibles (claves planas); `t(clave, {param})` y `tl(clave)` en `index.js`. **Nunca escribir texto visible en el código**: agregar la clave en ambos JSON (hay pruebas que lo exigen). El core devuelve claves/ids, no texto.
- `docs/design/` — fuentes HTML del diseño base (referencia visual; los textos/efectos del diseño son ejemplos, el README manda).
- `src/data/` — datos del juego (combos de mano, jokers, tarots, runas, jefes).
- `sim/` — simulación de balance.
- `test/` — pruebas.
- `docs/previews/` — imágenes de referencia versionables.
- `assets-raw/` — assets de terceros, **en .gitignore, nunca commitear**.

## Reglas de juego clave (no romper)
- Acciones: Pedir, Plantarse y Doblar (duplica apuesta, recibes 1 carta más y te plantas; solo con 2 cartas). Sin split ni seguro. Dealer planta en 16 (jefe El Muro en 18). Blackjack paga 3:2.
- Valores nunca .5: siempre redondeo hacia abajo (totales y pagos).
- Multi solo aplica si `T×M ≤ 21`; victoria solo por multi paga 50 %.
- Combos de mano (`src/core/combos.js`, `src/data/combos.js`): par, color, escalera… dan F y M base; se aplican primero, un combo por mano.
- Descartes: 3 por dealer (se reinician en cada dealer). Puedes usar los 3 en la misma mano si quieres (mientras queden); reemplazas una carta por otra, no cuenta como mano. No se puede descartar después de doblar.
- Reordenar: la mano (solo en tu turno) y los jokers (mesa y tienda) se arrastran con `src/ui/sortable.js` (eventos de puntero, no HTML5 drag&drop); `moveCard` en `round.js`, `moveJoker` en `shop.js`. `scripts/reorder-check.mjs` lo verifica.
- Orden importa: jokers izquierda→derecha, luego cartas en orden de mano.
- Efectos de tarot permanentes; tarot/runas se usan al abrir el paquete.
- Inicio: 150 fichas, 7 manos por dealer, sin jokers. Metas: base 170 ×[1, 1.5, 2] por mesa, base ×2.6 por mesa (`src/core/goals.js`). Vences al dealer con meta + 2 manos ganadas.
- RNG con semilla y flujos separados (mazo / tienda / jefes).

## Regla de UI: jokers que crecen muestran su valor actual
Todo joker cuyo efecto **crece o cambia durante la partida** (Discípulo del Tarot, y cualquier otro similar: acumulativos, por contador, por racha…) **debe mostrar su valor actual** en su descripción, **en rojo** (clase `.jcur`) para distinguirlo del texto base. Cómo: darle a su definición en `src/data/jokers.js` una función `current(run)` (devuelve el valor ×multi / fichas que da AHORA, calculado con la **misma fórmula** que `apply`) y usar `jokerDescHTML(id, run)` (HTML) o `jokerDesc(id, run)` (texto plano para `title`) de `src/ui/dom.js` en toda ventana/tooltip de un joker **que ya posee el jugador** (mesa, tienda, paquetes). Las ofertas que aún no tiene no muestran valor. El texto "Actual: …" va en `joker.current` de ambos JSON; si el valor no es un ×multi, agrega otra clave i18n. Cubierto por prueba en `test/run.test.js`.

## Convenciones
- Lógica separada de UI; todo lo de `src/core` con tests.
- Cambios de balance: correr `npm run sim` y actualizar la tabla en README.
- Idioma: README y comunicación en español (el juego es bilingüe es/en); código en inglés o español consistente con lo existente.
- No usar imágenes de los packs de assets como entrada a ninguna IA (licencia del tarot starsinabox).
- No commitear sin que el usuario lo pida.

## Runas: nombre, símbolo y sprite (referencia)
Sprites: `assets-raw/Idylwild's Runic Codex/runes/rune<n>.png` (16×16, negros; copiados a `public/assets/rune<n>.png`). **El orden de los sprites NO es el Futhark estándar** (el pack incluye variantes: Ós, Kaun, Hægl, "long-branch/short-twig"…), así que `n` no es la posición de la runa. Se pintan en dorado con la clase `.rn` (filtro del diseño) y en los paquetes dentro de la baldosa `.rtw/.rt` a 96 px (`runeSprite` / `runeTile` en `src/ui/dom.js`). Datos en `src/data/runes.js`.

| Runa | Símbolo | Sprite `n` | Rareza |
|---|---|---|---|
| Fehu | ᚠ | 1 | común |
| Uruz | ᚢ | 2 | común |
| Thurisaz | ᚦ | 3 | común |
| Ansuz | ᚨ | 4 | común |
| Kenaz | ᚲ | 9 (Kaunan) | rara |
| Gebo | ᚷ | 12 | común |
| Wunjo | ᚹ | 13 | rara |
| Hagalaz | ᚺ | 14 | rara |
| Nauthiz | ᚾ | 18 (Naudiz) | común |
| Jera | ᛃ | 21 (Jēra) | rara |
| Eihwaz | ᛇ | 25 (Iwaz) | rara |
| Algiz | ᛉ | 27 | rara |
| Sowilo | ᛊ | 28 | común |
| Ehwaz | ᛖ | 35 (Eh) | común |
| Ingwaz | ᛜ | 41 | rara (activa) |
| Dagaz | ᛞ | 43 | legendaria |
| Othala | ᛟ | 44 (Othalan) | legendaria |

Antes de cambiar un `n`, compruébalo mirando el sprite (hoja de contacto de `rune1..50`); el README lista los efectos.

## Trampas conocidas (no repetir)
- **IDs de carta: `string` vs `number`.** `card.id` es numérico; `element.dataset.id` llega como string. Si guardas/filtras con `===`/`includes`/`indexOf` sin normalizar, la UI puede no aplicar el estado visual (p. ej. selección en paquete tarot/runa: la clase `mk` nunca se asigna al renderizar) y el core puede rechazar cartas válidas (“carta inválida”). **Solución:** normalizar ids al leer (`Number` si aplica) y comparar con `==`/`findIndex(x => x == id)` (o normalizar siempre a un tipo canónico) en UI y en validación/aplicación (`src/ui/screens/pack.js`, `src/core/packs.js`). Revisar `dev-debug.log` (`badcard` / `pack mark`) si reaparece.
