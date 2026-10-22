let worker,ready,nextId=0,busy=false;
const pending=new Map();
let progress=()=>{};
function fail(error) {
  worker?.terminate(); worker=null; ready=null;
  for(const {reject,timer} of pending.values()) {clearTimeout(timer);reject(error);}
  pending.clear();
}
function request(type,texts) {
  return new Promise((resolve,reject)=>{
    const id=++nextId;
    const timer=setTimeout(()=>fail(new Error('Local emotion model timed out')),120000);
    pending.set(id,{resolve,reject,timer});
    worker.postMessage({id,type,texts});
  });
}
export function initializeEmotionModel(onStatus=()=>{}) {
  progress=onStatus;
  if(!ready) {
    onStatus('Loading the emotion model…');
    ready=(async()=>{
      worker=new Worker(new URL('emotionWorker.js',location.href),{type:'module'});
      worker.onmessage=({data})=>{
        if(data.type==='progress') { progress(`Loading the emotion model… ${data.progress.status || ''}`); return; }
        const job=pending.get(data.id); if(!job) return;
        clearTimeout(job.timer); pending.delete(data.id);
        if(data.error) job.reject(new Error(data.error)); else job.resolve(data.result);
      };
      worker.onerror=event=>{event.preventDefault();fail(new Error('Local emotion worker failed'));};
      worker.onmessageerror=()=>fail(new Error('Invalid emotion worker response'));
      return request('init');
    })().catch(error=>{fail(error);throw error;});
  }
  return ready;
}
export async function scoreBlocks(texts,onStatus) {
  await initializeEmotionModel(onStatus);
  if(busy) throw new Error('Emotion analysis is already in progress');
  busy=true;
  try { return (await request('score',texts)).predictions; }
  finally { busy=false; }
}
