import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
let context, page, extensionId;
test.beforeAll(async () => {
  const extension = path.resolve('dist');
  context = await chromium.launchPersistentContext('', { channel: process.env.MOODITER_BROWSER || 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent('serviceworker');
  extensionId = new URL(worker.url()).host;
});
test.afterAll(async () => { await context?.close(); });
test('installs, renders real empty state, demo groupings, CSV, and responsive layout', async () => {
  page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#samples')).toHaveText('0');
  await expect(page.locator('#chart')).toContainText('Start tracking');
  await page.locator('#demo').click();
  await expect(page.locator('#demo-banner')).toBeVisible({timeout:120000});
  await expect(page.locator('#chart svg')).toBeVisible();
  await expect(page.locator('#emotion-wheel svg')).toBeVisible();
  await expect(page.locator('#emotion-wheel li')).toHaveCount(5);
  await expect(page.locator('#emotion-wheel')).toContainText('Mixed:');
  await page.getByRole('button', { name: 'Day', exact: true }).click();
  const days = await page.locator('#history-rows tr').count(); expect(days).toBeGreaterThan(1);
  await expect(page.locator('#chart-mode')).toHaveValue('sentiment');
  await expect(page.locator('#types svg')).toBeVisible();
  await expect(page.locator('#types li')).toHaveCount(6);
  await page.locator('#chart-mode').selectOption('emotions');
  const curves=await page.locator('#chart circle').evaluateAll(points=>{
    const groups={};for(const p of points)(groups[p.getAttribute('fill')]??=[]).push(Number(p.getAttribute('cy')));
    return Object.values(groups).map(ys=>Math.max(...ys)-Math.min(...ys));
  });
  expect(curves.length).toBe(4);
  expect(curves.filter(range=>range>1).length).toBeGreaterThanOrEqual(2);

  await page.getByRole('button', { name: 'Week', exact: true }).click();
  expect(await page.locator('#history-rows tr').count()).toBeLessThan(days);
  await page.locator('#history-rows summary').first().click();
  await expect(page.locator('#history-rows details').first()).toContainText('joy');
  const download = page.waitForEvent('download'); await page.locator('#export').click();
  expect((await download).suggestedFilename()).toContain('demo-positive-week');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole('button', { name: 'Hour', exact: true }).click();
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  const positiveSentiment=Number(await page.locator('#sentiment').textContent());
  const positiveCount=await page.locator('#samples').textContent();
  await page.locator('#demo-scenario').selectOption('negative');
  await expect(page.locator('#demo-scenario')).toBeEnabled({timeout:120000});
  expect(Number(await page.locator('#sentiment').textContent())).toBeLessThan(positiveSentiment);
  await expect(page.locator('#samples')).toHaveText(positiveCount);
  await page.locator('#exit-demo').click(); await expect(page.locator('#samples')).toHaveText('0');
  await page.reload(); await expect(page.locator('#samples')).toHaveText('0');
  expect(errors).toEqual([]);
});
test('real offline OCR runs through capture pipeline, persists metrics, and stops', async () => {
  page = await context.newPage(); const errors = [], externalRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  context.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await expect(page.locator('#start')).toBeEnabled();
  await context.setOffline(true);
  // Substitute only the consented media stream with a canvas stream; OCR and storage stay real.
  await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 350;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1200, 350); ctx.fillStyle = 'black'; ctx.font = '34px Arial';
    ctx.fillText('Reuters breaking news: A wonderful success.', 30, 70);
    ctx.fillText('Happy people celebrate this excellent project.', 30, 130);
    ctx.fillText('We are joyful and grateful for this amazing day.', 30, 190);
    window.testCanvas = canvas;
    window.testDrawTimer = setInterval(() => { ctx.fillStyle = 'white'; ctx.fillRect(0, 300, 10, 10); }, 100);
    navigator.mediaDevices.getDisplayMedia = async () => canvas.captureStream(1);
  });
  await page.locator('#start').click();
  try { await expect(page.locator('#samples')).not.toHaveText('0', { timeout: 120000 }); }
  catch (error) {
    console.log('Capture diagnostic:', await page.locator('#tracking-detail').textContent(), await page.locator('#error').textContent(), errors);
    throw error;
  }
  await expect(page.locator('#emotion')).toHaveText(/^Joy 0\./);
  await expect(page.locator('#content')).toHaveText('News');
  expect(Number(await page.locator('#sentiment').textContent())).toBeGreaterThan(0);
  const second = await context.newPage(); await second.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await expect(second.locator('#start')).toBeEnabled(); await second.locator('#start').click();
  await expect(second.locator('#error')).toContainText('already running');
  await expect.poll(async () => Number(await page.locator('#samples').textContent())).toBeGreaterThanOrEqual(2);
  await page.locator('#stop').click(); const count = await page.locator('#samples').textContent();
  await page.waitForTimeout(5500); await expect(page.locator('#samples')).toHaveText(count);
  await page.reload(); await expect(page.locator('#samples')).toHaveText(count); await expect(page.locator('#state')).toHaveText('Not tracking');
  const saved = await page.evaluate(() => new Promise(resolve => { const open = indexedDB.open('mooditer', 1); open.onsuccess = () => { const req = open.result.transaction('samples').objectStore('samples').getAll(); req.onsuccess = () => resolve(req.result); }; }));
  expect(saved.length).toBeGreaterThan(0); expect(saved[0].method).toBe('ensemble-lite-v1'); expect(saved[0].blocks).toBeGreaterThan(0); expect(Object.keys(saved[0].intensity)).toEqual(['anger','fear','joy','sadness']); expect(saved[0]).not.toHaveProperty('text'); expect(saved[0]).not.toHaveProperty('image');
  expect(saved[1].timestamp - saved[0].timestamp).toBeGreaterThanOrEqual(4500);
  page.once('dialog', dialog => dialog.accept()); await page.locator('#delete').click();
  await expect(page.locator('#samples')).toHaveText('0'); await expect(second.locator('#samples')).toHaveText('0');
  expect(externalRequests).toEqual([]); expect(errors).toEqual([]);
  await context.setOffline(false);
});

test('local model worker loads offline and measures ten-block inference', async () => {
  test.setTimeout(180000);
  const requests=[];
  const listener=r=>{if(/^https?:/.test(r.url()))requests.push(r.url());};
  context.on('request',listener);
  await context.setOffline(true);
  const p=await context.newPage();
  try {
    await p.goto(`chrome-extension://${extensionId}/dashboard.html`);
    const performanceResult=await p.evaluate(async()=>{
      const worker=new Worker(new URL('emotionWorker.js',location.href),{type:'module'});
      let id=0;const pending=new Map();
      worker.onmessage=({data})=>{if(data.type==='progress')return; const job=pending.get(data.id); if(data.error)job.reject(new Error(data.error));else job.resolve(data.result);pending.delete(data.id);};
      const call=(type,texts)=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});worker.postMessage({id:key,type,texts});});
      try {
        const before=performance.now(); const loaded=await call('init');const wallLoadMs=performance.now()-before;
        const texts=Array.from({length:10},(_,i)=>`Post ${i}: I am grateful for the wonderful support from my friends today. This project was difficult but we are happy with the result.`);
        const timings=[];let result;
        for(let i=0;i<6;i++){const start=performance.now();result=await call('score',texts);if(i>0)timings.push(performance.now()-start);}
        return {inferenceBatchSize:1,padding:false,blocksPerFrame:texts.length,wallLoadMs,modelLoadMs:loaded.loadMs,timingsMs:timings,medianMs:[...timings].sort((a,b)=>a-b)[2],predictions:result.predictions};
      }finally{worker.terminate();}
    });
    expect(performanceResult.predictions).toHaveLength(10);
    for(const row of performanceResult.predictions) for(const value of Object.values(row)){expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1);}
    const {mkdir,writeFile}=await import('node:fs/promises');await mkdir('test-results/emotion-v2',{recursive:true});
    await writeFile('test-results/emotion-v2/performance.json',JSON.stringify({browser:context.browser()?.version(),...performanceResult},null,2));
    console.log('OFFLINE MODEL PERFORMANCE',JSON.stringify(performanceResult));
    expect(requests).toEqual([]);
  }finally{await p.close();await context.setOffline(false);context.off('request',listener);}
});


test('mixed storage keeps methods separate, preserves gaps and exports numeric intensities',async()=>{
 const p=await context.newPage();await p.goto(`chrome-extension://${extensionId}/dashboard.html`);await expect(p.locator('#start')).toBeEnabled();
 await p.evaluate(()=>new Promise((resolve,reject)=>{
  const open=indexedDB.open('mooditer',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{
   const db=open.result,tx=db.transaction('samples','readwrite'),store=tx.objectStore('samples');store.clear();
   const now=new Date();now.setHours(9,0,0,0);const timestamp=+now;
   const model={timestamp,sentiment:.1,contentType:'Other',wordCount:10,ocrConfidence:95,method:'ensemble-lite-v1',intensity:{anger:.2,fear:.1,joy:.6,sadness:.3},peak:{anger:.4,fear:.2,joy:.9,sadness:.5},blocks:2,dominantEmotion:'joy'};
   const legacy={timestamp,sentiment:0,contentType:'Other',wordCount:10,ocrConfidence:95,method:'lexicon-v1',emotions:{Happiness:0,Sadness:0,Anger:0,Fear:0,Disgust:1,Surprise:0},dominantEmotion:'Disgust'};
   [model,legacy,{...legacy,timestamp:timestamp+3600000},{...model,timestamp:timestamp+7200000}].forEach(r=>store.add(r));
   tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
  };
 }));
 await p.reload();await expect(p.locator('#samples')).toHaveText('4');await expect(p.locator('#emotion')).toHaveText('Joy 0.60');
 await expect(p.locator('#emotions')).not.toContainText('Disgust');await expect(p.locator('#emotions')).not.toContainText('%');
 await expect(p.locator('.peak-marker')).toHaveCount(4);await expect(p.locator('#history-rows tr')).toHaveCount(4);
 await p.locator('#chart-mode').selectOption('emotions');
 await expect(p.locator('#chart line[stroke-width="2"]')).toHaveCount(0);
 await p.locator('#chart-mode').selectOption('sentiment');await expect(p.locator('#chart-title')).toHaveText('Sentiment over time');
 const download=p.waitForEvent('download');await p.locator('#export').click();const file=await (await download).path();
 const {readFile}=await import('node:fs/promises');const csv=await readFile(file,'utf8');expect(csv).toContain('intensity_joy');expect(csv).toContain('peak_joy');expect(csv).toContain('lexicon-v1');expect(csv).toContain('ensemble-lite-v1');
 p.once('dialog',d=>d.accept());await p.locator('#delete').click();await expect(p.locator('#samples')).toHaveText('0');await p.close();
});

test('unavailable emotion worker visibly falls back while real OCR continues',async()=>{
 const p=await context.newPage();await p.goto(`chrome-extension://${extensionId}/dashboard.html`);await expect(p.locator('#start')).toBeEnabled();
 await p.evaluate(()=>{
  const NativeWorker=window.Worker;
  window.Worker=class extends NativeWorker {constructor(url,options){if(String(url).includes('emotionWorker.js'))throw new Error('Synthetic model load failure');super(url,options);}};
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=200;
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1000,200);ctx.fillStyle='black';ctx.font='34px Arial';ctx.fillText('Happy people celebrate this wonderful success.',20,80);
  window.syntheticCanvas=canvas;window.drawTimer=setInterval(()=>{ctx.fillStyle='white';ctx.fillRect(0,180,10,10);},100);
  navigator.mediaDevices.getDisplayMedia=async()=>canvas.captureStream(1);
 });
 await p.locator('#start').click();await expect(p.locator('#samples')).not.toHaveText('0',{timeout:60000});
 await expect(p.locator('#tracking-detail')).toContainText('lexicon-v1 fallback');await expect(p.locator('#history-rows')).toContainText('lexicon-v1');await expect(p.locator('#emotion')).toHaveText('Happiness');
 await p.locator('#stop').click();p.once('dialog',d=>d.accept());await p.locator('#delete').click();await expect(p.locator('#samples')).toHaveText('0');await p.close();
});
