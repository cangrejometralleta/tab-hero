// English is the default; Spanish is one click away and remembered per browser.
export const messages={
  en:{
    tag:'Your tabs have rhythm.',noSource:'No audio source',controls:'Session controls',
    sensitivity:'Sensitivity',sensDown:'Lower sensitivity',sensUp:'Raise sensitivity',effects:'Effects',
    file:'♪ File',demo:'Demo',stop:'Stop',
    help:'The melody walks the frets: left when it falls, right when it rises. Bass is left out.',
    intro:'Press as a note reaches the line; hold the key if it has a tail. Audio is analyzed on your device.',
    arena:'Rhythm game with three frets: A(W/S)D or LEFT(UP/DOWN)RIGHT',score:'Score',time:'Time',streak:'Streak',multiplier:'Score multiplier',
    canvas:'Notes falling toward the AWD frets',ready:'READY TO LISTEN',
    lane0:'Left fret: A or left arrow',lane1:'Middle fret: W, S or up/down arrows',lane2:'Right fret: D or right arrow',
    waiting:'Waiting for a signal',pulse:'Pulse',listenAttacks:'Listening for attacks',bestStrike:'Best strike',inARow:'in a row',
    bestHelp:'Your longest STRIKE chain',inputLevel:'Input level',silence:'Silence is part of it too.',
    footer:'Listen. React. Repeat.',privacy:'Local audio · No recordings',lang:'Español',
    level:'Level {n}',session:'{hits} hits / {total} notes',sessionOver:'SESSION OVER',stopped:'Session over. You can start again.',
    demoSession:'Demo · 120 BPM',fileSession:'File',demoSource:'Synthetic demo',
    follow:'FOLLOW THE BEAT',
    fileDelay:'Plays 2.2 s late: each note reaches the line right as it sounds.',
    fileError:'Could not play that file. Try mp3, wav or ogg.',fileEnd:'End of track. Pick another file or start again.',
    demoOn:'Visual demo at 120 BPM. Press AWD or the arrows; hold the key on notes with a tail.',
    hidden:'Session stopped when you switched tabs. Start another when you are ready.',
    hold:'HOLD',sustained:'SUSTAINED!',good:'GOOD',miss:'MISS',early:'RELEASED EARLY',offBeat:'OFF BEAT',
    fileSync:'Synced with the playback',
    tab:'⧉ Tab',tabSession:'Tab audio',tabSource:'⧉ Sharing tab audio',pickTab:'Pick a tab and turn on “Share tab audio”.',
    tabDelay:'The tab is muted and plays here 2.2 s late: each note reaches the line as it sounds.',
    tabNoAudio:'That share has no audio. Pick a tab and turn on “Share tab audio”.',tabEnd:'Tab sharing stopped.',
    tabCancelled:'Sharing cancelled. Try again or load a file.',tabUnsupported:'This browser cannot share tab audio. Use Chrome or Edge, or load a file.',demoPulse:'Demo pulse',
    tooQuiet:'Turn the volume up or raise sensitivity.',attack:'Attack detected',listening:'Listening',
    noteNames:['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'],demoNotes:['C','E','G','A'],
    strikes:['STRIKE!','DOUBLE STRIKE!','TRIPLE STRIKE!!','UNSTOPPABLE!!','ON FIRE!!!','LEGEND!!!','GOD MODE!!!!'],
    milestones:{10:'10 IN A ROW!',25:'25! WHAT A STREAK!',50:'50! DON\'T STOP!',100:'100! INCREDIBLE!'},hundreds:'{n}! LEGENDARY!',
    duel:'⚔ Duel',duelTitle:'Tab Hero · Duel',duelTag:'Cut on the beat.',duelFight:'Fight',duelBack:'← Rhythm game',
    duelHelp:'A / D walk, W jumps a low cut, S ducks a high one; either parries when pressed on the rival’s beat. SPACE cuts on the beat.',
    duelIntro:'Bout after bout against the rival samurai. Consecutive STRIKEs raise the multiplier, and the rival gets tougher with it.',
    duelArena:'Samurai duel: A/D move, W jump or parry, S duck or parry, SPACE strike',duelYou:'YOU',duelRival:'RIVAL',duelBout:'BOUT {n}',duelTally:'WINS {wins} · LOSSES {losses}',duelHarder:'RIVAL TOUGHER!',duelWave:'KI WAVE',duelDeflect:'DEFLECT!',duelBlocked:'BLOCKED!',duelParryKey:'parry',duelSpent:'BEAT SPENT',duelPromptCut:'CUT · SPACE',duelPromptParry:'PARRY · W / S',duelCutKey:'cut',duelPadLeft:'Walk left: A',duelPadRight:'Walk right: D',duelPadJump:'Parry on the beat, or jump: W',duelPadParry:'Parry on the beat, or duck: S',duelPadCut:'Cut on the beat: SPACE',duelStopped:'Duel stopped. Your tally is kept.',duelTime:'Session',
    duelParry:'PARRY!',duelDodge:'DODGE!',duelHit:'HIT!',duelWon:'YOU WIN',duelLost:'YOU LOSE',duelDraw:'DRAW',
    duelFooter:'Listen. Cut. Repeat.',duelCombo:'Combo',duelScore:'Score',duelTab:'The tab plays here 2.2 s late, its video on the horizon: each of its beats reaches the ring as it sounds.',
    mixNav:'♫ Mix',mixTitle:'Tab Hero · Mix',mixTag:'Two tabs. One groove.',mixBack:'← Rhythm game',mixNoTabs:'Connect two tabs',mixDesk:'Two track mixer',mixHeading:'Trade the low end.',mixIntro:'Pair one track’s bass with the other’s higher band. The center button swaps sources; automatic swaps are optional.',mixNote:'Best with tracks at a similar tempo. The high band includes melody, voice and drums; it does not separate instruments. Audio stays local and has a short alignment delay.',mixTrackA:'Track A',mixTrackB:'Track B',mixUnconnected:'Waiting for a tab',mixConnected:'Tab audio connected',mixConnectA:'Connect first tab',mixConnectB:'Connect second tab',mixConnectedButton:'Connected',mixRoles:'bass / melody',mixBassBand:'Bass + kick',mixHighBand:'Melody · voice · drums',mixSwap:'Swap bass and upper-band sources',mixSwapLabel:'swap sources',mixNeedTracks:'Connect both tabs to begin.',mixBassBoost:'Bass boost from 0 to 12 dB',mixStop:'Stop',mixSensitivity:'Sensitivity',mixAlternate:'Auto rotate roles every',mixBeats:'beats',mixInterval:'Role rotation interval in beats, from 1 to 32',mixInstructions:'In the picker, choose a Chrome tab and turn on “Share tab audio” for each track.',mixNow:'Now playing',mixAwait:'Waiting for the mix',mixCycle:'Role changes',mixCycleHelp:'Uses the selected interval',mixFourBeats:'4 beats',mixSplit:'Frequency split',mixApprox:'Approx. 180 Hz',mixFooter:'Listen for the handoff.',mixSecondPrompt:'Now connect the second tab. Keep both tracks playing.',mixWaitingPulse:'Listening for both pulses…',mixTabsConnected:'Two tabs connected',mixCancelled:'Sharing was cancelled. Try connecting that tab again.',mixNoAudio:'No audio track was shared. Pick a tab and enable “Share tab audio”.',mixUnsupported:'This browser cannot capture tab audio. Use Chrome or Edge.',mixShareEnded:'A shared tab stopped. The mix has ended.',mixStopped:'Mix stopped. You can reconnect both tabs.',mixAligning:'Aligning the pulse. This can take a few seconds.',mixSynced:'Pulse aligned near {bpm} BPM. Similar tempos stay together longer.',mixTempoDiff:'Tempo mismatch: A {a} BPM, B {b} BPM. The phase is nudged every few beats, so slight drift can remain.',mixRoleAB:'Bass A · melody, voice and drums B',mixRoleBA:'Bass B · melody, voice and drums A'
  },
  es:{
    tag:'Tus pestañas tienen ritmo.',noSource:'Sin fuente de audio',controls:'Controles de la sesión',
    sensitivity:'Sensibilidad',sensDown:'Bajar sensibilidad',sensUp:'Subir sensibilidad',effects:'Efectos',
    file:'♪ Archivo',demo:'Demo',stop:'Terminar',
    help:'La melodía recorre los trastes: izquierda cuando baja, derecha cuando sube. El bajo queda fuera.',
    intro:'Pulsa al llegar a la línea; mantén la tecla si hay una cola. El audio se analiza en tu dispositivo.',
    arena:'Juego de ritmo con tres trastes: A(W/S)D o LEFT(UP/DOWN)RIGHT',score:'Puntuación',time:'Tiempo',streak:'Racha',multiplier:'Multiplicador de puntos',
    canvas:'Notas que descienden hacia las teclas AWD',ready:'LISTO PARA ESCUCHAR',
    lane0:'Traste izquierdo: A o flecha izquierda',lane1:'Traste central: W, S o flechas arriba o abajo',lane2:'Traste derecho: D o flecha derecha',
    waiting:'Esperando una señal',pulse:'Pulso',listenAttacks:'Escucha ataques',bestStrike:'Mayor strike',inARow:'seguidos',
    bestHelp:'Tu mejor cadena de STRIKE',inputLevel:'Nivel de entrada',silence:'El silencio también es parte.',
    footer:'Escucha. Reacciona. Repite.',privacy:'Audio local · Sin grabaciones',lang:'English',
    level:'Nivel {n}',session:'{hits} aciertos / {total} notas',sessionOver:'SESIÓN TERMINADA',stopped:'Sesión terminada. Puedes volver a empezar.',
    demoSession:'Demo · 120 BPM',fileSession:'Archivo',demoSource:'Demo sintética',
    follow:'SIGUE EL RITMO',
    fileDelay:'Sonará con 2,2 s de retraso: cada nota llega a la línea justo cuando suena.',
    fileError:'No se pudo reproducir ese archivo. Prueba con mp3, wav u ogg.',fileEnd:'Fin del tema. Elige otro archivo o vuelve a empezar.',
    demoOn:'Demo visual a 120 BPM. Pulsa AWD o las flechas; mantén la tecla en las notas con cola.',
    hidden:'Sesión detenida al cambiar de pestaña. Inicia otra cuando estés listo.',
    hold:'MANTÉN',sustained:'SOSTENIDA!',good:'BIEN',miss:'MISS',early:'SOLTASTE ANTES',offBeat:'FUERA DE TIEMPO',
    fileSync:'Sincronizado con la reproducción',
    tab:'⧉ Pestaña',tabSession:'Audio de pestaña',tabSource:'⧉ Compartiendo audio de pestaña',pickTab:'Elige una pestaña y activa “Compartir audio de la pestaña”.',
    tabDelay:'La pestaña se silencia y suena aquí con 2,2 s de retraso: cada nota llega a la línea cuando suena.',
    tabNoAudio:'Eso no comparte audio. Elige una pestaña y activa “Compartir audio de la pestaña”.',tabEnd:'Se dejó de compartir la pestaña.',
    tabCancelled:'Compartir cancelado. Vuelve a intentarlo o carga un archivo.',tabUnsupported:'Este navegador no puede compartir audio de pestañas. Usa Chrome o Edge, o carga un archivo.',demoPulse:'Pulso de demostración',
    tooQuiet:'Sube el volumen o la sensibilidad.',attack:'Ataque detectado',listening:'Escuchando',
    noteNames:['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'],demoNotes:['Do','Mi','Sol','La'],
    strikes:['STRIKE!','STRIKE DOBLE!','TRIPLE STRIKE!!','IMPARABLE!!','EN LLAMAS!!!','LEYENDA!!!','MODO DIOS!!!!'],
    milestones:{10:'¡10 SEGUIDAS!',25:'¡25! ¡QUÉ RACHA!',50:'¡50! ¡NO PARES!',100:'¡100! ¡INCREÍBLE!'},hundreds:'¡{n}! ¡HISTÓRICO!',
    duel:'⚔ Duelo',duelTitle:'Tab Hero · Duelo',duelTag:'Corta al compás.',duelFight:'Pelear',duelBack:'← Juego de ritmo',
    duelHelp:'A / D camina, W salta un corte bajo, S se agacha ante uno alto; cualquiera de las dos para si la pulsas en el pulso del rival. ESPACIO corta al compás.',
    duelIntro:'Combate tras combate contra el samurái rival. Los STRIKE seguidos suben el multiplicador, y con él el rival se vuelve más duro.',
    duelArena:'Duelo samurái: A/D moverse, W saltar o parar, S agacharse o parar, ESPACIO golpear',duelYou:'TÚ',duelRival:'RIVAL',duelBout:'COMBATE {n}',duelTally:'VICTORIAS {wins} · DERROTAS {losses}',duelHarder:'¡RIVAL MÁS DURO!',duelWave:'ONDA KI',duelDeflect:'¡DESVÍO!',duelBlocked:'¡BLOQUEADO!',duelParryKey:'parar',duelSpent:'PULSO USADO',duelPromptCut:'CORTA · ESPACIO',duelPromptParry:'PARA · W / S',duelCutKey:'cortar',duelPadLeft:'Caminar a la izquierda: A',duelPadRight:'Caminar a la derecha: D',duelPadJump:'Parar al compás, o saltar: W',duelPadParry:'Parar al compás, o agacharse: S',duelPadCut:'Cortar al compás: ESPACIO',duelStopped:'Duelo detenido. Tu marcador se conserva.',duelTime:'Sesión',
    duelParry:'¡PARADA!',duelDodge:'¡ESQUIVA!',duelHit:'¡GOLPE!',duelWon:'GANASTE',duelLost:'PERDISTE',duelDraw:'EMPATE',
    duelFooter:'Escucha. Corta. Repite.',duelCombo:'Combo',duelScore:'Puntos',duelTab:'La pestaña suena aquí 2,2 s después, con su video en el horizonte: cada pulso llega al círculo cuando suena.',
    mixNav:'♫ Mezcla',mixTitle:'Tab Hero · Mezcla',mixTag:'Dos pestañas. Un ritmo.',mixBack:'← Juego de ritmo',mixNoTabs:'Conecta dos pestañas',mixDesk:'Mezclador de dos pistas',mixHeading:'Pásense los bajos.',mixIntro:'Combina el bajo de una pista con la banda aguda de la otra. El botón central cambia las fuentes; la alternancia automática es opcional.',mixNote:'Funciona mejor con temas de tempo parecido. La banda aguda incluye melodía, voz y batería; no separa instrumentos. El audio permanece local y se retrasa un poco para alinearse.',mixTrackA:'Pista A',mixTrackB:'Pista B',mixUnconnected:'Esperando una pestaña',mixConnected:'Audio de pestaña conectado',mixConnectA:'Conectar primera pestaña',mixConnectB:'Conectar segunda pestaña',mixConnectedButton:'Conectada',mixRoles:'bajo / melodía',mixBassBand:'Bajo + bombo',mixHighBand:'Melodía · voz · batería',mixSwap:'Cambiar fuentes del bajo y la banda aguda',mixSwapLabel:'cambiar fuentes',mixNeedTracks:'Conecta ambas pestañas para comenzar.',mixBassBoost:'Refuerzo de bajo de 0 a 12 dB',mixStop:'Terminar',mixSensitivity:'Sensibilidad',mixAlternate:'Alternar roles cada',mixBeats:'pulsos',mixInterval:'Intervalo de alternancia en pulsos, de 1 a 32',mixInstructions:'En el selector, elige una pestaña de Chrome y activa «Compartir audio de la pestaña» en cada pista.',mixNow:'Ahora suena',mixAwait:'Esperando la mezcla',mixCycle:'Cambio de roles',mixCycleHelp:'Usa el intervalo elegido',mixFourBeats:'4 pulsos',mixSplit:'Corte de frecuencia',mixApprox:'Aprox. 180 Hz',mixFooter:'Escucha el relevo.',mixSecondPrompt:'Ahora conecta la segunda pestaña. Deja ambos temas sonando.',mixWaitingPulse:'Escuchando los dos pulsos…',mixTabsConnected:'Dos pestañas conectadas',mixCancelled:'Se canceló el permiso. Intenta conectar esa pestaña otra vez.',mixNoAudio:'No se compartió audio. Elige una pestaña y activa «Compartir audio de la pestaña».',mixUnsupported:'Este navegador no captura audio de pestañas. Usa Chrome o Edge.',mixShareEnded:'Se detuvo una pestaña compartida. Terminó la mezcla.',mixStopped:'Mezcla terminada. Puedes volver a conectar las pestañas.',mixAligning:'Alineando el pulso. Puede tardar unos segundos.',mixSynced:'Pulso alineado cerca de {bpm} BPM. Tempos parecidos se mantienen juntos más tiempo.',mixTempoDiff:'Tempos distintos: A {a} BPM y B {b} BPM. Se reajusta la fase cada varios pulsos; puede quedar algo de desfase.',mixRoleAB:'Bajo A · melodía, voz y batería B',mixRoleBA:'Bajo B · melodía, voz y batería A'
  }
};
let current='en';
try{if(localStorage.getItem('lang')==='es')current='es';}catch{}
export const lang=()=>current;
export function t(key,vars={}){
  const value=messages[current][key];
  return typeof value==='string'?value.replace(/\{(\w+)\}/g,(_,k)=>vars[k]):value;
}
// Static text lives in data-i18n (textContent) and data-i18n-aria (aria-label).
export function setLang(next){
  current=next;try{localStorage.setItem('lang',next);}catch{}
  if(typeof document==='undefined')return;
  document.documentElement.lang=next;
  for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t(el.dataset.i18n);
  for(const el of document.querySelectorAll('[data-i18n-aria]'))el.setAttribute('aria-label',t(el.dataset.i18nAria));
}
