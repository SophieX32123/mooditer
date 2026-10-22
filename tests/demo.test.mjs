import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoSamples, DEMO_TEXTS} from '../src/demo.js';
test('paired demos have identical timestamps and exposure with different passages',async()=>{
 const analyze=async text=>({sentiment:text.includes('joyful')?1:-1,method:'test'});
 const now=Date.UTC(2026,9,21,16);
 const positive=await demoSamples(now,()=>{},'positive',analyze);
 const negative=await demoSamples(now,()=>{},'negative',analyze);
 assert.equal(positive.length,2520);
 assert.deepEqual(positive.map(r=>r.timestamp),negative.map(r=>r.timestamp));
 assert.equal(positive[359].timestamp-positive[0].timestamp+5000,1800000);
 assert.notDeepEqual(positive,negative);
});

test('session averages vary without modifying supplied classifier outputs',async()=>{
 for(const scenario of ['positive','negative']) {
  const analyze=async text=>({sentiment:DEMO_TEXTS[scenario].indexOf(text)/10,method:'test'});
  const rows=await demoSamples(Date.UTC(2026,9,21,16),()=>{},scenario,analyze);
  const means=Array.from({length:7},(_,day)=>rows.slice(day*360,(day+1)*360).reduce((sum,r)=>sum+r.sentiment,0)/360);
  assert.ok(Math.max(...means)-Math.min(...means)>.2);
  assert.ok(rows.every(r=>DEMO_TEXTS[scenario].some((_,i)=>r.sentiment===i/10)));
 }
});
