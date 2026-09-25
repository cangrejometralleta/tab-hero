import {t} from './i18n.js';
// Consecutive strikes climb this ladder; the last step repeats.
export function strikeText(streak){const strikes=t('strikes');return strikes[Math.min(streak,strikes.length)-1];}
export function milestoneText(combo){return t('milestones')[combo]??(combo>100&&combo%100===0?t('hundreds',{n:combo}):null);}
