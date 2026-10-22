import { loadGoEmotions } from './goemotions.js';
import { computeFeatures } from './features.js';
import { predict } from './lgbm.js';

// Defense in depth: dependencies may contain remote-loading code, but this worker
// permits only files packaged under this extension's own origin.
const localFetch=self.fetch.bind(self);
self.fetch=(input,options)=>{
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,self.location.href);
  const own=new URL(self.location.href);
  if(url.protocol!==own.protocol||url.host!==own.host) return Promise.reject(new Error('Remote requests are disabled'));
  return localFetch(input,options);
};
let loading;

async function localJSON(name) {
  const response=await fetch(new URL(`emotion-v2/${name}.json`,self.location.href));
  if(!response.ok) throw new Error(`Missing local asset: ${name}`);
  return response.json();
}
function initialize() {
  return loading ||= (async()=>{
    const start=performance.now();
    const [spec,signals]=await Promise.all([localJSON('feature_spec'),localJSON('vader_and_signals')]);
    const models=Object.fromEntries(await Promise.all(spec.emotions.map(async e=>[e,await localJSON(`lightgbm_lite_${e}`)])));
    const model=await loadGoEmotions({modelPath:new URL('models/',self.location.href).href,wasmPath:new URL('vendor/ort/',self.location.href).href,onProgress:progress=>self.postMessage({type:'progress',progress})});
    return {model,spec,signals,models,loadMs:performance.now()-start};
  })();
}
// Serialize worker jobs; callers reject overlap instead of accumulating captured frames.
let busy=false;
self.onmessage=async ({data:{id,type,texts,diagnostics=false}})=>{
  if(busy) { self.postMessage({id,error:'Emotion worker is busy'}); return; }
  busy=true;
  try {
    const state=await initialize();
    if(type==='init') self.postMessage({id,result:{loadMs:state.loadMs}});
    else if(type==='score') {
      if(!Array.isArray(texts)||texts.length>20||texts.some(t=>typeof t!=='string')) throw new Error('Expected at most 20 text blocks');
      const start=performance.now();
      const probabilities=await state.model.score(texts);
      const predictions=texts.map((text,i)=>{
        const {vector}=computeFeatures(text,probabilities[i],state.spec,state.signals);
        return Object.fromEntries(state.spec.emotions.map(e=>[e,predict(state.models[e],vector,state.spec.clip)]));
      });
      self.postMessage({id,result:{predictions,analysisMs:performance.now()-start,...(diagnostics?{probabilities}:{})}});
    } else throw new Error('Unknown worker operation');
  } catch(error) { self.postMessage({id,error:error.message||String(error)}); }
  finally { busy=false; }
};
