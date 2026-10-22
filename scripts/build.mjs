import { build } from 'esbuild';
import { mkdir, copyFile, cp, readdir } from 'node:fs/promises';
await mkdir('dist/vendor/core', { recursive: true });
await mkdir('dist/vendor/lang', { recursive: true });
for (const file of ['manifest.json', 'background.js', 'dashboard.html', 'styles.css']) {
  await copyFile(`extension/${file}`, `dist/${file}`);
}
await build({ entryPoints: ['src/dashboard.js'], outfile: 'dist/dashboard.js', bundle: true, format: 'esm', platform: 'browser', target: 'chrome116', sourcemap: false });
await copyFile('node_modules/tesseract.js/dist/worker.min.js', 'dist/vendor/worker.min.js');
for (const file of await readdir('node_modules/tesseract.js-core')) {
  if (file.endsWith('.wasm') || file.endsWith('.wasm.js')) await copyFile(`node_modules/tesseract.js-core/${file}`, `dist/vendor/core/${file}`);
}
await copyFile('assets/eng.traineddata.gz', 'dist/vendor/lang/eng.traineddata.gz');
await mkdir('dist/licenses', { recursive: true });
for (const name of ['tesseract.js', 'tesseract.js-core', 'sentiment']) {
  await cp(`node_modules/${name}/${name === 'tesseract.js-core' ? 'LICENSE' : 'LICENSE.md'}`, `dist/licenses/${name}.txt`);
}
await copyFile('PRIVACY.md', 'dist/PRIVACY.md');
await copyFile('assets/LICENSE-tessdata', 'dist/licenses/tessdata.txt');
await copyFile('INSTALL.md', 'dist/INSTALL.md');

await cp('assets/emotion-v2/models', 'dist/models', {recursive:true});
await mkdir('dist/emotion-v2', {recursive:true});
for (const file of ['feature_spec', 'vader_and_signals', ...['anger','fear','joy','sadness'].map(e => `lightgbm_lite_${e}`)]) {
  await copyFile(`assets/emotion-v2/${file}.json`, `dist/emotion-v2/${file}.json`);
}
await mkdir('dist/vendor/ort', {recursive:true});
for(const file of ['ort-wasm-simd-threaded.jsep.mjs','ort-wasm-simd-threaded.jsep.wasm']) await copyFile(`node_modules/onnxruntime-web/dist/${file}`, `dist/vendor/ort/${file}`);
await build({entryPoints:['src/emotionWorker.js'],outfile:'dist/emotionWorker.js',bundle:true,format:'esm',platform:'browser',target:'chrome116',sourcemap:false});
await cp('licenses','dist/licenses',{recursive:true});

console.log('Built offline extension in dist/ (including local emotion model)');
