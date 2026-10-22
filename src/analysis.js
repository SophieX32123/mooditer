import { segment } from './segment.js';
import { scoreBlocks } from './emotionClient.js';
import Sentiment from 'sentiment';
const sentiment = new Sentiment();
export const EMOTIONS = ['Happiness', 'Sadness', 'Anger', 'Fear', 'Disgust', 'Surprise'];
export const CONTENT_TYPES = ['News', 'Social media', 'Work & study', 'Entertainment', 'Shopping', 'Other'];
const lexicons = {
  Happiness: 'happy happiness joy joyful delighted delight wonderful excellent love loved loving celebrate celebration excited exciting grateful gratitude smile smiling cheerful pleased success successful amazing enjoy enjoyed fun fantastic thrilled',
  Sadness: 'sad sadness unhappy sorrow grief grieving mourn mourning lonely loneliness depressed depression crying cried tears tragic tragedy heartbreak heartbroken miserable despair disappointed disappointment loss',
  Anger: 'angry anger rage furious fury outrage outraged hate hatred hostile hostility enraged annoyed annoying frustration frustrated resentment resent furious infuriating',
  Fear: 'fear fearful afraid scared scary terrified terror terrifying anxious anxiety worried worry worrying panic danger dangerous threat threatening threatened dread frightening horror',
  Disgust: 'disgust disgusting disgusted revolting repulsive repulsed nauseating vile gross filthy nasty sickening loathsome contempt foul repugnant',
  Surprise: 'surprise surprised surprising unexpected unexpectedly astonished astonishing amazed amazement stunned startling unbelievable wow shocking shocked astounding'
};
const emotionSets = Object.fromEntries(Object.entries(lexicons).map(([key, value]) => [key, new Set(value.split(' '))]));
const contentRules = {
  News: [/\bbreaking news\b/i, /\breuters\b/i, /\bassociated press\b/i, /\bheadlines?\b/i, /\breporters?\b/i, /\bcorrespondent\b/i, /\bpublished\b/i, /\beditorial\b/i, /\bworld news\b/i],
  'Social media': [/\b(retweet|repost|upvote)s?\b/i, /\bfollowers\b/i, /\bfollowing\b/i, /\b(instagram|reddit|tiktok|facebook)\b/i, /\blikes\b/i, /\bcomments\b/i, /\bshare post\b/i, /\bsubreddit\b/i],
  'Work & study': [/\b(inbox|spreadsheet|assignment|syllabus|lecture|homework|repository|pull request|meeting|deadline|project|document|research|abstract)\b/gi],
  Entertainment: [/\b(episode|playlist|streaming|netflix|spotify|movie|gameplay|lyrics|trailer|music|podcast)\b/gi],
  Shopping: [/\b(add to cart|checkout|free shipping|buy now|shopping cart|product details|in stock|order total)\b/gi]
};
export function analyzeText(text, confidence = 100) {
  const tokens = text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
  if (tokens.length < 4 || confidence < 35) return null;
  const result = sentiment.analyze(text);
  // Saturating normalization of AFINN valence; an estimate, not a calibrated probability.
  const score = result.score / Math.sqrt(result.score ** 2 + 15);
  const emotions = Object.fromEntries(EMOTIONS.map(name => [name, 0]));
  tokens.forEach((token, i) => {
    const negated = tokens.slice(Math.max(0, i - 3), i).some(t => ['not', 'never', 'no', "isn't", "don't", "wasn't"].includes(t));
    if (!negated) for (const name of EMOTIONS) if (emotionSets[name].has(token)) emotions[name]++;
  });
  const total = Object.values(emotions).reduce((a, b) => a + b, 0);
  const maximum = Math.max(...Object.values(emotions));
  const winners = EMOTIONS.filter(name => emotions[name] === maximum);
  for (const name of EMOTIONS) emotions[name] = total ? emotions[name] / total : 0;
  const ranked = Object.entries(contentRules).map(([name, patterns]) => [name, patterns.reduce((sum, p) => sum + (text.match(p)?.length || 0), 0)]).sort((a, b) => b[1] - a[1]);
  const contentType = ranked[0][1] > 0 && ranked[0][1] > ranked[1][1] ? ranked[0][0] : 'Other';
  return { sentiment: score, emotions, dominantEmotion: !total ? 'No clear emotion' : winners.length === 1 ? winners[0] : 'Mixed', contentType, wordCount: tokens.length, ocrConfidence: Math.round(confidence), method: 'lexicon-v1' };
}

export const INTENSITY_EMOTIONS = ['anger', 'fear', 'joy', 'sadness'];
export const INTENSITY_NOTE = 'Intensities are estimates (0 to 1) of how strongly on-screen text expresses each emotion, from a model trained on human-rated posts. They describe content, not your feelings. Text without clear emotion may not score near zero, so compare emotions with each other.';
export function strongestIntensity(intensity) {
  const ranked=Object.entries(intensity).sort((a,b)=>b[1]-a[1]);
  return ranked[0][1]-ranked[1][1]<.02?'Mixed':ranked[0][0];
}
export async function analyzeFrame(text, confidence=100, {score=scoreBlocks,onStatus=()=>{}}={}) {
  const legacy=analyzeText(text,confidence);
  if(!legacy) return null;
  const blocks=segment(text);
  if(!blocks.length) return null;
  try {
    const predictions=await score(blocks,onStatus);
    if(predictions.length!==blocks.length||predictions.some(p=>INTENSITY_EMOTIONS.some(e=>!Number.isFinite(p[e])||p[e]<0||p[e]>1))) throw new Error('Invalid emotion predictions');
    const intensity=Object.fromEntries(INTENSITY_EMOTIONS.map(e=>[e,predictions.reduce((s,p)=>s+p[e],0)/blocks.length]));
    const peak=Object.fromEntries(INTENSITY_EMOTIONS.map(e=>[e,Math.max(...predictions.map(p=>p[e]))]));
    const {sentiment,contentType,wordCount,ocrConfidence}=legacy;
    return {sentiment,contentType,wordCount,ocrConfidence,method:'ensemble-lite-v1',intensity,peak,blocks:blocks.length,dominantEmotion:strongestIntensity(intensity)};
  } catch(error) {
    onStatus(`Emotion model unavailable; using lexicon-v1 fallback. ${error.message}`);
    return legacy;
  }
}
