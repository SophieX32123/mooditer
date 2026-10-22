import { EMOTIONS, CONTENT_TYPES, INTENSITY_EMOTIONS } from './analysis.js';
export function bucketStart(timestamp, interval) {
  const date = new Date(timestamp);
  if (interval === 'hour') date.setMinutes(0, 0, 0);
  else {
    date.setHours(0, 0, 0, 0);
    if (interval === 'week') date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  }
  return date.getTime();
}
export function summarize(records) {
  const emotions = Object.fromEntries(EMOTIONS.map(key => [key, 0]));
  const types = Object.fromEntries(CONTENT_TYPES.map(key => [key, 0]));
  let sum = 0, emotionalSamples = 0;
  for (const item of records) {
    sum += item.sentiment;
    types[item.contentType] = (types[item.contentType] || 0) + 1;
    if (Object.values(item.emotions || {}).some(value => value > 0)) emotionalSamples++;
    for (const key of EMOTIONS) emotions[key] += item.emotions?.[key] || 0;
  }
  for (const key of EMOTIONS) emotions[key] = emotionalSamples ? emotions[key] / emotionalSamples : 0;
  const modelRecords=records.filter(r=>r.method==='ensemble-lite-v1');
  const intensity=Object.fromEntries(INTENSITY_EMOTIONS.map(e=>[e,modelRecords.length?modelRecords.reduce((s,r)=>s+r.intensity[e],0)/modelRecords.length:null]));
  const peak=Object.fromEntries(INTENSITY_EMOTIONS.map(e=>[e,modelRecords.length?modelRecords.reduce((peak,r)=>Math.max(peak,r.peak[e]),0):null]));
  const blocks=modelRecords.reduce((s,r)=>s+r.blocks,0);
  const methods=[...new Set(records.map(r=>r.method || 'lexicon-v1'))];
  return { intensity, peak, blocks, modelSamples:modelRecords.length, legacySamples:records.length-modelRecords.length, method:methods.join(' + '), count: records.length, sentiment: records.length ? sum / records.length : null, emotions, types, emotionalSamples };
}
export function aggregate(records, interval) {
  const buckets = new Map();
  for (const item of records) {
    const key = bucketStart(item.timestamp, interval);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }
  return [...buckets].sort((a, b) => a[0] - b[0]).map(([timestamp, rows]) => ({ timestamp, ...summarize(rows) }));
}

// Export/activity rows remain separate even when methods coexist in the same time bucket.
export function aggregateByMethod(records, interval) {
  const methods=[...new Set(records.map(r=>r.method || 'lexicon-v1'))];
  return methods.flatMap(method=>aggregate(records.filter(r=>(r.method || 'lexicon-v1')===method),interval)).sort((a,b)=>a.timestamp-b.timestamp||a.method.localeCompare(b.method));
}
