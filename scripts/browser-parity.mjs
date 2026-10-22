import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {computeFeatures} from '../src/features.js';
import {predict} from '../src/lgbm.js';
import {groups,compare,finish,table} from './parity-metrics.mjs';
const read=async n=>JSON.parse(await readFile(`assets/emotion-v2/${n}.json`,'utf8'));
const [fixtures,spec,signals]=await Promise.all(['parity_fixtures','feature_spec','vader_and_signals'].map(read));
const models=Object.fromEntries(await Promise.all(spec.emotions.map(async e=>[e,await read(`lightgbm_lite_${e}`)])));
const extension=path.resolve('dist');
const context=await chromium.launchPersistentContext('',{channel:process.env.MOODITER_BROWSER||'msedge',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
const external=[];
context.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
try {
 await context.setOffline(true);
 const service=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const page=await context.newPage();await page.goto(`chrome-extension://${new URL(service.url()).host}/dashboard.html`);
 const results=await page.evaluate(async texts=>{
  const worker=new Worker(new URL('emotionWorker.js',location.href),{type:'module'});let id=0;const pending=new Map();
  worker.onmessage=({data})=>{if(data.type==='progress')return;const job=pending.get(data.id);if(!job)return;clearTimeout(job.timer);pending.delete(data.id);data.error?job.reject(new Error(data.error)):job.resolve(data.result);};
  worker.onerror=()=>{for(const job of pending.values()){clearTimeout(job.timer);job.reject(new Error('Worker failure'));}pending.clear();};
  const call=(type,texts)=>new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(new Error('Worker timed out'));},120000);pending.set(key,{resolve,reject,timer});worker.postMessage({id:key,type,texts,diagnostics:true});});
  try{
   await call('init');const probabilities=[],predictions=[];
   // Ten blocks per frame request, but each block is inferred alone by the production worker.
   for(let i=0;i<texts.length;i+=10){const r=await call('score',texts.slice(i,i+10));probabilities.push(...r.probabilities);predictions.push(...r.predictions);}
   // Invariance check: score the first input alone after scoring it in a multi-block request.
   const solo=await call('score',[texts[0]]);
   return {probabilities,predictions,solo};
  }finally{worker.terminate();}
 },fixtures.map(r=>r.text));
 for(let i=0;i<fixtures.length;i++){
  const r=fixtures[i],{features}=computeFeatures(r.text,results.probabilities[i],spec,signals);
  for(const k of spec.columns)compare(k.startsWith('goemo_')?'goemotions':'vader_signals',r.id,k,features[k],r[k]);
  for(const e of spec.emotions){compare('lgbm',r.id,`pred_${e}`,predict(models[e],spec.columns.map(k=>r[k]),spec.clip),r[`pred_${e}`]);compare('end_to_end',r.id,`pred_${e}`,results.predictions[i][e],r[`pred_${e}`]);}
 }
 const invariance=Math.max(...spec.goemotions_labels.map(l=>Math.abs(results.solo.probabilities[0][l]-results.probabilities[0][l])));
 finish(fixtures);table();
 const report={browser:context.browser()?.version(),fixtures:fixtures.length,batchSize:1,padding:false,frameCompositionMaxDifference:invariance,externalRequests:external,groups};
 await mkdir('reports/emotion-v2',{recursive:true});await writeFile('reports/emotion-v2/browser-parity-batch1.json',JSON.stringify(report,null,2));
 console.log('Frame composition invariance max difference:',invariance,'External requests:',external.length);
 if(Object.values(groups).some(g=>!g.pass)||invariance>1e-12||external.length)process.exitCode=1;
}finally{await context.close();}
