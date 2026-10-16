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

**El sonido se vuelve notas.** Cada ataque (un golpe, una cuerda, una sílaba) y cada cambio de tono genera una nota. Solo suena la melodía; el bajo se filtra.

**Tres trastes.** Las notas caen en tres trastes: `A (W/S) D` o `← (↑/↓) →`, o toca los círculos. La melodía, escuchada con un filtro paso alto sobre 220 Hz, recorre los trastes: un paso hacia abajo mueve un traste a la izquierda, uno hacia arriba un traste a la derecha, un salto de una cuarta o más mueve dos, y una nota repetida se queda.

**La línea es el momento.** Pulsa cuando el botón de la nota encaja en el círculo del traste. STRIKE: ±180 ms; BIEN: ±350 ms. Una nota con cola (un tono sostenido, hasta 1,5 s) se mantiene hasta el final; puedes soltar hasta 200 ms antes.

**Rachas y dificultad.**
- Cada acierto suma a la racha; 10, 20 y 30 suben el multiplicador a ×2, ×3 y ×4. Con cada paso los trastes brillan más y las notas sueltan más chispas.
- Los STRIKE seguidos suben una escalera de mensajes (STRIKE DOBLE … MODO DIOS). La racha celebra 10, 25, 50, 100 y cada múltiplo de 100.
- Cada 5 STRIKE seguidos sube el nivel (hasta 4): las notas caen más rápido y pueden llegar algo más juntas; cada nivel suma un 10% de puntos. Un BIEN, un fallo o una pulsación fuera de tiempo reinician el nivel. La ventana de acierto nunca se achica.
- Fallar con una racha de más de 10 hace saltar el mástil (no con movimiento reducido).

**Respuesta.** Un acierto muestra su tono en la chispa (Do, Re♯…). El panel muestra el BPM, tu mejor cadena de STRIKE y el nivel de entrada. Sensibilidad ajusta el umbral de entrada (deslizador o − / +).

**Privacidad.** El audio y el video se analizan en tu dispositivo. No se graba ni se envía nada.

## Duelo

**[⚔ Duelo](https://cangrejometralleta.github.io/tab-hero/duel.html)** es un segundo juego con las mismas teclas: dos samuráis, combate tras combate, sobre un compás propio o sobre la música de una pestaña. **Terminar** cierra la sesión; arriba se cuentan tus victorias y derrotas, guardadas en este navegador, y la barra de abajo muestra el tiempo de sesión.

- `A` / `D` caminan libremente; `W` salta un corte bajo; `S` se agacha ante uno alto.
- `ESPACIO` corta al compás. STRIKE: ±90 ms; BIEN: ±180 ms. Fuera de tiempo, falla y corta el combo.
- Fuera de alcance, un corte al compás lanza una **onda ki**: 40% del daño de la espada, y mantiene el combo sin hacerlo crecer. El rival lanza las suyas cuando está lejos (altas o bajas, se esquivan como sus cortes); `W` o `S` al compás la devuelve. Solo la espada sube el multiplicador, así que acércate.
- **Intercambio de golpes.** El rival nunca corta en dos pulsos seguidos, así que el pulso tras su corte es tuyo para responder. Tras cada intercambio de espadas responde en el pulso siguiente al próximo.
- El rival también para: 20% de tus STRIKE y 35% de tus cortes BIEN en ×1, +10% por paso del multiplicador, hasta 70%. Un corte parado te empuja hacia atrás; un BIEN parado además corta el combo.
- El rival lee el combate: con ventaja de vida se acerca a usar la espada; en desventaja, se aleja y confía en el ki.
- Un golpe que acierta hace retroceder al golpeado: un STRIKE empuja más lejos al rival, una onda ki apenas; los cortes del rival también te empujan.
- **Una acción por pulso.** Un corte o una parada gastan el pulso; una segunda en el mismo pulso falla (PULSO USADO), y un segundo corte además corta el combo. Caminar con `A` / `D`, saltar y agacharse son libres.
- Entre ataques ambos samuráis bailan al compás: se hunden en cada pulso, se mecen de lado a lado, la espada oscila y dan pasos al caminar. Ataques, paradas y ki mantienen sus propias poses.
- El daño se ve: al bajar la vida se abren cortes y rasgaduras en el gi, el hakama se deshilacha y la cara se llena de rasguños y moretones. Pasado el 40% de daño el samurái se cansa: en reposo jadea, se encorva, entrecierra el ojo, baja la espada y suda.
- Los golpes de espada y las paradas destellan la pantalla, congelan el cuadro un instante y la sacuden.
- La pista de ritmo de arriba lleva cada pulso a la zona de golpe (su marco es la ventana BIEN, su centro la de STRIKE). Una espada rosa es tu pulso para cortar con `ESPACIO`; un escudo dorado sobre rojo es el corte del rival. Un aviso a su izquierda dice qué pide el próximo pulso, y un "!" dorado sobre el rival más "W / S" sobre ti anuncian su corte. Los pulsos usados se vuelven blancos, y una cruz roja marca un fallo o un golpe recibido. Cada pulso acertado lanza chispas desde la zona; el multiplicador agranda la explosión, hace brillar la zona en su color, muestra una insignia ×N que se hincha al subir y desde ×3 hace subir brasas desde la zona. `W` o `S` sobre él lo para, alto o bajo; en otro momento solo saltan o agachan.
- Cada STRIKE seguido suma al combo; cada 4 sube el multiplicador, hasta ×4, en daño y puntos. Desde ×2 tu samurái brilla azul, luego dorado, luego rosa. El combo sigue de un combate al siguiente.
- Cada paso del multiplicador endurece al rival: +10 BPM en el compás propio (de 100 a 130), más cortes y +4 de daño por corte (de 16 a 28).
- **⧉ Pestaña** funciona como en el juego de ritmo: la pestaña se escucha 2,2 s después, con su video pixelado en el horizonte. Cada ataque de su música se vuelve un pulso en la pista, así que cortas, paras y esquivas sobre la música misma. **Sensibilidad** (80% por defecto) fija qué tan suave puede ser un ataque para contar; súbela si aparecen pocos pulsos. Con pestaña el tempo es el de la música; el rival igual se vuelve más agresivo y pega más fuerte. Si se deja de compartir, sigue el metrónomo.
- Cada samurái tiene 250 de vida, así que un combate dura unos 30 s. No tiene límite de tiempo: termina solo cuando alguien cae, con un destello de K.O. y una pausa mientras el perdedor se tambalea, se arrodilla y cae y el ganador alza la espada; si ambos caen a la vez no cuenta para nadie.

## Mezcla

**[♫ Mezcla](https://cangrejometralleta.github.io/tab-hero/mix.html)** toma el audio de dos pestañas compartidas. Conecta cada pestaña por separado, activa **Compartir audio de la pestaña** en ambos selectores y empieza la mezcla. El botón redondo central cambia qué pista aporta el bajo y cuál las frecuencias agudas; activa **Alternar roles cada** y define el intervalo en pulsos para automatizar el relevo. Este corte de frecuencias no separa la voz de una canción completa; para eso hacen falta pistas aisladas o un modelo específico de separación.

La mezcla tiene unos 1,4 segundos de retraso para permitir la alineación. Ajusta la fase con fundidos cortos entre retrasos fijos, sin ralentizar los temas ni cambiar su tono. Si los BPM son distintos, puede haber desfase entre ajustes. Un ajuste lento del RMS empareja el volumen de ambas pestañas, con hasta 6 dB de ganancia por pista. El corte de frecuencias es aproximado, no separa instrumentos. Al terminar la mezcla se cierran ambas capturas y las pestañas recuperan su audio.

## Límites

La detección de tono usa autocorrelación y funciona mejor con una voz o un instrumento claro (200–1000 Hz para la melodía); las mezclas densas dan menos notas con tono. El bajo se quita con un filtro, no con separación real de instrumentos; la batería y otros golpes sin tono no generan notas. El BPM necesita al menos cinco ataques regulares. El retraso de 2,2 s es fijo; se compensa la latencia de salida que informa el navegador, pero quizá no la de auriculares Bluetooth.

## Archivos

| Archivo | Contiene |
| --- | --- |
| `game.js` | Bucle del juego, entrada, dibujo, sesiones de pestaña y archivo, video retrasado |
| `duel.html`, `duel.js` | Duelo samurái: combates sin fin sobre un compás propio o una pestaña |
| `duel-rules.js` | Reglas de tiempo, combo, dificultad y combates del duelo |
| `duel-sound.js` | Sonidos de espada del duelo: tonos, silbidos y resonancias |
| `mix.html`, `mix.js` | Mezclador de dos pestañas: alineación de pulsos y alternancia de bajos / melodías |
| `audio.js` | Tono, pulso, registros, seguimiento de notas |
| `sustain.js` | Reglas de notas sostenidas |
| `hype.js` | Mensajes de strike y racha |
| `i18n.js` | Textos en inglés y español |
| `dev.js`, `start.sh` | Servidor con recarga automática |
