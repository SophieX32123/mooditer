import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {computeFeatures,textSignals} from '../src/features.js';
import {predict} from '../src/lgbm.js';
import {segment} from '../src/segment.js';
const read=n=>JSON.parse(readFileSync(`assets/emotion-v2/${n}.json`));
const fixtures=read('parity_fixtures'), spec=read('feature_spec'), signals=read('vader_and_signals');
test('all 200 Python VADER and text-signal fixture columns agree within 1e-6',()=>{
  const failures=[];
  for(const r of fixtures){ const p=Object.fromEntries(spec.goemotions_labels.map(l=>[l,r[`goemo_${l}`]])); const {features}=computeFeatures(r.text,p,spec,signals);
    for(const k of spec.columns.filter(k=>/^(vader|sig)_/.test(k))) if(Math.abs(features[k]-r[k])>1e-6) failures.push({id:r.id,column:k,actual:features[k],expected:r[k]}); }
  assert.deepEqual(failures,[]);
});
test('four LightGBM models reproduce all 200 fixture predictions within 1e-6',()=>{
  for(const e of spec.emotions){const model=read(`lightgbm_lite_${e}`); for(const r of fixtures) assert.ok(Math.abs(predict(model,spec.columns.map(k=>r[k]))-r[`pred_${e}`])<=1e-6,`${r.id}: ${e}`);}
});
test('LightGBM honors missing direction and Zero versus NaN semantics',()=>{
  const m=type=>({objective:'regression',tree_info:[{tree_structure:{split_feature:0,threshold:.2,decision_type:'<=',missing_type:type,default_left:false,left_child:{leaf_value:.1},right_child:{leaf_value:.9}}}]});
  assert.equal(predict(m('NaN'),[NaN]),.9); assert.equal(predict(m('None'),[NaN]),.1); assert.equal(predict(m('Zero'),[0]),.9); assert.equal(predict(m('None'),[0]),.1);
});
test('segmentation joins lines, drops short blocks, deduplicates, chunks and caps longest',()=>{
  assert.deepEqual(segment('one two\nthree four\n\nshort\n\none two three four'),['one two three four']);
  const long=Array.from({length:130},(_,i)=>`word${i}`).join(' '); const chunks=segment(long); assert.equal(chunks.length,3); assert.ok(chunks.every(c=>(c.match(/word/g)||[]).length<=60));
  const many=Array.from({length:25},(_,i)=>`${'word '.repeat(i+4)}end${i}`).join('\n\n'); const selected=segment(many); assert.equal(selected.length,20); assert.ok(selected[0].endsWith('end5'));
});
test('signals count Unicode code points and ignore user/url placeholders',()=>{
 const r=textSignals('@USER httpurl SOOO GOOD 😀',signals); assert.equal(r.sig_n_words,2); assert.equal(r.sig_caps_count,2); assert.equal(r.sig_n_chars,25);
});

import {analyzeFrame,analyzeText} from '../src/analysis.js';
import {summarize,aggregateByMethod} from '../src/aggregate.js';
test('frame analysis batches blocks, stores means/peaks only, and applies quality gates',async()=>{
 let calls=0;
 const score=async blocks=>{calls++;assert.equal(blocks.length,2);return [{anger:.8,fear:.1,joy:.2,sadness:.3},{anger:.2,fear:.4,joy:.3,sadness:.1}];};
 const frame=await analyzeFrame('The people are angry today\n\nWe are celebrating with friends',90,{score});
 assert.equal(calls,1); assert.equal(frame.blocks,2);assert.equal(frame.intensity.anger,.5);assert.equal(frame.peak.anger,.8);assert.equal(frame.dominantEmotion,'anger');
 assert.deepEqual(Object.keys(frame).sort(),['sentiment','contentType','wordCount','ocrConfidence','method','intensity','peak','blocks','dominantEmotion'].sort());
 assert.equal(await analyzeFrame('only three words',90,{score}),null); assert.equal(await analyzeFrame('The people are angry today',20,{score}),null); assert.equal(calls,1);
});
test('model errors and malformed outputs fall back with visible status; close scores are Mixed',async()=>{
 const text='The people are happy today';const status=[];
 for(const score of [async()=>{throw new Error('missing model');},async()=>[{anger:NaN}]]) {
   const row=await analyzeFrame(text,95,{score,onStatus:s=>status.push(s)});assert.deepEqual(row,analyzeText(text,95));
 }
 assert.equal(status.length,2);assert.ok(status.every(s=>s.includes('lexicon-v1 fallback')));
 const row=await analyzeFrame(text,95,{score:async()=>[{anger:.5,fear:.49,joy:.2,sadness:.1}]});assert.equal(row.dominantEmotion,'Mixed');
});
test('aggregation separates old shares and model intensities and exports method-specific buckets',()=>{
 const old={timestamp:100,...analyzeText('The people are happy today')};
 const modern={timestamp:200,method:'ensemble-lite-v1',sentiment:.4,contentType:'Other',intensity:{anger:.2,fear:.3,joy:.4,sadness:.1},peak:{anger:.5,fear:.6,joy:.7,sadness:.3},blocks:4};
 const result=summarize([old,modern]);assert.equal(result.modelSamples,1);assert.equal(result.legacySamples,1);assert.equal(result.emotions.Happiness,1);assert.equal(result.intensity.joy,.4);assert.equal(result.peak.joy,.7);assert.equal(result.blocks,4);
 assert.equal(aggregateByMethod([old,modern],'hour').length,2);assert.equal(summarize([old]).intensity.joy,null);
});
