# Tab Hero

*[Read in English](README.md)*

Un juego de ritmo para la música que ya suena en tu navegador. Comparte una pestaña (YouTube, Spotify Web…) y su música cae por tres trastes como notas, sincronizada con lo que escuchas y ves.

JavaScript de navegador, Canvas 2D y Web Audio. Sin dependencias externas. El juego está en inglés, con español a un clic (arriba a la derecha).

**[Juega en línea](https://cangrejometralleta.github.io/tab-hero/)** — Chrome o Edge para compartir una pestaña.

## Ejecutar

```sh
./start.sh        # recarga automática, abre el navegador
npm run dev       # el mismo servidor, sin abrir el navegador
npm start         # servidor estático simple (Python)
npm test          # pruebas unitarias
```

El juego se sirve en http://localhost:5173 (`PORT` lo cambia). La recarga automática necesita Node 20.11 o superior.

## Jugar con una pestaña

1. Abre la música en otra pestaña de Chrome o Edge y dale play.
2. En Tab Hero, pulsa **⧉ Pestaña**, elige esa pestaña como **Pestaña de Chrome** (no ventana ni pantalla) y activa **Compartir audio de la pestaña**.
3. Quédate en Tab Hero. La pestaña compartida se silencia; su música suena aquí 2,2 s después, con su video detrás del mástil con el mismo retraso.

Firefox y Safari no comparten audio de pestañas. Dejar de compartir, o pulsar **Terminar**, cierra la sesión.

**Plan B: un archivo.** Si no puedes compartir pestañas, pulsa **♪ Archivo** y carga un mp3, wav u ogg. Funciona igual: se analiza ahora y se escucha 2,2 s después. La sesión termina con el tema.

**Demo** muestra el juego a 120 BPM sin audio.

## Conceptos base

**Escuchar antes, tocar después.** Una nota necesita tiempo para caer, así que no puede llegar justo cuando su sonido empieza. Tab Hero escucha la música 2,2 s antes que tú y retrasa lo que oyes (y ves) lo mismo. Cada nota llega a la línea justo cuando suena.

**El sonido se vuelve notas.** Cada ataque (un golpe, una cuerda, una sílaba) y cada cambio de tono genera una nota. El bajo y la melodía se escuchan como voces separadas.

**Tres trastes.** Las notas caen en tres trastes: `A (W/S) D` o `← (↑/↓) →`, o toca los círculos. Los ataques del bajo (35–220 Hz) caen en el traste izquierdo. La melodía, escuchada con un filtro paso alto sobre 220 Hz, cae al centro cuando baja y a la derecha cuando sube; una nota repetida se queda en su traste.

**La línea es el momento.** Pulsa cuando el botón de la nota encaja en el círculo del traste. STRIKE: ±180 ms; BIEN: ±350 ms. Una nota con cola (un tono sostenido, hasta 1,5 s) se mantiene hasta el final; puedes soltar hasta 200 ms antes.

**Rachas y dificultad.**
- Cada acierto suma a la racha; 10, 20 y 30 suben el multiplicador a ×2, ×3 y ×4. Con cada paso los trastes brillan más y las notas sueltan más chispas.
- Los STRIKE seguidos suben una escalera de mensajes (STRIKE DOBLE … MODO DIOS). La racha celebra 10, 25, 50, 100 y cada múltiplo de 100.
- Cada 5 STRIKE seguidos sube el nivel (hasta 4): las notas caen más rápido y pueden llegar algo más juntas; cada nivel suma un 10% de puntos. Un BIEN, un fallo o una pulsación fuera de tiempo reinician el nivel. La ventana de acierto nunca se achica.
- Fallar con una racha de más de 10 hace saltar el mástil (no con movimiento reducido).

**Respuesta.** Un acierto muestra su tono en la chispa (Do, Re♯…). El panel muestra el BPM, tu mejor cadena de STRIKE y el nivel de entrada. Sensibilidad ajusta el umbral de entrada (deslizador o − / +).

**Privacidad.** El audio y el video se analizan en tu dispositivo. No se graba ni se envía nada.

## Límites

La detección de tono usa autocorrelación y funciona mejor con una voz o un instrumento claro (200–1000 Hz para la melodía); las mezclas densas dan menos notas con tono. El bajo y la melodía se separan con filtros, no con separación real de instrumentos: un bombo cuenta como bajo, y los golpes sin tono por encima del bajo no generan notas. El BPM necesita al menos cinco ataques regulares. El retraso de 2,2 s es fijo; se compensa la latencia de salida que informa el navegador, pero quizá no la de auriculares Bluetooth.

## Archivos

| Archivo | Contiene |
| --- | --- |
| `game.js` | Bucle del juego, entrada, dibujo, sesiones de pestaña y archivo, video retrasado |
| `audio.js` | Tono, pulso, registros, seguimiento de notas |
| `sustain.js` | Reglas de notas sostenidas |
| `hype.js` | Mensajes de strike y racha |
| `i18n.js` | Textos en inglés y español |
| `dev.js`, `start.sh` | Servidor con recarga automática |
