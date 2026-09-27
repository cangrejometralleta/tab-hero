import {grade,nearestBeat,strikeOutcome,boutWinner,difficulty,waveOutcome,waveShare,rivalIntent,rivalParry,multiplier,goodWindow,reach,maxHp,tabDelay} from './duel-rules.js';
import {strikeText} from './hype.js';
import {t,lang,setLang} from './i18n.js';
import {PulseTracker,bandEnergy,listening} from './audio.js';
const $=id=>document.getElementById(id),canvas=$('duel'),ctx=canvas.getContext('2d');
// The stage is drawn in a fixed 900×500 world and scaled to fit the arena.
const W=900,H=500,ground=410,ringX=300,trackSpeed=220,pixel=3,horizon=ground-70;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;$('effects').checked=!reduced;
let ac,phase='idle',sessionAt=0,stoppedAt=0,bout=0,boutAt=0,spb=.6,gridAt=0,gridNext=0,beats=[],tally={wins:0,losses:0},score=0,chain=0,best=0,labels=[],sparks=[],shake=0,breakUntil=0,lastArrival=-9,staggerUntil=0;
let stream=null,analyser=null,spectrum=null,lastAnalysis=0,frames=[],lastCapture=0;
// The win and loss tally is a per-browser keepsake.
try{Object.assign(tally,JSON.parse(localStorage.getItem('duelTally'))??{});}catch{}
const level=()=>difficulty(multiplier(chain));
const held=new Set(),player={},enemy={},pulse=new PulseTracker();
new ResizeObserver(()=>{const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2),scale=Math.min(r.width/W,r.height/H);canvas.width=r.width*dpr;canvas.height=r.height*dpr;ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*(r.width-W*scale)/2,dpr*(r.height-H*scale)/2);}).observe(canvas);
const now=()=>ac?ac.currentTime:0,announce=text=>{$('status').textContent=text;},latency=()=>ac?.outputLatency||ac?.baseLatency||0;
function say(text,color='#ecf1ff',x=W/2,y=200,size=34){labels.push({text,color,x,y,size,born:now()});}

function tone(time,freq,to,length,volume,type='sine'){
  const osc=ac.createOscillator(),gain=ac.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,time);osc.frequency.exponentialRampToValueAtTime(to,time+length);
  gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.001,time+length);osc.connect(gain).connect(ac.destination);osc.start(Math.max(time,now()));osc.stop(Math.max(time,now())+length);
}
// Blade sounds are filtered noise and a few inharmonic partials: quiet, short, and pitched to say how the cut landed.
let noise;
function swish(freq,to,length,volume,q=1.2){
  noise??=(()=>{const b=ac.createBuffer(1,ac.sampleRate,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;})();
  const src=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain(),at=now();src.buffer=noise;filter.type='bandpass';filter.Q.value=q;
  filter.frequency.setValueAtTime(freq,at);filter.frequency.exponentialRampToValueAtTime(to,at+length);
  gain.gain.setValueAtTime(.001,at);gain.gain.exponentialRampToValueAtTime(volume,at+length*.3);gain.gain.exponentialRampToValueAtTime(.001,at+length);
  src.connect(filter).connect(gain).connect(ac.destination);src.start(at,Math.random()*.5);src.stop(at+length);
}
const ring=(base,volume,length=.35)=>[1,2.76,5.4].forEach((k,i)=>tone(now(),base*k,base*k*.995,length/(i+1),volume/(i+1)));
// A STRIKE rings brighter as the multiplier climbs; a GOOD is a duller ring.
const sounds={
  strike:()=>{swish(1800,6000,.14,.14);ring(1320*2**((multiplier(chain)-1)/12*2),.035);},
  good:()=>{swish(1500,4000,.14,.1);ring(990,.02,.2);},
  miss:()=>{swish(900,350,.2,.08,.8);tone(now(),196,185,.18,.05,'triangle');tone(now(),208,196,.18,.035,'triangle');},
  parry:()=>{swish(2500,7000,.1,.1);ring(1760,.05,.5);ring(2349,.025,.4);},
  dodge:()=>swish(700,2600,.16,.07,2),
  wave:()=>{swish(300,1400,.3,.09,3);tone(now(),220,660,.25,.04);},
  hurt:()=>{swish(600,200,.22,.12,.7);tone(now(),110,60,.2,.18);}
};

// Every beat is known ahead: the metronome lays its grid 3 s out, a tab's onsets arrive 2.2 s after they are heard.
function addBeat(time,count=0){
  // A beat holds one player action: a cut or a parry, whichever comes first.
  const beat={time,count,attack:null,arrived:false,used:false};beats.push(beat);
  // The rival never cuts on two beats in a row: the beat after its cut is the player's answer.
  const previous=beats.filter(b=>!b.count&&b!==beat).at(-1);
  if(phase==='fight'&&!count&&time>boutAt+1&&time>staggerUntil&&!previous?.attack&&Math.random()<level().aggression)threaten(beat);
  return beat;
}
function threaten(beat){beat.attack=Math.random()<.5?'high':'low';tone(beat.time-.45,1300,1250,.25,.08,'triangle');}
// After a blade exchange the rival answers on the beat after next, so the fight trades blows in turn.
function riposte(){
  const next=beats.filter(b=>!b.count&&b.time>now()+.05).slice(0,3),target=next[1];
  if(target&&!target.attack&&!next[0]?.attack&&!next[2]?.attack)threaten(target);
}
function metronome(){
  // Each beat is laid one period after the last, so a new multiplier changes the tempo from the next beat on.
  while(gridAt<now()+3){spb=60/level().bpm;const time=gridAt,beat=addBeat(time,gridNext<0?-gridNext:0);if((gridNext%4+4)%4===0)tone(time,150,50,.3,.6);else tone(time,900,700,.05,.18,'triangle');beat.down=gridNext%4===0;gridNext++;gridAt+=spb;}
}
// The tab is analyzed as it comes in and heard tabDelay later, so each onset becomes a beat that has not sounded yet.
function listen(){
  analyser.getFloatFrequencyData(spectrum);const time=now();
  pulse.update(bandEnergy(spectrum,ac.sampleRate,analyser.fftSize,listening.low,listening.high),time,.014-Number($('sensitivity').value)/100*.013);
  if(pulse.onset&&(phase==='fight'||phase==='break'))addBeat(time+tabDelay+latency());
}
async function captureFrame(){
  const video=$('tabVideo'),at=now();if(!video.srcObject||video.readyState<2||at-lastCapture<1/24)return;lastCapture=at;
  try{const bitmap=await createImageBitmap(video,{resizeWidth:160,resizeQuality:'low'});if(!stream){bitmap.close();return;}frames.push({at,bitmap});}catch{}
}
function clearFrames(){frames.forEach(f=>f.bitmap.close());frames=[];$('tabVideo').srcObject=null;}

function startBout(){
  ko=null;  beats=beats.filter(b=>b.time>now()&&!b.count);beats.forEach(b=>b.attack=null);staggerUntil=0;bout++;
  if(stream)boutAt=now();else{spb=60/level().bpm;boutAt=now()+4*spb;gridAt=now();gridNext=-4;beats=[];}
  Object.assign(player,{drift:0,x:260,hp:maxHp,pose:'idle',until:0,jumpAt:-9});
  Object.assign(enemy,{x:640,target:640,hp:maxHp,pose:'idle',until:0});
  phase='fight';say(t('duelBout',{n:bout}),'#ffd078',W/2,200,48);
}
// Bouts follow one another until Stop; the combo carries over, and with it the difficulty.
function fight(){
  if(phase!=='idle')return halt(t('duelStopped'));
  ac??=new AudioContext();ac.resume();sessionAt=now();bout=0;score=0;chain=0;best=0;labels=[];sparks=[];
  fightLabel('stop');$('tab').disabled=true;announce(t(stream?'duelTab':'duelIntro'));startBout();
}
function halt(message){phase='idle';waves=[];stoppedAt=now();beats=[];fightLabel('duelFight');$('tab').disabled=!!stream;announce(message);}
function fightLabel(key){$('fight').dataset.i18n=key;$('fight').textContent=t(key);}
function endBout(){
  const result=boutWinner(Math.max(0,player.hp),Math.max(0,enemy.hp));
  if(result==='player')tally.wins++;else if(result==='enemy')tally.losses++;
  try{localStorage.setItem('duelTally',JSON.stringify(tally));}catch{}
  // K.O.: a white flash, a long hitstop, then the loser staggers, kneels and falls while the winner raises the blade.
  ko={at:now(),losers:result==='player'?[enemy]:result==='enemy'?[player]:[player,enemy],fell:false};
  clash('#ffffff');frozenUntil=now()+.3;sounds.parry();say('K.O.','#ff4d5e',W/2,230,72);
  setTimeout(()=>{if(phase==='break')say(t(result==='player'?'duelWon':result==='enemy'?'duelLost':'duelDraw'),result==='player'?'#83f0ca':'#ff4d5e',W/2,200,46);},900);
  phase='break';breakUntil=now()+4;beats.forEach(b=>b.attack=null);waves=[];
}

// On each beat the rival closes in or backs off by how the bout is going; ahead, it also closes in for its own cut.
function rivalStep(){
  const gap=enemy.x-player.x,{approach,retreat}=rivalIntent(enemy.hp,player.hp),cutting=approach>.5&&beats.some(b=>b.attack&&b.time>now()&&b.time-now()<1.5);
  if(gap>reach+10&&(cutting||Math.random()<approach))enemy.target=Math.max(player.x+90,enemy.x-70);
  else if(gap<reach+150&&!cutting&&Math.random()<retreat)enemy.target=Math.min(840,enemy.x+60+retreat*60);
}
function resolveCut(beat){
  const height=beat.attack,wave=beat.wave;beat.attack=null;if(!wave){enemy.pose='strike';enemy.until=now()+.25;}
  const air=now()-player.jumpAt<.55,duck=held.has('duck');
  if(wave)waves=waves.filter(w=>w!==wave);
  if((!wave&&enemy.x-player.x>reach+30)||(height==='low'&&air)||(height==='high'&&duck)){beat.result='dodge';sounds.dodge();say(t('duelDodge'),'#70cfff',player.x,250,26);score+=50*multiplier(chain);return;}
  beat.result='hurt';player.hp-=wave?Math.round(level().damage*waveShare):level().damage;chain=0;player.pose='hurt';player.until=now()+.35;player.drift-=wave?25:55;sounds.hurt();burst(player.x,ground-80,'#ff4d5e',wave?1:1.4);if($('effects').checked)shake=wave?.15:.35;
  say(t('duelHit'),'#ff4d5e',player.x,250,30);
}
// Up or down on the beat of the rival's cut parries it: it scores like a strike, deals no damage, and turns a ki wave back.
function parry(){
  if(phase!=='fight'||now()<boutAt)return false;const time=now(),playable=beats.filter(b=>!b.count),{index,offset}=nearestBeat(playable.map(b=>b.time),time),beat=playable[index];
  if(!beat?.attack||beat.used||Math.abs(offset)>goodWindow)return false;beat.used=true;beat.result='parry';
  const g=grade(offset),o=strikeOutcome(g,chain);gain(o);trackBurst('#ffd078',g);score+=100;beat.attack=null;
  if(beat.wave){const w=beat.wave;Object.assign(w,{beat:null,from:'player',dir:1,speed:900,damage:waveOutcome(g,chain).damage,color:'#70cfff'});beat.wave=null;sounds.parry();say(t('duelDeflect'),'#70cfff',player.x+40,230,28);staggerUntil=time+spb;return true;}
  staggerUntil=time+spb*1.5;beats.forEach(b=>{if(b.time<staggerUntil)b.attack=null;});
  enemy.pose='hurt';enemy.until=time+.3;knockRival(45);player.pose='parry';sounds.parry();burst((player.x+enemy.x)/2,ground-110,'#ffd078',1.8);clash('#ffd078');
  say(t('duelParry'),'#ffd078',(player.x+enemy.x)/2,230,30);if(g==='strike')say(strikeText(chain),'#ff73b5',W/2,160,24);return true;
}
function cut(){
  if(phase!=='fight')return;const time=now(),playable=beats.filter(b=>!b.count),{index,offset}=nearestBeat(playable.map(b=>b.time),time),beat=playable[index];
  if(!beat||time<boutAt)return;player.pose='strike';player.until=time+.2;
  const spent=beat.used,g=spent?'off':grade(offset);beat.used=true;
  if(g==='off'){if(!spent)beat.result='miss';chain=0;sounds.miss();say(t(spent?'duelSpent':'offBeat'),'#96a4bd',player.x,260,22);return;}
  if(enemy.x-player.x>reach){beat.result='cut';const o=waveOutcome(g,chain);gain(o);trackBurst('#70cfff',g);waves.push({x:player.x+30,y:ground-95,dir:1,speed:900,from:'player',damage:o.damage,color:'#70cfff'});player.pose='ki';player.until=time+.3;sounds.wave();say(t('duelWave'),'#70cfff',player.x,260,22);return;}
  if(Math.random()<rivalParry(g,multiplier(chain))){beat.result='blocked';
    if(g==='good')chain=0;player.drift-=40;player.pose='hurt';player.until=time+.2;enemy.pose='parry';enemy.until=time+.3;
    sounds.parry();burst((player.x+enemy.x)/2,ground-110,'#ffd078',1.4);clash('#ffd078');say(t('duelBlocked'),'#ffd078',enemy.x,230,28);riposte();return;
  }
  beat.result='cut';const o=strikeOutcome(g,chain);gain(o);trackBurst(g==='strike'?'#ff73b5':'#70cfff',g);enemy.hp-=o.damage;riposte();
  enemy.pose='hurt';enemy.until=time+.3;knockRival(g==='strike'?70:40);sounds[g]();burst(enemy.x-10,ground-95,g==='strike'?'#ff73b5':'#70cfff',g==='strike'?1.6:1.2);if(g==='strike')clash('#ffffff');
  say(g==='strike'?strikeText(chain):t('good'),g==='strike'?'#ff73b5':'#70cfff',W/2,160,g==='strike'?30:24);
}
function gain(o){
  const before=multiplier(chain);chain=o.chain;score+=o.points;best=Math.max(best,chain);
  if(multiplier(chain)>before){say('×'+multiplier(chain),auraColors[multiplier(chain)],player.x,ground-170,36);say(t('duelHarder'),'#ff4d5e',enemy.x,ground-190,18);}
}
// A landed blow pushes the rival back; it slides there as it follows its target.
const knockRival=d=>{enemy.target=Math.min(840,enemy.x+d);};
let beatCount=0,ko=null,trackSparks=[],trackKick=-9,shownMultiplier=1,multiplierAt=-9;
// A landed beat bursts sparks out of the hit zone; the multiplier sets how many, how far and how long they fly.
function trackBurst(color,g){
  const m=multiplier(chain),n=(g==='strike'?16:8)*m;trackKick=now();
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(60+Math.random()*120)*(1+m*.45);trackSparks.push({x:ringX,y:41,vx:Math.cos(a)*v*1.6,vy:Math.sin(a)*v*.6,life:.3+m*.1+Math.random()*.2,color:i%3?color:'#ffffff',size:m>2&&i%4===0?6:4});}
}
// Between attacks the fighters dance: a dip on each beat, a sway that alternates side, the blade rocking, and steps while walking.
function groove(pose,moving){
  if((pose!=='idle'&&pose!=='duck')||phase==='idle')return {dip:0,sway:0,tilt:0,step:0};
  const period=stream&&pulse.bpm?60/pulse.bpm:spb,k=Math.min(1,Math.max(0,(now()-lastArrival)/period)),side=beatCount%2?1:-1,arc=Math.sin(k*Math.PI);
  return {dip:Math.round(2*(1-k)**2),sway:Math.round(side*arc),tilt:side*.14*arc,step:moving?Math.round(side*2*arc):0};
}
let impacts=[],waves=[],flash=null,frozenUntil=0;
function burst(x,y,color,size=1){impacts.push({x,y,color,size,born:now()});for(let i=0;i<18*size;i++){const a=Math.random()*Math.PI*2,v=(80+Math.random()*220)*size;sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,life:.5,color});}}

// A blade clash flashes the screen and holds the frame for a beat of hitstop.
function clash(color){flash={color,born:now()};frozenUntil=now()+.07;if($('effects').checked)shake=Math.max(shake,.25);}
function update(dt){
  if(now()<frozenUntil)dt=0;
  if(analyser&&now()-lastAnalysis>.02){lastAnalysis=now();listen();}
  if(stream)captureFrame();
  if(phase==='fight'||phase==='break'){
    if(!stream)metronome();
    for(const b of beats)if(!b.arrived&&b.time<=now()){b.arrived=true;lastArrival=b.time;beatCount++;if(b.count)say(String(b.count),'#96a4bd',W/2,270,40);else if(phase==='fight')rivalStep();}
    for(const b of beats)if(b.attack&&now()>=b.time+goodWindow)resolveCut(b);
    // Out of reach the rival's cut leaves its blade as a wave that lands on the beat.
    for(const b of beats)if(b.attack&&!b.wave&&!b.launched&&now()>=b.time-.25){b.launched=true;const gap=enemy.x-player.x;if(gap>reach+30){b.wave={beat:b,x:enemy.x-30,y:b.attack==='high'?ground-120:ground-40,dir:-1,speed:gap/.25,from:'enemy',color:'#ff4d5e'};waves.push(b.wave);sounds.wave();enemy.pose='ki';enemy.until=now()+.35;}}
    beats=beats.filter(b=>now()-b.time<1);
  }
  if(phase==='fight'){
    // Walking is free; knockback slides the player over a few frames instead of teleporting.
    const slide=player.drift*Math.min(1,dt*12),walk=((held.has('right')?1:0)-(held.has('left')?1:0))*260*dt;player.drift-=slide;player.x=Math.max(60,Math.min(enemy.x-75,player.x+slide+walk));
    enemy.x+=(enemy.target-enemy.x)*Math.min(1,dt*8);enemy.x=Math.max(player.x+75,enemy.x);enemy.target=Math.max(enemy.target,player.x+75);
    if(player.hp<=0||enemy.hp<=0)endBout();
  }else if(phase==='break'&&now()>=breakUntil)startBout();
  for(const w of waves){w.x+=w.dir*w.speed*dt;if(w.from==='player'&&w.x>=enemy.x-10){w.done=true;enemy.hp-=w.damage;enemy.pose='hurt';enemy.until=now()+.2;knockRival(20);burst(enemy.x-10,w.y,w.color,.7);}if(w.from==='enemy'&&w.x<player.x)w.x=player.x;}
  // A rival wave lives only while its cut is pending; a parry, a stagger or the bout's end can cancel the cut.
  waves=waves.filter(w=>!w.done&&w.x>-50&&w.x<W+50&&(w.from!=='enemy'||(w.beat.attack&&beats.includes(w.beat))));
  for(const s of trackSparks){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=1-dt*2;s.vy+=160*dt;s.life-=dt;}trackSparks=trackSparks.filter(s=>s.life>0);
  // From ×3 the hit zone smoulders with rising embers.
  const m=multiplier(chain);if(phase==='fight'&&m>2&&Math.random()<(m-2)*.35)trackSparks.push({x:ringX+(Math.random()-.5)*70,y:62,vx:(Math.random()-.5)*20,vy:-60-Math.random()*60,life:.5,color:auraColors[m],size:3});
  if(m!==shownMultiplier){if(m>shownMultiplier)multiplierAt=now();shownMultiplier=m;}
  for(const s of sparks){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=500*dt;s.life-=dt;}sparks=sparks.filter(s=>s.life>0);
  labels=labels.filter(l=>now()-l.born<1.1);shake=Math.max(0,shake-dt);
}

// Fighters are pixel sprites: drawn on a small canvas facing right, outlined, then scaled up without smoothing.
const sprite=Object.assign(document.createElement('canvas'),{width:80,height:64}),sctx=sprite.getContext('2d');
const outline=Object.assign(document.createElement('canvas'),{width:80,height:64}),octx=outline.getContext('2d');
const auraColors=[null,null,'#70cfff','#ffd078','#ff73b5'];
const palettes={
  player:{gi:'#3b6fd1',giLight:'#7fb0ff',giDark:'#223f86',hakama:'#1f2440',hakamaDark:'#12152a',scarf:'#f4f4f4',scarfDark:'#b9c2d6',hair:'#1d2350',hairLight:'#5468d4',eye:'#3fa3ff',ki:'#9fd8ff'},
  rival:{gi:'#c0283d',giLight:'#ff6d7a',giDark:'#6e1222',hakama:'#2a1216',hakamaDark:'#170a0c',scarf:'#ffd078',scarfDark:'#c08a2c',hair:'#d9dbeb',hairLight:'#ffffff',eye:'#ff3355',ki:'#ff8f9a'}
};
const skin='#ffd9b8',skinDark='#e8a47c',ink='#1a1014',steel='#eef4ff',steelDark='#8d97aa',hilt='#3a2416',gold='#e0b040';
const px=(x,y,w=1,h=1,c)=>{if(c)sctx.fillStyle=c;sctx.fillRect(Math.round(x),Math.round(y),w,h);};
function line(x0,y0,x1,y1,c,w=1){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);sctx.fillStyle=c;for(let i=0;i<=n;i++)sctx.fillRect(Math.round(x0+(x1-x0)*i/n-(w-1)/2),Math.round(y0+(y1-y0)*i/n-(w-1)/2),w,w);}
// Grip offset from the front shoulder and blade angle, per pose (sprite pixels, facing right).
const grips={idle:[7,8,-.75],duck:[8,7,-.45],strike:[12,3,.05],parry:[7,-2,-1.5],hurt:[2,10,1],'wind-high':[-2,-10,-2.4],'wind-low':[-6,12,2.6],kneel:[5,12,1.35],fallen:[6,10,.4],victory:[1,-15,-1.45],ki:[-4,14,2.3]};
// The free hand rests at the obi, rises to guard, or thrusts forward open to throw ki.
const palms={ki:[16,1],parry:[9,6],'wind-high':[6,4]};
// Anime proportions: a big head with spiky bangs, large lit eyes, a flowing ponytail and scarf, cel-shaded cloth.
// Wear marks appear as health falls: [threshold, x, y from the shoulder, kind].
const wounds=[[.15,4,3,'slash'],[.3,-5,7,'tear'],[.45,1,8,'slash'],[.6,-2,2,'tear'],[.75,5,6,'slash'],[.85,-6,3,'slash']];
function paintSamurai(p,pose,dance,wear){
  // Fatigue sets in past 40% damage: at rest the fighter heaves, slouches and lets the blade droop.
  const tired=(pose==='idle'||pose==='duck')?Math.max(0,(wear-.4)/.6):0,pant=tired*(1+Math.sin(now()*7));
  sctx.clearRect(0,0,80,64);const cx=30,gy=62,low=(pose==='duck'?6:pose==='kneel'?10:0)+dance.dip,lean=(pose==='hurt'?-2:pose==='strike'?2:0)+dance.sway+Math.round(tired),wave=now()*9;
  const hip=gy-21+low,shoulder=hip-12+Math.round(pant),head=shoulder-12+Math.round(tired*1.5),hx=cx+lean;
  // Scarf tails and ponytail stream behind, under everything else.
  for(let i=0;i<12;i++){const y=shoulder+1+Math.round(Math.sin(wave-i*.6)*1.5+i*.35);px(hx-5-i,y,1,2-(i>8),i%3?p.scarf:p.scarfDark);}
  for(let i=0;i<10;i++){const y=head+1+Math.round(Math.sin(wave+1-i*.5)*1.5+i*.5);px(hx-6-i,y,1,Math.max(1,4-Math.floor(i/3)),i%4?p.hair:p.hairLight);}
  // Hakama: wide pleated legs split into a stance.
  for(let y=hip;y<gy-2;y++){const half=8+(y-hip)/(gy-hip)*6;px(cx-half,y,half*2,1,p.hakama);px(cx-half,y,2,1,p.hakamaDark);px(cx+half-1,y,1,1,p.giDark);if(y%4===0)px(cx+3,y,1,1,p.hakamaDark);}
  sctx.clearRect(cx-2,gy-11+low,4,11-low);
  for(const [t,x] of [[.4,-12],[.55,9],[.7,-7],[.85,4]])if(wear>t){sctx.clearRect(cx+x,gy-4,2,2);px(cx+x,gy-5,2,1,'#3a2a30');}
  if(wear>.5)px(cx-6,hip+8,2,3,'#3a2a30');if(wear>.7)px(cx+5,hip+12,2,2,skinDark);px(cx-3,gy-11+low,1,9-low,p.hakamaDark);
  const st=dance.step;px(cx-14-st,gy-2,6,2,ink);px(cx+8+st,gy-2,7,2,ink);px(cx-13-st,gy-2,4,1,'#6b4a3a');px(cx+9+st,gy-2,5,1,'#6b4a3a');
  // Gi: dark back, lit front rim, an open collar and a fold.
  for(let y=shoulder;y<hip;y++){const half=9-Math.max(0,y-shoulder-5)*.35;px(hx-half,y,half*2,1,p.gi);px(hx-half,y,3,1,p.giDark);px(hx+half-2,y,2,1,p.giLight);}
  for(let i=0;i<5;i++)px(hx+1+i*.5,shoulder+i,2-i*.3,1,skin);line(hx-2,shoulder+3,hx-4,hip-3,p.giDark);
  px(hx-8,hip-2,16,3,ink);px(hx+4,hip-1,2,4,ink);px(hx-8,hip-2,16,1,'#3a3040');
  for(const [t,x,y,kind] of wounds)if(wear>t){
    if(kind==='slash'){line(hx+x,shoulder+y,hx+x+3,shoulder+y+3,'#8a1a28');px(hx+x+1,shoulder+y+1,2,1,skin);}
    else{px(hx+x,shoulder+y,2,2,skin);px(hx+x,shoulder+y+2,2,1,ink);px(hx+x+2,shoulder+y,1,1,ink);}
  }
  px(hx-5,shoulder-1,11,2,p.scarf);px(hx-5,shoulder,11,1,p.scarfDark);
  // Face: pointed chin, shaded back, one big eye with a highlight, a stern brow.
  px(hx-5,head,10,9,skin);px(hx-4,head+9,8,1,skin);px(hx,head+10,4,1,skin);px(hx-5,head+4,2,5,skinDark);px(hx-3,head+9,3,1,skinDark);
  const hurt=pose==='hurt'||pose==='fallen';
  if(hurt){line(hx+1,head+5,hx+3,head+7,ink);line(hx+1,head+7,hx+3,head+5,ink);}
  else{px(hx+1,head+4,4,1,ink);px(hx+1,head+5,3,3,p.eye);px(hx+2,head+6,1,2,ink);px(hx+1,head+5,1,1,'#ffffff');px(hx+4,head+5,1,2,'#ffffff');}
  if(!hurt&&tired>.3){px(hx+1,head+5,3,1,skinDark);px(hx+1,head+6,1,1,'#ffffff');}
  line(hx+1,head+3,hx+4,head+2,ink);if(tired>.3)px(hx+3,head+9,2,2,ink);else px(hx+3,head+9,2,1,hurt?ink:skinDark);
  if(wear>.3){px(hx+4,head+7,1,1,'#b3202f');px(hx+5,head+8,1,1,'#b3202f');}
  if(wear>.6){px(hx-1,head+3,2,1,'#9a6a8a');px(hx+5,head+9,1,2,'#b3202f');}
  // Hair: a cap with upward spikes and bangs that fall over the forehead, lit by one streak.
  px(hx-6,head-2,12,4,p.hair);px(hx-7,head,3,7,p.hair);px(hx-6,head+7,2,3,p.hair);
  for(const [x,h] of [[-6,4],[-3,6],[0,5],[3,3]])line(hx+x,head-2,hx+x-2,head-2-h,p.hair,2);
  for(const [x,h] of [[0,3],[2,5],[4,3],[5,6]])line(hx+x,head+1,hx+x+1,head+1+h,p.hair);
  px(hx-4,head-1,5,1,p.hairLight);px(hx-3,head-3,1,2,p.hairLight);px(hx+1,head-2,2,1,p.hairLight);
  // Wide sleeves meet on the grip; the katana extends from it.
  const [gx,gyo,angle]=grips[pose]??grips.idle,hand=[hx+4+gx,shoulder+2+gyo];
  const [fx,fy]=palms[pose]??[3,11],palm=[hx+fx,shoulder+fy];
  line(hx-3,shoulder+2,palm[0],palm[1],p.giDark,4);px(palm[0]-1,palm[1]-1,3,3,skinDark);
  if(pose==='ki'){px(palm[0]+1,palm[1]-2,2,1,skin);px(palm[0]+1,palm[1]+1,2,1,skin);for(let i=0;i<6;i++){const a=now()*20+i;px(palm[0]+3+Math.cos(a)*3,palm[1]+Math.sin(a)*3,1,1,p.ki);}px(palm[0]+2,palm[1]-1,3,3,'#ffffff');}
  line(hx+5,shoulder+2,hand[0],hand[1],p.gi,4);line(hx+6,shoulder+1,hand[0]+1,hand[1]-1,p.giLight,1);px(hand[0]-1,hand[1]-1,3,3,skin);
  const droop=angle+dance.tilt+tired*.5,dx=Math.cos(droop),dy=Math.sin(droop),tip=[hand[0]+dx*27,hand[1]+dy*27];
  line(hand[0]-dx*5,hand[1]-dy*5,hand[0],hand[1],hilt,2);line(hand[0]+dx*2,hand[1]+dy*2,...tip,steel,2);line(hand[0]+dx*3,hand[1]+dy*3+1,tip[0],tip[1]+1,steelDark,1);px(hand[0]+dx*1.5-1,hand[1]+dy*1.5-1,2,2,gold);
  // An anime slash: a thick crescent that thins at both ends.
  if(pose==='strike')for(let a=-1.3;a<.7;a+=.06){const w=Math.max(1,Math.round(3*Math.sin((a+1.3)/2*Math.PI)));px(hand[0]+Math.cos(a)*25,hand[1]+Math.sin(a)*25,w,w,a>.3||a<-1?'#9fd8ff':'#ffffff');}
}
function samurai(x,dir,p,pose,lift,flash,aura,moving,hp){
  const wear=1-Math.max(0,hp)/maxHp;paintSamurai(p,pose,groove(pose,moving),wear);
  // Past 40% damage, sweat flies off the head now and then.
  if(wear>.4&&phase==='fight'&&Math.random()<(wear-.4)*.25)sparks.push({x:x+dir*(Math.random()*20-5),y:ground-lift-150,vx:-dir*(30+Math.random()*50),vy:-60-Math.random()*40,life:.4,color:'#bfe6ff'});
  octx.globalCompositeOperation='source-over';octx.clearRect(0,0,80,64);
  for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1]])octx.drawImage(sprite,ox,oy);
  octx.globalCompositeOperation='source-in';octx.fillStyle='#0b0710';octx.fillRect(0,0,80,64);
  octx.globalCompositeOperation='source-over';octx.drawImage(sprite,0,0);
  if(flash){octx.globalCompositeOperation='source-atop';octx.fillStyle='#ffffffaa';octx.fillRect(0,0,80,64);}
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#0007';ctx.fillRect(x-36,ground,72,5);
  ctx.translate(x,ground-lift);ctx.scale(dir*pixel,pixel);
  // A fallen fighter tips over backwards over 0.3 s and lies on the ground.
  if(pose==='fallen'){const k=Math.min(1,(now()-ko.at-1.3)/.3);ctx.translate(-4*k,-17*k);ctx.rotate(-Math.PI/2*k*k);
    if(k>=1&&!ko.fell){ko.fell=true;for(let i=0;i<16;i++)sparks.push({x:x-dir*80*Math.random(),y:ground-4,vx:(Math.random()-.5)*160,vy:-40-Math.random()*60,life:.5,color:'#8a7a70'});}}
  if(aura){ctx.globalAlpha=.35+Math.sin(now()*14)*.15;ctx.globalCompositeOperation='lighter';ctx.filter=`drop-shadow(0 0 ${aura*2}px ${auraColors[aura]})`;ctx.drawImage(outline,-30,-62);ctx.filter='none';ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
  ctx.drawImage(outline,-30,-62);ctx.restore();
}
function poseOf(f,rival){
  if(phase==='break'&&ko){const age=now()-ko.at;if(ko.losers.includes(f))return age<.5?'hurt':age<1.3?'kneel':'fallen';return age<.5?'idle':'victory';}
  if(now()<f.until)return f.pose;
  if(rival){const next=beats.find(b=>b.attack&&b.time-now()<.45&&b.time>now()-goodWindow);if(next)return 'wind-'+next.attack;}
  return !rival&&held.has('duck')?'duck':'idle';
}

// The shared tab's video plays on the horizon, pixelated and as late as its audio.
function horizonVideo(){
  if(!frames.length)return;const due=now()-tabDelay-latency();while(frames.length>1&&frames[1].at<=due)frames.shift().bitmap.close();
  const f=frames[0];if(!f||f.at>due)return;
  const {bitmap}=f,top=110,height=horizon-top,cover=Math.max(W/bitmap.width,height/bitmap.height);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=.55;ctx.beginPath();ctx.rect(0,top,W,height);ctx.clip();
  ctx.drawImage(bitmap,(W-bitmap.width*cover)/2,top+(height-bitmap.height*cover)/2,bitmap.width*cover,bitmap.height*cover);
  const fade=ctx.createLinearGradient(0,top,0,horizon);fade.addColorStop(0,'#1b1530');fade.addColorStop(.3,'#1b153000');fade.addColorStop(1,'#e0735a66');ctx.globalAlpha=1;ctx.fillStyle=fade;ctx.fillRect(0,top,W,height);ctx.restore();
}
function scene(){
  const beat=Math.max(0,1-(now()-lastArrival)*4);
  const sky=ctx.createLinearGradient(0,0,0,ground);sky.addColorStop(0,'#1b1530');sky.addColorStop(.6,'#6b2a4a');sky.addColorStop(1,'#e0735a');ctx.fillStyle=sky;ctx.fillRect(-W,-H,W*3,ground+H);
  horizonVideo();
  ctx.fillStyle=`rgba(255,${190+beat*50},120,${(frames.length?.45:.75)+beat*.25})`;ctx.beginPath();ctx.arc(W/2,ground-40,120+beat*6,0,7);ctx.fill();
  ctx.fillStyle='#2a1830';ctx.beginPath();ctx.moveTo(-W,ground);for(let x=-W;x<=W*2;x+=30)ctx.lineTo(x,ground-60-Math.round(Math.abs(Math.sin(x*.013))*70/6)*6);ctx.lineTo(W*2,ground);ctx.fill();
  ctx.fillStyle='#140f1c';ctx.fillRect(-W,ground,W*3,H);ctx.fillStyle='#ffd07822';for(let x=0;x<W;x+=24)ctx.fillRect(x,ground+(x/24%2?9:3),12,3);
}
// Pixel icons for the track: a sword marks your turn to cut, a shield the rival's cut to parry.
const icons={
  sword:['.....##','....###','...###.','#.###..','.##+...','.+#....','#..#...'],
  shield:['#######','#+++++#','#+++++#','#+++++#','.#+++#.','..#+#..','...#...'],
  cross:['#.....#','.#...#.','..#.#..','...#...','..#.#..','.#...#.','#.....#']
};
function icon(name,x,y,size,color,fill=color){
  const rows=icons[name];for(let j=0;j<7;j++)for(let i=0;i<7;i++){const c=rows[j][i];if(c==='.')continue;ctx.fillStyle=c==='+'?fill:color;ctx.fillRect(Math.round(x+(i-3.5)*size),Math.round(y+(j-3.5)*size),size,size);}
}
const rivalBeat=b=>b.attack||b.result==='parry'||b.result==='hurt'||b.result==='dodge';
// The rhythm track: beats glide right to left into the hit zone, whose width is the GOOD window and whose core is the STRIKE window.
// Sword beats are yours to cut (SPACE); shield beats are the rival's cut, to parry with W or S. Spent beats show how they went.
function track(){
  const y=41;ctx.fillStyle='#0c1426cc';ctx.beginPath();ctx.roundRect(20,14,W-40,54,27);ctx.fill();
  const next=beats.find(b=>!b.count&&!b.used&&b.time>now()-goodWindow),parryNext=next&&rivalBeat(next),zone=parryNext?'#ffd078':'#ff73b5';
  // The zone pops on each landed beat and glows in the multiplier's colour from ×2.
  const m=multiplier(chain),pop=Math.max(0,1-(now()-trackKick)*5),half=goodWindow*trackSpeed*(1+pop*.15);
  ctx.save();if(m>1){ctx.shadowColor=auraColors[m];ctx.shadowBlur=6+m*5+pop*20;}
  ctx.strokeStyle=pop>.5?'#ffffff':zone;ctx.lineWidth=2+pop*3+(m-1);ctx.globalAlpha=.7+pop*.3;ctx.beginPath();ctx.roundRect(ringX-half,19-pop*4,half*2,44+pop*8,8);ctx.stroke();ctx.restore();
  ctx.globalAlpha=.18;ctx.fillStyle=zone;ctx.fillRect(ringX-.09*trackSpeed,19,.09*trackSpeed*2,44);ctx.globalAlpha=1;
  const hit=Math.max(0,1-(now()-lastArrival)*5);ctx.fillStyle=zone;ctx.fillRect(ringX-1-hit*2,16,2+hit*4,50);
  for(const b of beats){
    const x=ringX+(b.time-now())*trackSpeed,edge=ringX-goodWindow*trackSpeed;if(x<edge-40||x>W-110)continue;
    ctx.globalAlpha=x<edge?Math.max(0,1-(edge-x)/40):1;
    if(b.count){ctx.fillStyle='#96a4bd';ctx.fillRect(x-3,y-3,6,6);continue;}
    const size=b.down?3.5:3;
    if(b.result==='hurt'||b.result==='miss')icon('cross',x,y,size,'#ff4d5e');
    else if(rivalBeat(b)){ctx.fillStyle='#ff4d5e';ctx.beginPath();ctx.arc(x,y,15,0,7);ctx.fill();icon('shield',x,y,size,b.result==='parry'?'#ffffff':'#ffd078',b.result==='parry'?'#ffd078':'#7a4a10');
      if(!b.result){ctx.fillStyle='#ffd078';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText('W / S',x,y+27);}}
    else icon('sword',x,y,size,b.result==='cut'?'#ffffff':b.result==='blocked'?'#96a4bd':b.down?'#ff73b5':'#ff9ccb',b.result==='cut'?'#ff73b5':'#ffd078');
  }ctx.globalAlpha=1;
  // The prompt names what the next beat asks for, in the colour of its zone.
  ctx.textAlign='left';ctx.font='bold 12px Arial';ctx.fillStyle=zone;
  if(phase==='fight'&&next){icon(parryNext?'shield':'sword',42,y-1,2,zone,parryNext?'#7a4a10':'#ffd078');ctx.fillText(t(parryNext?'duelPromptParry':'duelPromptCut'),58,y+4);}
  ctx.save();ctx.globalCompositeOperation='lighter';for(const s of trackSparks){ctx.globalAlpha=Math.min(1,s.life*3);ctx.fillStyle=s.color;ctx.fillRect(Math.round(s.x/3)*3,Math.round(s.y/3)*3,s.size,s.size);}ctx.restore();
  // The multiplier badge swells when it climbs and shakes at ×4.
  if(m>1){const grow=Math.max(0,1-(now()-multiplierAt)*2.5),jig=m>3?Math.sin(now()*40)*1.5:0;ctx.save();ctx.translate(W-170+jig,y+2);ctx.scale(1+grow*.8,1+grow*.8);ctx.shadowColor=auraColors[m];ctx.shadowBlur=10+m*4;ctx.fillStyle=auraColors[m];ctx.font=`bold ${16+m*3}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('×'+m,0,0);ctx.restore();}
  ctx.fillStyle='#96a4bd';ctx.font='11px Arial';ctx.textAlign='right';ctx.fillText(stream?`⧉ ${pulse.bpm??'…'} BPM`:`♩ ${Math.round(60/spb)} BPM`,W-40,y+4);
}
// Just before the rival's cut, a gold "!" pops over its head and the parry keys over yours.
function warnings(){
  const next=beats.find(b=>b.attack&&!b.used&&b.time>now()),left=next?next.time-now():9;if(phase!=='fight'||left>.6)return;
  const k=1-left/.6,bob=Math.round(Math.sin(now()*25)*2);
  ctx.fillStyle='#ffd078';ctx.fillRect(enemy.x-9,ground-205+bob,18,24);ctx.fillStyle='#7a1020';ctx.fillRect(enemy.x-3,ground-201+bob,6,11);ctx.fillRect(enemy.x-3,ground-187+bob,6,4);
  ctx.globalAlpha=.4+k*.6;ctx.fillStyle='#ffd078';ctx.font='bold 16px Arial';ctx.textAlign='center';ctx.fillText('W / S',player.x,ground-190);ctx.globalAlpha=1;
}
function hud(){
  const bar=(x,label,hp,right)=>{ctx.fillStyle='#0c1426cc';ctx.fillRect(x,82,300,14);ctx.fillStyle=hp>maxHp*.3?'#83f0ca':'#ff4d5e';const w=300*Math.max(0,hp)/maxHp;ctx.fillRect(right?x+300-w:x,82,w,14);
    ctx.fillStyle='#ecf1ff';ctx.font='bold 12px Arial';ctx.textAlign=right?'right':'left';ctx.fillText(label,right?x+300:x,112);};
  bar(40,t('duelYou'),player.hp??maxHp,false);bar(W-340,t('duelRival'),enemy.hp??maxHp,true);
  ctx.textAlign='center';ctx.fillStyle='#ffd078';ctx.font='bold 13px Arial';ctx.fillText(t('duelTally',tally),W/2,94);
  ctx.fillStyle='#ecf1ff';ctx.font='12px Arial';if(bout)ctx.fillText(t('duelBout',{n:bout}),W/2,112);
  const m=multiplier(chain);$('score').textContent=String(score).padStart(6,'0');$('combo').textContent=chain;$('multiplier').textContent='×'+m;$('best').textContent=best;
  const elapsed=Math.floor((phase==='idle'?stoppedAt:now())-sessionAt);$('clock').textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;$('multiplier').dataset.power=m;
}
function draw(){
  ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake*30,(Math.random()-.5)*shake*20);
  scene();
  if(player.hp!==undefined){
    const air=now()-player.jumpAt,lift=air<.55?Math.sin(air/.55*Math.PI)*70:0;
    samurai(player.x,1,palettes.player,poseOf(player,false),lift,player.pose==='hurt'&&now()<player.until,multiplier(chain)>1?multiplier(chain):0,held.has('left')||held.has('right')||Math.abs(player.drift)>2,player.hp);
    samurai(enemy.x,-1,palettes.rival,poseOf(enemy,true),0,enemy.pose==='hurt'&&now()<enemy.until,0,Math.abs(enemy.target-enemy.x)>2,enemy.hp);
  }
  // Energy waves: a glowing core with a stepped pixel trail.
  for(const w of waves){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<7;i++){ctx.globalAlpha=.5-i*.06;ctx.fillStyle=w.color;const s=18-i*2;ctx.fillRect(Math.round((w.x-w.dir*i*12)/3)*3-s/2,w.y-s/2+Math.sin(now()*30+i)*3,s,s);}
    ctx.globalAlpha=.9;ctx.fillStyle='#ffffff';ctx.fillRect(w.x-6,w.y-6,12,12);ctx.shadowColor=w.color;ctx.shadowBlur=24;ctx.fillRect(w.x-3,w.y-3,6,6);ctx.restore();}
  // A landing blade leaves a glowing crescent in front of its owner.
  for(const [f,dir] of [[player,1],[enemy,-1]])if(f.pose==='strike'&&now()<f.until){const k=Math.min(1,(f.until-now())/.2);ctx.save();ctx.globalCompositeOperation='lighter';ctx.shadowColor=f===player?'#9fd8ff':'#ff8f9a';ctx.shadowBlur=30;ctx.strokeStyle=`rgba(255,255,255,${k*.8})`;ctx.lineWidth=10*k+2;ctx.beginPath();ctx.arc(f.x+dir*20,ground-100,80,dir>0?-1.3:Math.PI-.6,dir>0?.6:Math.PI+1.3);ctx.stroke();ctx.restore();}
  // Impacts are anime hit stars: eight pixel spikes that flash and shrink.
  impacts=impacts.filter(i=>now()-i.born<.22);
  for(const i of impacts){const k=1-(now()-i.born)/.22;for(let a=0;a<8;a++){const ang=a*Math.PI/4+.3,len=(a%2?22:44)*k*(i.size??1);for(let d=0;d<len;d+=3)ctx.fillStyle=d<len*.5?'#ffffff':i.color,ctx.fillRect(Math.round((i.x+Math.cos(ang)*d)/3)*3,Math.round((i.y+Math.sin(ang)*d)/3)*3,3*(1+(d<8)),3*(1+(d<8)));}}
  for(const s of sparks){ctx.globalAlpha=s.life*2;ctx.fillStyle=s.color;ctx.fillRect(Math.round(s.x/3)*3,Math.round(s.y/3)*3,3,3);}ctx.globalAlpha=1;
  warnings();ctx.restore();
  if(flash){const age=now()-flash.born;if(age>.14)flash=null;else{ctx.globalAlpha=(1-age/.14)*.4;ctx.fillStyle=flash.color;ctx.fillRect(-W,-H,W*3,H*3);ctx.globalAlpha=1;}}
  track();hud();
  for(const l of labels){const age=now()-l.born;ctx.globalAlpha=Math.max(0,1-age/1.1);ctx.fillStyle=l.color;ctx.font=`bold ${l.size}px Arial`;ctx.textAlign='center';ctx.fillText(l.text,l.x,l.y-age*30);}ctx.globalAlpha=1;
}
let last=performance.now();
function frame(ms){const dt=Math.min(.05,(ms-last)/1000);last=ms;update(dt);ctx.clearRect(-W,-H,W*3,H*3);draw();requestAnimationFrame(frame);}
requestAnimationFrame(frame);

const actions={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyW:'jump',ArrowUp:'jump',KeyS:'duck',ArrowDown:'duck',Space:'cut'};
const pads=Object.fromEntries([...document.querySelectorAll('[data-action]')].map(b=>[b.dataset.action,b]));
function light(action,on){pads[action]?.classList.toggle('active',on);}
function press(action){
  light(action,true);if(action!=='duck')setTimeout(()=>light(action,false),150);
  if(action==='cut')return cut();
  // Up or down on the rival's beat parries; otherwise they jump or duck.
  if((action==='duck'||action==='jump')&&parry())return;
  if(action==='jump'){if(phase==='fight'&&now()-player.jumpAt>.6)player.jumpAt=now();return;}
  held.add(action);
}
addEventListener('keydown',e=>{const a=actions[e.code];if(!a||e.target.closest?.('input'))return;e.preventDefault();if(!e.repeat)press(a);});
addEventListener('keyup',e=>{const a=actions[e.code];if(a){held.delete(a);light(a,false);}});
for(const b of document.querySelectorAll('[data-action]')){b.onpointerdown=e=>{e.preventDefault();press(b.dataset.action);};b.onpointerup=b.onpointerleave=()=>{held.delete(b.dataset.action);light(b.dataset.action,false);};}
$('fight').onclick=fight;
// The slider lets go of focus so WASD and SPACE reach the duel again.
$('sensitivity').oninput=()=>$('sensValue').textContent=$('sensitivity').value+'%';$('sensitivity').onchange=()=>$('sensitivity').blur();
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{const r=$('sensitivity');r.value=Number(r.value)+Number(b.dataset.step);r.oninput();});

// Losing the tab mid-fight hands the beat back to the metronome once the delayed beats have played.
function unshare(){
  stream?.getTracks().forEach(track=>track.stop());stream=analyser=null;pulse.reset();clearFrames();$('source').textContent=t('noSource');
  if(phase==='fight'||phase==='break'){gridAt=now()+tabDelay;gridNext=0;}else $('tab').disabled=false;
}
$('tab').onclick=async()=>{
  announce(t('pickTab'));
  try{
    if(!navigator.mediaDevices?.getDisplayMedia)throw new Error('unsupported');
    // Chrome jumps to the shared tab by default; that hides this one and would end the duel.
    const controller=window.CaptureController?new CaptureController():undefined;
    const incoming=await navigator.mediaDevices.getDisplayMedia({controller,video:true,audio:{suppressLocalAudioPlayback:true,echoCancellation:false,noiseSuppression:false,autoGainControl:false},preferCurrentTab:false,selfBrowserSurface:'exclude',systemAudio:'include'});
    try{controller?.setFocusBehavior('no-focus-change');}catch{}
    const track=incoming.getAudioTracks()[0];
    if(!track){incoming.getTracks().forEach(tr=>tr.stop());announce(t('tabNoAudio'));return;}
    ac??=new AudioContext();await ac.resume();unshare();stream=incoming;
    const [video]=incoming.getVideoTracks();if(video){$('tabVideo').srcObject=new MediaStream([video]);$('tabVideo').play().catch(()=>{});}
    const source=ac.createMediaStreamSource(new MediaStream([track])),delay=ac.createDelay(tabDelay+.5);delay.delayTime.value=tabDelay;
    analyser=ac.createAnalyser();analyser.fftSize=4096;analyser.smoothingTimeConstant=0;spectrum=new Float32Array(analyser.frequencyBinCount);
    source.connect(analyser);source.connect(delay).connect(ac.destination);
    track.onended=()=>{if(stream===incoming){unshare();announce(t('tabEnd'));}};
    $('source').textContent=t('tabSource');if(phase==='idle')fight();else announce(t('duelTab'));
  }catch(error){announce(error.name==='NotAllowedError'?t('tabCancelled'):t('tabUnsupported'));}
};
$('lang').onclick=()=>setLang(lang()==='en'?'es':'en');setLang(lang());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase!=='idle')halt(t('hidden'));});
