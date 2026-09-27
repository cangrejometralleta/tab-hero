// Normalized autocorrelation: a tonal-confidence gate keeps noise from becoming pitch.
export function detectPitch(data, sampleRate, {minRms=.008,clarity=.88,minHz=75}={}) {
  let energy = 0; for (const x of data) energy += x*x;
  const rms = Math.sqrt(energy/data.length);
  if(rms < minRms) return {rms, hz:null};
  const min = Math.floor(sampleRate/1000), max = Math.min(Math.floor(sampleRate/minHz), data.length/2);
  const correlations = new Float32Array(max+1);
  for(let lag=min;lag<=max;lag++) {
    let cross=0,a=0,b=0;
    for(let i=0;i<data.length-max;i++){cross+=data[i]*data[i+lag];a+=data[i]**2;b+=data[i+lag]**2;}
    correlations[lag]=cross/Math.sqrt(a*b || 1);
  }
  // The best peak must pass the clarity gate; the first peak close to it is the period, not an octave below.
  const peaks=[];
  for(let lag=min+1;lag<max;lag++) if(correlations[lag]>0 && correlations[lag]>correlations[lag-1] && correlations[lag]>=correlations[lag+1])peaks.push(lag);
  const best=Math.max(0,...peaks.map(lag=>correlations[lag]));
  if(best<=clarity)return {rms,hz:null};
  for(const lag of peaks) if(correlations[lag]>=best*.9) {
    const left=correlations[lag-1],mid=correlations[lag],right=correlations[lag+1];
    const shift=(left-right)/(2*(left-2*mid+right)||1);
    return {rms,hz:sampleRate/(lag+shift)};
  }
  return {rms,hz:null};
}
export class PulseTracker {
  constructor(){this.reset();}
  reset(){this.minGap=.24;this.events=[];this.floor=.01;this.last=-10;this.bpm=null;this.onset=false;this.previous=0;this.armed=true;}
  update(rms,t,threshold){
    const gate=Math.max(threshold,this.floor*1.5);
    // A sustained bass note must decay before it can trigger again.
    if(rms<gate*.75 || rms<this.previous*.7)this.armed=true;
    const onset=this.armed && rms>gate && rms>this.previous*1.12 && t-this.last>this.minGap;
    this.onset=onset;
    this.previous=rms;
    if(onset)this.armed=false;
    this.floor=this.floor*.92+rms*.08;
    if(onset){this.last=t;this.events.push(t);this.events=this.events.slice(-12);}
    this.events=this.events.filter(e=>t-e<10);
    const intervals=this.events.slice(1).map((e,i)=>e-this.events[i]).filter(i=>i>=.3&&i<=1.5);
    this.bpm=null;
    if(intervals.length>=4){const sorted=[...intervals].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];const stable=intervals.filter(i=>Math.abs(i-median)<median*.18);if(stable.length>=intervals.length*.7)this.bpm=Math.round(60/(stable.reduce((a,b)=>a+b,0)/stable.length));}
    return this.bpm;
  }
}

// FFT magnitudes are in dB. Only the bass band contributes to the pulse envelope.
export function bandEnergy(spectrum, sampleRate, fftSize, low, high) {
  const first=Math.max(1,Math.ceil(low*fftSize/sampleRate));
  const last=Math.min(spectrum.length-1,Math.floor(high*fftSize/sampleRate));
  let power=0;
  for(let i=first;i<=last;i++) power+=10**(spectrum[i]/10);
  return Math.sqrt(power);
}

export const bassEnergy=(spectrum,rate,size)=>bandEnergy(spectrum,rate,size,35,220);

// Only the melody makes notes; the bass is filtered out before its pitch is read.
export const listening={low:35,high:8000,melody:[220,8000]};
export class NoteTracker {
  constructor(){this.reset();}
  reset(){this.minGap=.18;this.candidate=null;this.frames=0;this.lastPitch=null;this.melodyAt=-10;this.lane=1;}
  // Returns the notes this frame makes: a melody attack or a pitch change.
  update(hz,onset,t){
    const midi=hz?Math.round(69+12*Math.log2(hz/440)):null;
    if(midi===null){this.candidate=null;this.frames=0;}
    else if(this.candidate===midi)this.frames++;
    else{this.candidate=midi;this.frames=1;}
    const pitchChanged=midi!==null&&this.frames>=2&&midi!==this.lastPitch;
    if(midi===null||!(pitchChanged||onset)||t-this.melodyAt<this.minGap)return [];
    // The contour walks the frets: a step moves one fret, a leap of a fourth or more moves two, repeats stay.
    if(this.lastPitch!==null&&midi!==this.lastPitch){const leap=Math.abs(midi-this.lastPitch)>=5?2:1;this.lane=Math.max(0,Math.min(2,this.lane+Math.sign(midi-this.lastPitch)*leap));}
    this.lastPitch=midi;this.melodyAt=t;
    return [{lane:this.lane,midi}];
  }
}
