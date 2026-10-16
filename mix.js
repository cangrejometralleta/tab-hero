import {PulseTracker,bandEnergy,listening} from './audio.js';
import {lang,setLang,t} from './i18n.js';

const $=id=>document.getElementById(id),baseDelay=1.4,splitHz=180;
const minRoleBeats=1,maxRoleBeats=32,defaultRoleBeats=16;
const videoFrameCount=100,videoFrameWidth=320,videoFrameHeight=180,videoFrameStep=1000/30;
const roleInterval=$('roleInterval'),roleIntervalValue=$('roleIntervalValue');
let audio=null,tracks=[null,null],playing=false,stopping=false,aligned=false,role=0,masterBeats=0,lastAnalysis=0,lastNormalization=0,lastRephase=0,roleChangeAt=Infinity,roleChange=null,lastStatus='mixInstructions';
const detectors=[new PulseTracker(),new PulseTracker()];
const streams=[null,null];
const videoStops=[null,null];

$('lang').onclick=()=>{
  setLang(lang()==='en'?'es':'en');document.title=t('mixTitle');announce(lastStatus);
  ['A','B'].forEach((letter,index)=>{
    $(`name${letter}`).textContent=tracks[index]?t('mixConnected'):t('mixUnconnected');
    $(`connect${letter}`).textContent=tracks[index]?t('mixConnectedButton'):t(index?'mixConnectB':'mixConnectA');
  });
  $('source').textContent=tracks[0]&&tracks[1]?t('mixTabsConnected'):t('mixNoTabs');
  paintRole();
};
setLang(lang());document.title=t('mixTitle');paintRole();

function createTrack(index,stream){
  const source=audio.createMediaStreamSource(stream),analyser=audio.createAnalyser();
  analyser.fftSize=4096;analyser.smoothingTimeConstant=0;
  const delays=[audio.createDelay(3),audio.createDelay(3)],delayGains=[audio.createGain(),audio.createGain()];
  const level=audio.createGain(),low=audio.createBiquadFilter(),high=audio.createBiquadFilter();
  const bass=audio.createGain(),bassLimiter=audio.createDynamicsCompressor(),melody=audio.createGain();
  delays.forEach(delay=>delay.delayTime.value=baseDelay);delayGains[0].gain.value=1;delayGains[1].gain.value=0;
  low.type='lowpass';low.frequency.value=splitHz;low.Q.value=.65;
  high.type='highpass';high.frequency.value=splitHz;high.Q.value=.65;bass.gain.value=0;melody.gain.value=0;
  bassLimiter.threshold.value=-6;bassLimiter.knee.value=3;bassLimiter.ratio.value=16;bassLimiter.attack.value=.003;bassLimiter.release.value=.15;
  source.connect(analyser);delays.forEach((delay,index)=>source.connect(delay).connect(delayGains[index]).connect(level));
  level.connect(low).connect(bass).connect(bassLimiter).connect(audio.destination);level.connect(high).connect(melody).connect(audio.destination);
  return {source,analyser,delays,delayGains,delayIndex:0,delayCorrection:0,level,bass,bassLimiter,melody,spectrum:new Float32Array(analyser.frequencyBinCount),waveform:new Float32Array(analyser.fftSize),index,pulses:detectors[index],events:[],bpm:null,rms:0,rmsAt:audio.currentTime};
}

function createVideoFrames(){
  return Array.from({length:videoFrameCount},()=>{
    const frame=document.createElement('canvas');
    frame.width=videoFrameWidth;frame.height=videoFrameHeight;
    return {canvas:frame,context:frame.getContext('2d',{alpha:false}),time:-Infinity};
  });
}

function captureVideoFrame(video,frame,time){
  frame.context.drawImage(video,0,0,videoFrameWidth,videoFrameHeight);frame.time=time;
}

function findDelayedFrame(frames,time){
  let delayed=null;
  for(const frame of frames)if(Number.isFinite(frame.time)&&frame.time<=time&&(!delayed||frame.time>delayed.time))delayed=frame;
  return delayed;
}

function videoDelaySeconds(track){
  return baseDelay+track.delayCorrection+(audio?.outputLatency??audio?.baseLatency??0);
}

function startVideoDelay(video,canvas,track){
  const output=canvas.getContext('2d'),frames=createVideoFrames();
  const usesVideoFrames=typeof video.requestVideoFrameCallback==='function';
  const schedule=usesVideoFrames?callback=>video.requestVideoFrameCallback(callback):callback=>requestAnimationFrame(callback);
  const cancel=usesVideoFrames?id=>video.cancelVideoFrameCallback(id):id=>cancelAnimationFrame(id);
  let cursor=0,lastCapture=-Infinity,lastVideoTime=-1,requestId;
  function renderFrame(now){
    if(video.readyState>=2&&video.currentTime!==lastVideoTime&&now-lastCapture>=videoFrameStep){
      const frame=frames[cursor];
      captureVideoFrame(video,frame,now);cursor=(cursor+1)%frames.length;lastCapture=now;lastVideoTime=video.currentTime;
    }
    const frameTime=now-videoDelaySeconds(track)*1000,delayed=findDelayedFrame(frames,frameTime);
    if(delayed)output.drawImage(delayed.canvas,0,0,canvas.width,canvas.height);
    requestId=schedule(renderFrame);
  }
  requestId=schedule(renderFrame);
  return ()=>{cancel(requestId);output.clearRect(0,0,canvas.width,canvas.height);};
}

async function connect(index){
  const letter=index?'B':'A',button=$(`connect${letter}`);button.disabled=true;
  try{
    if(!navigator.mediaDevices?.getDisplayMedia)throw new Error('unsupported');
    const incoming=await navigator.mediaDevices.getDisplayMedia({video:true,audio:{suppressLocalAudioPlayback:true,echoCancellation:false,noiseSuppression:false,autoGainControl:false},preferCurrentTab:false,selfBrowserSurface:'exclude',systemAudio:'include'});
    const audioTrack=incoming.getAudioTracks()[0],videoTrack=incoming.getVideoTracks()[0];
    if(!audioTrack){incoming.getTracks().forEach(track=>track.stop());throw new Error('no-audio');}
    streams[index]=incoming;audio??=new AudioContext();await audio.resume();tracks[index]=createTrack(index,new MediaStream([audioTrack]));
    if(videoTrack){
      const video=$(`video${letter}`),canvas=$(`preview${letter}`);
      video.srcObject=new MediaStream([videoTrack]);video.play().catch(()=>{});
      videoStops[index]=startVideoDelay(video,canvas,tracks[index]);video.parentElement.classList.add('has-video');
    }
    audioTrack.onended=()=>{if(!stopping)endSession('mixShareEnded');};
    $(`name${letter}`).textContent=t('mixConnected');button.textContent=t('mixConnectedButton');
    $('source').textContent=t('mixTabsConnected');
    if(tracks[0]&&tracks[1])startMix();
    else announce('mixSecondPrompt');
  }catch(error){
    if(error.name==='NotAllowedError')announce('mixCancelled');
    else if(error.message==='no-audio')announce('mixNoAudio');
    else announce('mixUnsupported');
    button.disabled=!!tracks[index];
  }
}

function announce(key){lastStatus=key;$('mixStatus').textContent=t(key);}
$('connectA').onclick=()=>connect(0);$('connectB').onclick=()=>connect(1);
$('sensitivity').oninput=()=>{$('mixSensitivityValue').textContent=`${$('sensitivity').value}%`;};
$('bassBoost').oninput=()=>{
  const decibels=Number($('bassBoost').value),bass=tracks[role];
  $('bassBoostValue').textContent=decibels?`+${decibels} dB`:'0 dB';
  if(playing&&bass)bass.gain.setTargetAtTime(Math.pow(10,decibels/20),audio.currentTime,.04);
};

function roleEveryBeats(){
  const entered=Number(roleInterval.value);
  if(!Number.isInteger(entered))return defaultRoleBeats;
  return Math.min(maxRoleBeats,Math.max(minRoleBeats,entered));
}

function resetRoleCycle(){
  masterBeats=0;roleChange=null;roleChangeAt=Infinity;
}

function setRole(next,at=audio?.currentTime??0){
  role=next;
  paintRole();
  if(!tracks[0]||!tracks[1]||!playing)return;
  const boost=Math.pow(10,Number($('bassBoost').value)/20);
  const aBass=next===0?boost:0,bBass=next===1?boost:0;
  tracks[0].bass.gain.setTargetAtTime(aBass,at,.025);tracks[0].melody.gain.setTargetAtTime(next===0?0:1,at,.025);
  tracks[1].bass.gain.setTargetAtTime(bBass,at,.025);tracks[1].melody.gain.setTargetAtTime(next===1?0:1,at,.025);
}

function paintRole(){
  const bass=role===0?0:1,melody=1-bass;
  $('roleBass').textContent=bass?'B':'A';$('roleMelody').textContent=melody?'B':'A';
  $('roleNameA').textContent=t(bass===0?'mixBassBand':'mixHighBand');$('roleNameB').textContent=t(bass===1?'mixBassBand':'mixHighBand');
  $('trackA').classList.toggle('bass-owner',bass===0);$('trackA').classList.toggle('melody-owner',bass!==0);
  $('trackB').classList.toggle('bass-owner',bass===1);$('trackB').classList.toggle('melody-owner',bass!==1);
  $('mixRole').textContent=playing?t(role===0?'mixRoleAB':'mixRoleBA'):t('mixAwait');
}

$('swapTracks').onclick=()=>{
  resetRoleCycle();
  setRole(role===0?1:0,audio?audio.currentTime+.03:0);
};
$('roleInterval').oninput=()=>{
  roleIntervalValue.textContent=roleEveryBeats();
  resetRoleCycle();
};
$('alternateRoles').onchange=()=>{
  resetRoleCycle();
};

function startMix(){
  if(!tracks[0]||!tracks[1])return;
  audio.resume();playing=true;aligned=false;lastRephase=0;masterBeats=0;roleChangeAt=Infinity;roleChange=null;setRole(role,audio.currentTime+.04);
  $('stopMix').disabled=false;$('syncLight').classList.add('active');
  announce('mixAligning');$('syncText').textContent=t('mixWaitingPulse');
}

function estimateSync(){
  const [a,b]=tracks;if(!a?.bpm||!b?.bpm||!a.events.length||!b.events.length)return;
  const bpm=Math.round((a.bpm+b.bpm)/2),period=60/bpm,delta=Math.abs(a.bpm-b.bpm)/Math.max(a.bpm,b.bpm);
  const lastA=a.events.at(-1),lastB=b.events.at(-1);
  const phase=((lastB-lastA+period/2)%period+period)%period-period/2;
  const time=audio.currentTime,shouldAlign=!aligned||(Math.abs(phase)>.075&&time-lastRephase>=period*4);
  if(shouldAlign){
    setTrackDelay(a,Math.max(0,phase),time);setTrackDelay(b,Math.max(0,-phase),time);
    aligned=true;lastRephase=time;
  }
  if(delta>.05){$('syncText').textContent=t('mixTempoDiff',{a:a.bpm,b:b.bpm});$('syncLight').classList.add('drift');}
  else{$('syncText').textContent=t('mixSynced',{bpm});$('syncLight').classList.remove('drift');}
  $('syncLight').classList.add('active');
}

function setTrackDelay(track,correction,time){
  if(Math.abs(track.delayCorrection-correction)<.025)return;
  const next=1-track.delayIndex;track.delays[next].delayTime.setValueAtTime(baseDelay+correction,time);
  track.delayGains[next].gain.setTargetAtTime(1,time,.035);
  track.delayGains[track.delayIndex].gain.setTargetAtTime(0,time,.035);
  track.delayIndex=next;track.delayCorrection=correction;
}

function analyzeTrack(track,time){
  track.analyser.getFloatFrequencyData(track.spectrum);
  const rms=bandEnergy(track.spectrum,audio.sampleRate,track.analyser.fftSize,listening.low,8000);
  track.analyser.getFloatTimeDomainData(track.waveform);
  let square=0;for(const sample of track.waveform)square+=sample*sample;
  const level=Math.sqrt(square/track.waveform.length),elapsed=Math.max(.001,time-track.rmsAt);
  track.rms+=(level-track.rms)*(1-Math.exp(-elapsed/3));track.rmsAt=time;
  track.pulses.update(rms,time,.008-Number($('sensitivity').value)/100*.006);
  $(`meter${track.index?'B':'A'}`).style.width=`${Math.min(100,rms*1200)}%`;
  if(track.pulses.bpm)track.bpm=track.pulses.bpm;
  $(`bpm${track.index?'B':'A'}`).innerHTML=`${track.bpm??'—'} <small>BPM</small>`;
  if(track.pulses.onset){track.events.push(time);track.events=track.events.slice(-8);}
  return track.pulses.onset;
}

function balanceLevels(time){
  if(time-lastNormalization<.25)return;lastNormalization=time;
  const [a,b]=tracks;if(!a||!b||a.rms<.002||b.rms<.002)return;
  const target=Math.sqrt(a.rms*b.rms),limit=(rms)=>Math.max(.5,Math.min(2,target/rms));
  a.level.gain.setTargetAtTime(limit(a.rms),time,1.5);
  b.level.gain.setTargetAtTime(limit(b.rms),time,1.5);
}

function frame(){
  requestAnimationFrame(frame);
  if(!playing||!audio||audio.currentTime-lastAnalysis<.025)return;
  lastAnalysis=audio.currentTime;const time=audio.currentTime;
  const onsets=tracks.map(track=>track?analyzeTrack(track,time):false);
  balanceLevels(time);
  if(onsets.some(Boolean))estimateSync();
  if(onsets[0]){
    masterBeats++;
    const interval=roleEveryBeats();
    if($('alternateRoles').checked&&masterBeats%interval===0){roleChange=role===0?1:0;roleChangeAt=time+baseDelay+tracks[0].delayCorrection;}
  }
  if(roleChange!==null&&time>=roleChangeAt){setRole(roleChange,time+.02);roleChange=null;roleChangeAt=Infinity;}
}
requestAnimationFrame(frame);

function endSession(message='mixStopped'){
  if(stopping)return;stopping=true;playing=false;aligned=false;lastRephase=0;roleChange=null;roleChangeAt=Infinity;
  videoStops.forEach(stop=>stop?.());videoStops[0]=videoStops[1]=null;
  streams.forEach(stream=>stream?.getTracks().forEach(track=>{track.onended=null;track.stop();}));
  ['A','B'].forEach(letter=>{const video=$(`video${letter}`),canvas=$(`preview${letter}`);video.pause();video.srcObject=null;canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);video.parentElement.classList.remove('has-video');});
  streams[0]=streams[1]=null;tracks[0]=tracks[1]=null;detectors.forEach(detector=>detector.reset());
  if(audio){audio.close().catch(()=>{});audio=null;}
  ['A','B'].forEach(letter=>{$(`name${letter}`).textContent=t('mixUnconnected');$(`connect${letter}`).disabled=false;$(`connect${letter}`).textContent=t(letter==='A'?'mixConnectA':'mixConnectB');$(`bpm${letter}`).innerHTML='— <small>BPM</small>';$(`meter${letter}`).style.width='0%';});
  $('stopMix').disabled=true;$('syncLight').className='';$('syncText').textContent=t('mixNeedTracks');$('source').textContent=t('mixNoTabs');paintRole();announce(message);
  stopping=false;
}
$('stopMix').onclick=()=>endSession();
window.addEventListener('pagehide',()=>endSession('mixStopped'));
window.addEventListener('keydown',event=>{if(event.code==='Escape'&&playing)endSession();});
