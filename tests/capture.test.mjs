import test from 'node:test';
import assert from 'node:assert/strict';
import { CaptureSession } from '../src/capture.js';
globalThis.location = { href: 'http://localhost/dashboard.html' };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function setup(workerFactory, media) {
  const state = { stopped: 0, ended: 0, samples: [], errors: [] };
  const track = { stop() { state.stopped++; }, addEventListener(name, callback) { state.trackEnded = callback; }, muted: false };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  const video = { play: async () => {}, pause() {}, readyState: 2, videoWidth: 100, videoHeight: 100 };
  const canvas = { getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/png;base64,FAKE' };
  const session = new CaptureSession({ video, canvas, onSample: async sample => { state.samples.push(sample); }, onStatus() {}, onEnd() { state.ended++; }, onError(error) { state.errors.push(error); }, workerFactory, mediaDevices: media || { getDisplayMedia: async () => stream } });
  return { session, state, stream };
}
test('Stop discards in-flight OCR and releases media immediately', async () => {
  const pending = deferred(); let terminated = 0;
  const { session, state } = setup(async () => ({ setParameters: async () => {}, recognize: () => pending.promise, terminate: () => { terminated++; } }));
  await session.start(); session.stop();
  assert.equal(state.stopped, 1); assert.equal(terminated, 1);
  pending.resolve({ data: { text: 'I love this excellent wonderful experience', confidence: 95 } });
  await new Promise(r => setTimeout(r, 0));
  assert.equal(state.samples.length, 0);
});
test('late picker response after Stop closes its stream', async () => {
  const pending = deferred();
  const { session, state, stream } = setup(async () => { throw new Error('Must not initialize'); }, { getDisplayMedia: () => pending.promise });
  const starting = session.start(); session.stop(); pending.resolve(stream); await starting;
  assert.equal(state.stopped, 1); assert.equal(state.errors.length, 0);
});
test('late OCR initialization after Stop terminates the worker', async () => {
  const pending = deferred(); let terminated = 0;
  const { session, state } = setup(() => pending.promise);
  const starting = session.start(); await new Promise(r => setTimeout(r, 0)); session.stop();
  pending.resolve({ terminate: () => { terminated++; } }); await starting;
  assert.equal(terminated, 1); assert.equal(state.samples.length, 0);
});
test('overlapping ticks do not queue OCR jobs; browser Stop sharing ends session', async () => {
  const pending = deferred(); let recognized = 0;
  const { session, state } = setup(async () => ({ setParameters: async () => {}, recognize: () => { recognized++; return pending.promise; }, terminate() {} }));
  await session.start(); await session.sample(session.generation); await session.sample(session.generation);
  assert.equal(recognized, 1);
  state.trackEnded(); assert.equal(session.active, false);
  pending.resolve({ data: { text: 'the page has several words', confidence: 90 } });
});

test('Stop during model inference discards late result and busy ticks do not queue',async()=>{
 const pending=deferred();let calls=0;
 const {session,state}=setup(async()=>({setParameters:async()=>{},recognize:async()=>({data:{text:'The people here are happy',confidence:95}}),terminate(){}}));
 session.initializeModel=async()=>{};
 session.analyzer=()=>{calls++;return pending.promise;};
 await session.start();await new Promise(r=>setTimeout(r,0));
 await session.sample(session.generation);assert.equal(calls,1);
 session.stop();pending.resolve({method:'ensemble-lite-v1',blocks:1});await new Promise(r=>setTimeout(r,0));
 assert.equal(state.samples.length,0);assert.equal(state.stopped,1);
});
test('Stop during model loading releases capture and never starts sampling',async()=>{
 const pending=deferred();let calls=0;
 const {session,state}=setup(async()=>({setParameters:async()=>{},recognize:async()=>{calls++;},terminate(){}}));
 session.initializeModel=()=>pending.promise;
 const starting=session.start();await new Promise(r=>setTimeout(r,0));session.stop();pending.resolve();await starting;
 assert.equal(calls,0);assert.equal(state.stopped,1);
});
