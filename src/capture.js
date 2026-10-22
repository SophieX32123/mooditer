import { createWorker } from 'tesseract.js';
import { analyzeFrame } from './analysis.js';
import { initializeEmotionModel } from './emotionClient.js';
export class CaptureSession {
  constructor({ video, canvas, onSample, onStatus, onEnd, onError, workerFactory = createWorker, mediaDevices = navigator.mediaDevices, analyzer = analyzeFrame, initializeModel = initializeEmotionModel }) {
    Object.assign(this, { video, canvas, onSample, onStatus, onEnd, onError, workerFactory, mediaDevices, analyzer, initializeModel });
    this.generation = 0;
    this.active = false;
  }
  async start() {
    const generation = ++this.generation;
    this.active = true;
    const current = () => this.active && this.generation === generation;
    try {
      this.onStatus('Choose what to share in the browser’s screen picker.');
      const stream = await this.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 1, max: 2 } }, audio: false });
      if (!current()) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      stream.getVideoTracks()[0].addEventListener('ended', () => { if (current()) this.stop(); });
      this.video.srcObject = stream;
      await this.video.play();
      if (!current()) return;
      this.onStatus('Preparing the local text reader…');
      const base = new URL('vendor/', location.href).href;
      const workerPromise = this.workerFactory('eng', 1, {
        workerPath: `${base}worker.min.js`, corePath: `${base}core`, langPath: `${base}lang`, workerBlobURL: false,
        errorHandler: () => { if (current()) this.fail(new Error('The local text reader failed. Stop and restart tracking.')); }
      });
      // If initialization resolves after Stop, immediately release that worker.
      workerPromise.then(worker => { if (!current()) worker.terminate(); }, () => {});
      const worker = await this.withTimeout(workerPromise, 60000);
      if (!current()) return;
      this.worker = worker;
      await worker.setParameters({ tessedit_pageseg_mode: '11' });
      if (!current()) return;
      try { await this.initializeModel(text => { if (current()) this.onStatus(text); }); }
      catch { if (current()) this.onStatus('Emotion model unavailable; using lexicon-v1 fallback.'); }
      if (!current()) return;
      this.timer = setInterval(() => void this.sample(generation), 5000);
      void this.sample(generation);
    } catch (error) {
      if (current()) this.fail(error);
    }
  }
  async withTimeout(promise, milliseconds) {
    let timer;
    try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Text recognition timed out. Please restart tracking.')), milliseconds); })]); }
    finally { clearTimeout(timer); }
  }
  async sample(generation) {
    if (!this.active || generation !== this.generation || this.busy === generation) return;
    if (this.video.readyState < 2 || !this.video.videoWidth || this.stream.getVideoTracks()[0].muted) {
      this.onStatus('Waiting for a readable screen frame…'); return;
    }
    this.busy = generation;
    const timestamp = Date.now();
    try {
      // Keep native resolution: reducing desktop text resolution hurts OCR accuracy.
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      this.canvas.getContext('2d').drawImage(this.video, 0, 0);
      const image = this.canvas.toDataURL('image/png');
      this.canvas.width = this.canvas.height = 0;
      const { data } = await this.withTimeout(this.worker.recognize(image), 60000);
      if (!this.active || generation !== this.generation) return;
      const analysis = await this.analyzer(data.text, data.confidence, {onStatus: text => { if (this.active && generation === this.generation) this.onStatus(text); }});
      if (!this.active || generation !== this.generation) return;
      if (analysis) {
        await this.onSample({ timestamp, ...analysis });
        if (this.active && generation === this.generation) this.onStatus(`Last analyzed at ${new Date(timestamp).toLocaleTimeString()} · ${analysis.blocks ?? 0} blocks · ${analysis.wordCount} words · ${analysis.ocrConfidence}% OCR confidence${analysis.method === 'lexicon-v1' ? ' · Emotion model unavailable: lexicon-v1 fallback' : ''}`);
      } else this.onStatus('Capture skipped: too little readable English text or low OCR confidence.');
    } catch (error) {
      if (this.active && generation === this.generation) this.fail(error);
    } finally { if (this.busy === generation) this.busy = null; }
  }
  fail(error) { this.stop(); this.onError(error); }
  stop() {
    this.active = false;
    this.generation++;
    clearInterval(this.timer);
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    const worker = this.worker;
    this.worker = null;
    if (worker) Promise.resolve(worker.terminate()).catch(() => {});
    this.video.pause();
    this.video.srcObject = null;
    this.canvas.width = this.canvas.height = 0;
    this.onEnd();
  }
}
