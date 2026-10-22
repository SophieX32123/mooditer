import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {loadGoEmotions} from '../src/goemotions.js';
import {computeFeatures} from '../src/features.js';
import {predict} from '../src/lgbm.js';
const read=async n=>JSON.parse(await readFile(`assets/emotion-v2/${n}.json`,'utf8'));
const [fixtures,spec,signals]=await Promise.all(['parity_fixtures','feature_spec','vader_and_signals'].map(read));
const models=Object.fromEntries(await Promise.all(spec.emotions.map(async e=>[e,await read(`lightgbm_lite_${e}`)])));
import {groups,compare,finish,table} from './parity-metrics.mjs';
const started=performance.now();
const model=await loadGoEmotions({modelPath:path.resolve('assets/emotion-v2/models')+'/',device:'cpu'});
const loadMs=performance.now()-started;
// Approved reference: one text, no padding, 512-token truncation.
for(let i=0;i<fixtures.length;i++){
 const r=fixtures[i], [p]=await model.score([r.text]); const {features,vector}=computeFeatures(r.text,p,spec,signals);
 for(const k of spec.columns) compare(k.startsWith('goemo_')?'goemotions':'vader_signals',r.id,k,features[k],r[k]);
 for(const e of spec.emotions){compare('lgbm',r.id,`pred_${e}`,predict(models[e],spec.columns.map(k=>r[k]),spec.clip),r[`pred_${e}`]);compare('end_to_end',r.id,`pred_${e}`,predict(models[e],vector,spec.clip),r[`pred_${e}`]);}
 if((i+1)%25===0) console.log(`Parity: ${i+1}/${fixtures.length}`);
}
await model.dispose();
finish(fixtures);
await mkdir('test-results/emotion-v2',{recursive:true});
await writeFile('test-results/emotion-v2/parity.json',JSON.stringify({fixtures:fixtures.length,loadMs,groups},null,2));
table();
if(Object.values(groups).some(g=>!g.pass))process.exitCode=1;
