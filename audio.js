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
  for(let lag=min+1;lag<max;lag++) if(correlations[lag]>clarity && correlations[lag]>correlations[lag-1] && correlations[lag]>=correlations[lag+1]) {
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

// Bass and melody are separate voices: bass attacks own the left fret, melody the other two.
export const listening={low:35,high:8000,bass:[35,220],melody:[220,8000]};
export class NoteTracker {
  constructor(){this.reset();}
  reset(){this.minGap=.24;this.candidate=null;this.frames=0;this.lastPitch=null;this.bassAt=-10;this.melodyAt=-10;this.lane=2;}
  // Returns the notes this frame makes: a bass attack, a melody attack or pitch change, or both.
  update(hz,melodyOnset,bassOnset,t){
    const made=[];
    if(bassOnset&&t-this.bassAt>=this.minGap){this.bassAt=t;made.push({lane:0,midi:null});}
    const midi=hz?Math.round(69+12*Math.log2(hz/440)):null;
    if(midi===null){this.candidate=null;this.frames=0;}
    else if(this.candidate===midi)this.frames++;
    else{this.candidate=midi;this.frames=1;}
    const pitchChanged=midi!==null&&this.frames>=2&&midi!==this.lastPitch;
    if(midi!==null&&(pitchChanged||melodyOnset)&&t-this.melodyAt>=this.minGap){
      // The melody's contour picks the fret: falling goes middle, rising goes right, repeats stay put.
      if(this.lastPitch!==null&&midi!==this.lastPitch)this.lane=midi>this.lastPitch?2:1;
      this.lastPitch=midi;this.melodyAt=t;made.push({lane:this.lane,midi});
    }
    return made;
  }
}
