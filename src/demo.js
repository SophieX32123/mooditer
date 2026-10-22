import { analyzeFrame } from './analysis.js';
export const DEMO_TEXTS = {
  positive: [
    'Reuters breaking news: Volunteers celebrate a wonderful success. Families are joyful and grateful for the kindness and generous support of their neighbors.',
    'Instagram followers share likes and comments. I am thrilled and happy! I love my friends and feel grateful for this wonderful celebration.',
    'This music playlist is delightful. I feel joyful and excited, and I love this wonderful movie with its hopeful happy ending.',
    'The document lists the meeting time and the project schedule. The first task begins on Monday and the second task begins on Wednesday.',
    'I was worried and afraid before the presentation. Now it is over, and I feel relieved and grateful for the kind support.',
    'We won! I am absolutely thrilled, delighted, and overjoyed! This wonderful success is everything we hoped for. I cannot stop smiling!',
    'I miss my friend and feel a little sad today. Remembering our happy times together brings comfort, love, and gratitude.'
  ],
  negative: [
    'Reuters breaking news: Families mourn a tragic loss. Residents feel sad and heartbroken, worried and afraid after the dangerous threat.',
    'Instagram followers share likes and comments. I am angry and furious about this cruel betrayal. I feel hurt, lonely, and deeply disappointed.',
    'This movie tells a tragic story of loss and despair. The frightening episode leaves its characters terrified, worried, and heartbroken.',
    'The document lists the meeting time and the project schedule. The first task begins on Monday and the second task begins on Wednesday.',
    'I am terrified about what could happen next. I feel afraid and anxious, and the uncertainty keeps me worried all night.',
    'I am furious! This unfair decision is outrageous. I am angry, frustrated, and offended by how everyone was treated.',
    'I feel lonely and deeply sad. Losing someone I loved has left me heartbroken, and I miss the happy days we shared.'
  ]
};
export async function demoSamples(now = Date.now(), onStatus = () => {}, scenario = 'positive', analyze = analyzeFrame) {
  if (!Object.hasOwn(DEMO_TEXTS, scenario)) throw new Error('Unknown demo scenario');
  // Real model outputs on fictional text; repeated metrics illustrate exposure, not independent observations.
  const analyses=[];
  for (const text of DEMO_TEXTS[scenario]) {
    const result=await analyze(text,94,{onStatus});
    if (!result) throw new Error('Demo text could not be analyzed');
    analyses.push(result);
  }
  const records=[];
  // Different dominant passages per session prevent identical daily averages.
  // Each ten-minute segment has a different mixture; scores themselves are never altered.
  const sessionOrder = scenario === 'positive' ? [3, 0, 4, 5, 6, 1, 2] : [3, 4, 1, 6, 0, 5, 2];
  // Seven complete 30-minute sessions, ending at the same fixed anchor for both scenarios.
  for (let day=6;day>=0;day--) for (let sample=0;sample<360;sample++) {
    const timestamp=now-day*86400000-1800000+sample*5000;
    const sessionIndex=6-day;
    const segment=Math.floor(sample/120);
    const slot=sample%10;
    const dominant=sessionOrder[sessionIndex];
    const secondary=sessionOrder[(sessionIndex+segment+1)%sessionOrder.length];
    const index=slot<7 ? dominant : slot<9 ? secondary : sessionOrder[(sessionIndex+3)%sessionOrder.length];
    records.push({timestamp,...analyses[index]});
  }
  return records;
}
