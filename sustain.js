export function holdState(note,time,pressed){
  if(time>=note.at+note.duration-Math.min(.2,note.duration*.4))return 'complete';
  return pressed?'holding':'broken';
}
export function extendSustain(note,time,midi){
  if(!note||midi===null||midi!==note.sourcePitch)return false;
  const duration=Math.min(1.5,time-note.sourceAt);
  if(duration>=.35)note.duration=duration;
  return duration<1.5;
}
