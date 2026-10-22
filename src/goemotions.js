import { env, AutoTokenizer, AutoModelForSequenceClassification } from '@huggingface/transformers';
export async function loadGoEmotions({modelPath,wasmPath,device='wasm',onProgress=()=>{}}) {
  env.allowRemoteModels=false;
  env.allowLocalModels=true;
  env.localModelPath=modelPath;
  env.useBrowserCache=false;
  env.useFSCache=false;
  env.backends.onnx.wasm.numThreads=1;
  env.backends.onnx.wasm.proxy=false;
  if(wasmPath) env.backends.onnx.wasm.wasmPaths=wasmPath;
  const options={local_files_only:true,progress_callback:onProgress};
  const tokenizer=await AutoTokenizer.from_pretrained('goemotions',options);
  const model=await AutoModelForSequenceClassification.from_pretrained('goemotions',{...options,dtype:'q8',device});
  const labels=Array.from({length:28},(_,i)=>model.config.id2label[i]);
  if(labels.some(l=>typeof l!=='string')||new Set(labels).size!==28) throw new Error('Expected 28 distinct GoEmotions labels');
  return {
    async score(texts) {
      if(!texts.length) return [];
      // Dynamic int8 activation scales must see only one unpadded text.
      // A frame still uses one worker request; inference inside it is sequential.
      const results=[];
      for(const text of texts) {
        const encoded=tokenizer(text,{padding:false,truncation:true,max_length:512});
        const inputs={input_ids:encoded.input_ids,attention_mask:encoded.attention_mask};
        for(const [name,input] of Object.entries(inputs)) {
          if(input.type!=='int64'||input.dims[0]!==1) throw new Error(`Expected batch-one int64 ${name}`);
        }
        const output=await model(inputs);
        const rows=output.logits.tolist();
        if(rows.length!==1||rows[0].length!==28) throw new Error('Unexpected model output shape');
        results.push(Object.fromEntries(labels.map((label,i)=>[label,1/(1+Math.exp(-rows[0][i]))])));
      }
      return results;
    },
    dispose:()=>model.dispose()
  };
}
