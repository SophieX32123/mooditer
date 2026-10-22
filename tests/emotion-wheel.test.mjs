import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emotionFractions} from '../src/emotionWheel.js';
test('wheel counts model samples once, separates Mixed and excludes legacy/invalid data',()=>{
 const row=intensity=>({method:'ensemble-lite-v1',intensity});
 const result=emotionFractions([row({anger:.8,fear:.2,joy:.1,sadness:.3}),row({anger:.2,fear:.1,joy:.8,sadness:.3}),row({anger:.4,fear:.39,joy:.1,sadness:.2}),{method:'lexicon-v1'},row({anger:NaN})]);
 assert.deepEqual(result,{counts:{anger:1,fear:0,joy:1,sadness:0,Mixed:1},total:3,excluded:2});
 assert.equal(emotionFractions([]).total,0);
});
