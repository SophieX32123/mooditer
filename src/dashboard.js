import { renderEmotionWheel, renderDistributionWheel } from './emotionWheel.js';
import { CaptureSession } from './capture.js';
import { EMOTIONS, CONTENT_TYPES, INTENSITY_EMOTIONS, INTENSITY_NOTE, strongestIntensity } from './analysis.js';
import { aggregate, aggregateByMethod, summarize } from './aggregate.js';
import { addSample, clearSamples, readSamples, pruneSamples } from './storage.js';
import { demoSamples } from './demo.js';
const $ = id => document.getElementById(id);
let chartMode='sentiment', demoGeneration=0, demoAnchor=Date.now();
let records = [], interval = 'hour', demo = false, demoRecords = [], releaseLock, starting = false, savedThisSession = 0, storageReady = false;
const channel = new BroadcastChannel('mooditer-updates');
const colors = ['#8db699', '#9aaec8', '#d6a090', '#b6a3c7', '#b1b58c', '#dfc28c'];
const signed = value => value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
function leading(values, fallback = '—') {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  if (!entries[0]?.[1]) return fallback;
  return entries[1]?.[1] === entries[0][1] ? 'Mixed' : entries[0][0];
}
function since() {
  const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - Number($('range').value) + 1); return date.getTime();
}
function currentRecords() { return (demo ? demoRecords : records).filter(row => row.timestamp >= since()); }
function showError(error) {
  $('error').hidden = false;
  $('error').textContent = error.name === 'NotAllowedError' ? 'Screen sharing was cancelled or denied. Click Start tracking when you’re ready to choose a surface.' : error.message || 'Something went wrong. Please restart tracking.';
}
const session = new CaptureSession({
  video: $('capture-video'), canvas: $('capture-canvas'),
  onStatus: text => { $('tracking-detail').textContent = text; },
  onError: showError,
  onEnd: () => {
    $('demo').disabled=false; starting = false; $('start').hidden = false; $('start').disabled = !storageReady; $('stop').hidden = true;
    $('state').textContent = 'Not tracking'; $('state').classList.remove('live');
    $('tracking-title').textContent = 'A little perspective, whenever you’re ready.';
    $('tracking-detail').textContent = 'Tracking stopped. Your saved insights are ready below.';
    releaseLock?.(); releaseLock = null;
  },
  onSample: async sample => {
    await addSample(sample);
    records.push(sample); savedThisSession++;
    $('session-count').textContent = `${savedThisSession} samples this session`;
    channel.postMessage('updated'); render();
  }
});
$('start').addEventListener('click', async () => {
  if (starting || session.active || !storageReady) return;
  starting = true; $('error').hidden = true;
  try {
    await navigator.locks.request('mooditer-capture', { ifAvailable: true }, async lock => {
      if (!lock) { starting = false; throw new Error('Tracking is already running in another Mooditer dashboard. Stop that session first.'); }
      const stopped = new Promise(resolve => { releaseLock = resolve; });
      demoGeneration++; demo = false; $('demo-banner').hidden = true; render();
      $('start').hidden = true; $('stop').hidden = false;
      $('state').textContent = 'Tracking'; $('state').classList.add('live');
      $('tracking-title').textContent = 'A little awareness, in progress.';
      savedThisSession = 0;
      $('demo').disabled=true; void session.start();
      await stopped;
    });
  } catch (error) { starting = false; showError(error); }
});
$('stop').addEventListener('click', () => session.stop());
window.addEventListener('pagehide', () => session.stop());
function renderBars(id, names, values, denominator = 1, peaks = null) {
  const container = $(id); container.replaceChildren();
  names.forEach((name, i) => {
    const row = document.createElement('div'); row.className = 'bar-row';
    const label = document.createElement('span'); label.textContent = name.charAt(0).toUpperCase()+name.slice(1);
    const track = document.createElement('div'); track.className = 'bar-track';
    const fill = document.createElement('div'); fill.className = 'bar-fill';
    const share = denominator ? (values[name] || 0) / denominator : 0;
    fill.style.width = `${share * 100}%`; fill.style.background = colors[i]; track.append(fill);
    const value = document.createElement('span'); value.className = 'value'; value.textContent = peaks ? (values[name] === null ? '—' : share.toFixed(2)) : `${Math.round(share * 100)}%`;
    if(peaks && peaks[name] !== null) { const marker=document.createElement('i'); marker.className='peak-marker'; marker.style.left=`${peaks[name]*100}%`; marker.title=`Peak ${peaks[name].toFixed(2)}`; track.append(marker); }
    row.append(label, track, value); container.append(row);
  });
}
function periodLabel(timestamp) {
  const date = new Date(timestamp);
  if (interval === 'hour') return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', timeZoneName: 'short' });
  return `${interval === 'week' ? 'Week of ' : ''}${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
function svgElement(name, attributes, text) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  return el;
}
function renderChart(buckets) {
  const container = $('chart'); container.replaceChildren();
  if (!buckets.length) {
    const empty = document.createElement('div'); empty.className = 'empty';
    const title = document.createElement('b'); title.textContent = 'Your digital day, a little clearer.';
    const caption = document.createElement('span'); caption.textContent = 'Start tracking or explore the demo to see your first insights.';
    empty.append(title, caption); container.append(empty); return;
  }
  const width = 1000, height = 210, left = 42, right = 35, top = 10, bottom = 32;
  const svg = svgElement('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': `${chartMode==='emotions'?'Average emotion intensities':'Average sentiment'} by time period. Full values are in the activity table below.` });
  const emotionView=chartMode==='emotions';
  const y = value => top + (1 - value) / (emotionView?1:2) * (height - top - bottom);
  for (const value of (emotionView?[0,.25,.5,.75,1]:[-1,-.5,0,.5,1])) {
    svg.append(svgElement('line', { x1: left, x2: width - right, y1: y(value), y2: y(value), stroke: '#eaf0e7', 'stroke-dasharray': value === 0 ? '4 4' : '0' }));
    svg.append(svgElement('text', { x: 0, y: y(value) + 3, fill: '#9ca995', 'font-size': 10 }, signed(value)));
  }
  const start = buckets[0].timestamp, span = buckets.at(-1).timestamp - start;
  const x = item => span ? left + (item.timestamp - start) / span * (width - left - right) : width / 2;
  buckets.forEach((item, i) => {
    const prev = buckets[i - 1];
    // Leave gaps for periods with no samples rather than inventing measurements.
    const next = prev ? new Date(prev.timestamp) : null;
    if (next) {
      if (interval === 'hour') next.setTime(next.getTime() + 3600000);
      else next.setDate(next.getDate() + (interval === 'week' ? 7 : 1));
    }

    const series=emotionView?INTENSITY_EMOTIONS:['sentiment'];
    series.forEach((key,index)=>{
      const value=emotionView?item.intensity[key]:item.sentiment;
      const previous=prev?(emotionView?prev.intensity[key]:prev.sentiment):null;
      if(value===null) return;
      const color=emotionView?colors[index]:'#6e9873';
      if(prev&&previous!==null&&next.getTime()===item.timestamp) svg.append(svgElement('line',{x1:x(prev),y1:y(previous),x2:x(item),y2:y(value),stroke:color,'stroke-width':2}));
      const point=svgElement('circle',{cx:x(item),cy:y(value),r:3.5,fill:color,stroke:'#fff','stroke-width':1});
      point.append(svgElement('title',{},`${periodLabel(item.timestamp)}: ${key} ${value.toFixed(3)}`)); svg.append(point);
    });
    if (i % Math.max(1, Math.ceil(buckets.length / 6)) === 0 || i === buckets.length - 1) {
      const text = interval === 'hour' && Number($('range').value) === 1 ? new Date(item.timestamp).toLocaleTimeString([], { hour: 'numeric' }) : new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      svg.append(svgElement('text', { x: x(item), y: height - 5, fill: '#9ca995', 'font-size': 10, 'text-anchor': 'middle' }, text));
    }
  });
  container.append(svg);
}
function render() {
  const selected = currentRecords(), summary = summarize(selected), buckets = aggregate(selected, interval);
  renderEmotionWheel($('emotion-wheel'),selected);
  $('sentiment').textContent = signed(summary.sentiment);
  $('sentiment-caption').textContent = !summary.count ? 'Your first insight starts with a session' : summary.sentiment > .15 ? 'Leaning positive' : summary.sentiment < -.15 ? 'Leaning negative' : 'Around neutral';
  $('sentiment-marker').hidden = !summary.count; $('sentiment-marker').style.left = `${((summary.sentiment || 0) + 1) * 50}%`;
  const strongest=summary.modelSamples?strongestIntensity(summary.intensity):leading(summary.emotions,summary.count?'No clear signal':'—');
  $('emotion').textContent=strongest.charAt(0).toUpperCase()+strongest.slice(1)+(summary.modelSamples?` ${Math.max(...Object.values(summary.intensity)).toFixed(2)}`:'');
  $('emotion-caption').textContent = `${summary.modelSamples} model samples · ${summary.legacySamples} legacy samples (separate)`;
  $('content').textContent = leading(summary.types); $('content-caption').textContent = summary.count ? 'Most frequent category in this period' : 'See what makes up your digital day';
  $('samples').textContent = summary.count.toLocaleString();
  $('range-label').textContent = `${demo ? 'Demo · ' : ''}${$('range').selectedOptions[0].text}, in your local time`;
  $('export').disabled = !summary.count;
  if(summary.modelSamples || !summary.legacySamples) renderBars('emotions',INTENSITY_EMOTIONS,summary.intensity,1,summary.peak);
  else renderBars('emotions',EMOTIONS,summary.emotions); renderDistributionWheel($('types'),summary.types,summary.count,CONTENT_TYPES,'Content category distribution','samples','No analyzed samples in this date range.');
  $('emotion-note').textContent = summary.legacySamples&&!summary.modelSamples?'Legacy lexicon-v1: shares of detected keyword signals; not model intensities.':INTENSITY_NOTE;
  $('chart-title').textContent=chartMode==='emotions'?'Emotion intensity over time':'Sentiment over time';
  $('chart-legend').textContent=chartMode==='emotions'?'Anger · Fear · Joy · Sadness (0–1)':'Average content sentiment';
  renderChart(buckets);
  $('bucket-count').textContent = `${buckets.length} periods`;
  const tbody = $('history-rows'); tbody.replaceChildren();
  if (!buckets.length) { const row = tbody.insertRow(); const cell = row.insertCell(); cell.colSpan = 7; cell.className = 'empty-cell'; cell.textContent = 'No samples yet. Your sessions will appear here.'; }
  for (const bucket of aggregateByMethod(selected,interval).reverse()) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    const details = document.createElement('details'); const title = document.createElement('summary'); title.textContent = periodLabel(bucket.timestamp); details.append(title);

    const breakdown=document.createElement('p');
    breakdown.textContent=bucket.modelSamples?INTENSITY_EMOTIONS.map(e=>`${e}: average ${bucket.intensity[e].toFixed(3)}, peak ${bucket.peak[e].toFixed(3)}`).join(' · '):`Legacy shares: ${EMOTIONS.map(e=>`${e} ${Math.round(bucket.emotions[e]*100)}%`).join(' · ')}`;
    breakdown.style.maxWidth='360px'; breakdown.style.lineHeight='1.8'; details.append(breakdown); cell.append(details);
    for(const value of [bucket.count,signed(bucket.sentiment),bucket.modelSamples?strongestIntensity(bucket.intensity):leading(bucket.emotions,'No clear emotion'),leading(bucket.types),bucket.modelSamples?bucket.blocks:'—',bucket.method]) row.insertCell().textContent=value;

  }
}
$('range').addEventListener('change', render);
document.querySelectorAll('[data-interval]').forEach(button => button.addEventListener('click', () => {
  interval = button.dataset.interval;
  document.querySelectorAll('[data-interval]').forEach(item => { item.classList.toggle('selected', item === button); item.setAttribute('aria-pressed', String(item === button)); }); render();
}));

$('chart-mode').addEventListener('change',()=>{chartMode=$('chart-mode').value;render();});
async function loadDemo(reset=false) {
  if(reset) { demoAnchor=Date.now(); $('demo-scenario').value='positive'; }
  $('demo-scenario').disabled=true;
  const generation=++demoGeneration; $('demo').disabled=true;
  try {
    const generated=await demoSamples(demoAnchor,text=>{$('tracking-detail').textContent=text;},$('demo-scenario').value);
    if(generation!==demoGeneration) return;
    demo=true;demoRecords=generated;$('demo-banner').hidden=false;$('range').value='7';render();
    if(reset) document.querySelector('[data-interval="day"]').click();
  } catch(error){showError(error);} finally{$('demo').disabled=false;$('demo-scenario').disabled=false;}
}
$('demo').addEventListener('click',()=>loadDemo(true));
$('demo-scenario').addEventListener('change',()=>loadDemo());
$('exit-demo').addEventListener('click', () => { demoGeneration++; demo = false; $('demo-banner').hidden = true; render(); });
$('delete').addEventListener('click', async () => {
  if (!confirm('Permanently delete all saved Mooditer analysis on this browser? Tracking will stop.')) return;
  demoGeneration++; session.stop();
  channel.postMessage('stop-for-delete');
  try {
    await navigator.locks.request('mooditer-capture', async () => {
      await clearSamples(); records = []; demo = false; $('demo-banner').hidden = true; channel.postMessage('cleared'); render();
    });
  } catch (error) { showError(error); }
});
$('export').addEventListener('click', () => {

  const headings=['period_local','period_start_utc','grouping','samples','average_sentiment','method','blocks',...INTENSITY_EMOTIONS.flatMap(e=>[`intensity_${e}`,`peak_${e}`]),'legacy_samples_with_emotion',...EMOTIONS.map(e=>`legacy_share_${e}`),...CONTENT_TYPES.map(e=>`content_count_${e}`)];
  const rows=aggregateByMethod(currentRecords(),interval).map(b=>[periodLabel(b.timestamp),new Date(b.timestamp).toISOString(),interval,b.count,b.sentiment,b.method,b.modelSamples?b.blocks:'',...INTENSITY_EMOTIONS.flatMap(e=>[b.intensity[e]??'',b.peak[e]??'']),b.legacySamples?b.emotionalSamples:'',...EMOTIONS.map(e=>b.legacySamples?b.emotions[e]:''),...CONTENT_TYPES.map(e=>b.types[e])]);
  const csv = [headings, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `mooditer-${demo ? `demo-${$('demo-scenario').value}-` : ''}${interval}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
channel.onmessage = async event => {
  if (event.data === 'stop-for-delete') { session.stop(); return; }
  if (event.data === 'cleared') session.stop();
  try { records = await readSamples(); render(); } catch (error) { showError(error); }
};
$('start').disabled = true;
render();
try { await pruneSamples(); records = await readSamples(); storageReady = true; $('start').disabled = false; render(); }
catch (error) { showError(new Error(`Local storage is unavailable: ${error.message}`)); }
setInterval(async () => {
  try { await pruneSamples(); records = records.filter(row => row.timestamp >= Date.now() - 90 * 86400000); render(); } catch (error) { session.stop(); showError(error); }
}, 60000);
