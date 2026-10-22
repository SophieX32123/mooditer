import { polarityScores } from './vader.js';
export const wordTokens = text => text.match(/@?[A-Za-z][A-Za-z']*/g) || [];
export const variants = word => [...new Set([word,word.replace(/(.)\1{2,}/g,'$1'),word.replace(/(.)\1{2,}/g,'$1$1')])];
export function textSignals(text, spec) {
  const words=wordTokens(text).filter(w=>!['@user','httpurl'].includes(w.toLowerCase()));
  const intensifiers=new Set([...Object.entries(spec.booster_dict).filter(([w,v])=>v>0&&!w.includes(' ')).map(([w])=>w),...spec.extra_intensifiers]);
  let caps=0,intense=0,pos=0,neg=0;
  for(const w of words) {
    if(w.length>=2&&w.toUpperCase()===w&&w.toLowerCase()!==w) caps++;
    const lower=w.toLowerCase(), forms=variants(lower);
    if(forms.some(x=>intensifiers.has(x))) intense++;
    if(!spec.skip_words.includes(lower)) {
      const found=forms.find(x=>Object.hasOwn(spec.lexicon,x)); const v=found===undefined?0:spec.lexicon[found];
      if(v>=spec.valence_threshold) pos++;
      if(v<=-spec.valence_threshold) neg++;
    }
  }
  return {sig_caps_share:words.length?caps/words.length:0,sig_caps_count:caps,sig_intensifier_count:intense,sig_pos_words:pos,sig_neg_words:neg,sig_mixed_valence:pos>0&&neg>0?1:0,sig_n_words:words.length,sig_n_chars:[...text].length};
}
export function computeFeatures(text, probabilities, featureSpec, signalsSpec) {
  const features={...textSignals(text,signalsSpec)};
  for(const [k,v] of Object.entries(polarityScores(text,signalsSpec))) features[`vader_${k}`]=v;
  for(const label of featureSpec.goemotions_labels) {
    if(!Number.isFinite(probabilities[label])) throw new Error(`Missing probability: ${label}`);
    features[`goemo_${label}`]=probabilities[label];
  }
  for(const [group,labels] of Object.entries(featureSpec.ekman_groups)) {
    features[`goemo_grp_${group}`]=labels.reduce((sum,l)=>sum+probabilities[l],0);
    features[`goemo_grpmax_${group}`]=Math.max(...labels.map(l=>probabilities[l]));
  }
  const vector=featureSpec.columns.map(k=>{if(!Number.isFinite(features[k])) throw new Error(`Unsupported feature: ${k}`);return features[k];});
  return {features,vector};
}
