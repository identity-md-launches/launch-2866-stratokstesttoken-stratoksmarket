// Pure, bounded experimental input. The local model cannot create actions or change physics.
export const LLM_BONUS = 0.5;
export function actionSignature(step) {
  return JSON.stringify(Object.fromEntries(Object.keys(step).sort().map(k => [k, step[k]])));
}
export function usableAdvice(c, tick, enabled) {
  const a = c.mind.localModel?.pending;
  if (!enabled || !a || a.status !== 'pending' || tick < a.receivedTick || tick > a.expiresTick) return null;
  if (Math.max(Math.abs(c.x-a.position.x),Math.abs(c.y-a.position.y)) > 3) return null;
  if (['hunger','thirst','energy','warmth','health'].some(k=>Math.abs(c[k]-a.needs[k])>20)) return null;
  return a;
}
export function finishAdvice(c, advice, tick, matched, selected) {
  if (!advice) return;
  advice.status = matched ? (selected ? 'selected' : 'considered') : 'unavailable';
  advice.decisionTick = tick;
  const entry = {...advice}; delete entry.signature; delete entry.needs; delete entry.position;
  const m=c.mind.localModel; m.history=[...(m.history??[]),entry].slice(-6); m.pending=null;
}
