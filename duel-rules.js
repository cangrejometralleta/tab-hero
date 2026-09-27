// A duel is scored against the beat: timing sets the grade, consecutive STRIKEs set the multiplier.
export const strikeWindow=.09,goodWindow=.18,reach=150,maxHp=250,tabDelay=2.2;
export function grade(offset){const d=Math.abs(offset);return d<=strikeWindow?'strike':d<=goodWindow?'good':'off';}
// Beats are arrival times, from the metronome grid or from a tab's onsets heard 2.2 s ahead.
export function nearestBeat(times,time){let index=-1,offset=Infinity;times.forEach((at,i)=>{if(Math.abs(time-at)<Math.abs(offset)){index=i;offset=time-at;}});return {index,offset};}
// Every 4 STRIKEs in a row add one step, up to ×4.
export const multiplier=chain=>Math.min(4,1+Math.floor(chain/4));
export function strikeOutcome(g,chain){
  if(g==='off')return {chain:0,damage:0,points:0};
  const next=g==='strike'?chain+1:0,m=multiplier(next);
  return {chain:next,damage:(g==='strike'?8:5)*m,points:(g==='strike'?100:50)*m};
}
// Each step of the multiplier makes the rival faster, bolder and harder-hitting.
export const difficulty=m=>({bpm:100+(m-1)*10,aggression:.6+(m-1)*.1,damage:16+(m-1)*4});
// A bout goes to whoever has more health left; equal health is a draw.
export const boutWinner=(player,enemy)=>player>enemy?'player':enemy>player?'enemy':'draw';
// Out of reach an on-beat cut throws an energy wave: weaker than the blade and it never grows the chain, so closing in pays.
export const waveShare=.4;
export function waveOutcome(g,chain){
  if(g==='off')return {chain:0,damage:0,points:0};
  const m=multiplier(chain);return {chain:g==='strike'?chain:0,damage:Math.max(2,Math.round((g==='strike'?8:5)*m*waveShare)),points:(g==='strike'?40:20)*m};
}
// A rival ahead on health presses in; one behind keeps its distance and trusts its ki.
export function rivalIntent(rivalHp,playerHp){
  const lead=(rivalHp-playerHp)/maxHp,clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  return {approach:clamp(.7+lead*1.5,.2,.95),retreat:clamp(.1-lead*1.5,.05,.6)};
}
// The rival parries some blade cuts: sloppy GOOD cuts more often, and more as the multiplier climbs.
export const rivalParry=(g,m)=>Math.min(.7,(g==='strike'?.2:.35)+(m-1)*.1);
