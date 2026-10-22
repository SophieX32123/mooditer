export const WHEEL_LABELS = ['anger', 'fear', 'joy', 'sadness', 'Mixed'];
export function emotionFractions(records) {
  const counts=Object.fromEntries(WHEEL_LABELS.map(label=>[label,0]));
  let total=0;
  for(const row of records) {
    if(row.method!=='ensemble-lite-v1' || !WHEEL_LABELS.slice(0,4).every(e=>Number.isFinite(row.intensity?.[e]) && row.intensity[e]>=0 && row.intensity[e]<=1)) continue;
    const ranked=WHEEL_LABELS.slice(0,4).sort((a,b)=>row.intensity[b]-row.intensity[a]);
    const label=row.intensity[ranked[0]]-row.intensity[ranked[1]]<.02?'Mixed':ranked[0];
    counts[label]++;total++;
  }
  return {counts,total,excluded:records.length-total};
}
export function renderEmotionWheel(container,records) {
 const {counts,total,excluded}=emotionFractions(records);
 renderDistributionWheel(container,counts,total,WHEEL_LABELS,'Leading content emotion distribution','model samples','No model-analyzed samples in this date range. Legacy samples are excluded.');
 if(excluded){const p=document.createElement('p');p.textContent=`${excluded} legacy or invalid samples excluded.`;container.append(p);}
}
export function renderDistributionWheel(container,counts,total,labels,title,unit,emptyText) {
 const palette=['#8db699','#9aaec8','#d6a090','#b6a3c7','#a7b0b2','#dfc28c'];
 const ns='http://www.w3.org/2000/svg';
 const el=(tag,attrs={},text)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;};
 container.replaceChildren();
 if(!total){const p=document.createElement('p');p.textContent=emptyText;container.append(p);return;}
 const svg=el('svg',{viewBox:'0 0 240 240',role:'img','aria-label':title});
 svg.append(el('title',{},labels.map(label=>`${label}: ${counts[label]} of ${total} samples`).join('; ')));
 let offset=0;
 labels.forEach((label,i)=>{const fraction=counts[label]/total*100;if(!fraction)return;
 const arc=el('circle',{cx:120,cy:120,r:88,fill:'none',stroke:palette[i],'stroke-width':36,pathLength:100,'stroke-dasharray':`${fraction} ${100-fraction}`,'stroke-dashoffset':-offset,transform:'rotate(-90 120 120)'});
 arc.append(el('title',{},`${label}: ${fraction.toFixed(1)}% (${counts[label]} samples)`));svg.append(arc);offset+=fraction;});
 svg.append(el('text',{x:120,y:116,'text-anchor':'middle','font-size':26,fill:'#183d46'},total.toLocaleString()));
 svg.append(el('text',{x:120,y:141,'text-anchor':'middle','font-size':13,fill:'#55666b'},unit));
 const legend=document.createElement('ul');legend.className='wheel-legend';
 labels.forEach((label,i)=>{const li=document.createElement('li');const swatch=document.createElement('span');swatch.className='wheel-swatch';swatch.style.backgroundColor=palette[i];li.append(swatch,`${label[0].toUpperCase()+label.slice(1)}: ${(counts[label]/total*100).toFixed(1)}% · ${counts[label]} samples`);legend.append(li);});
 container.append(svg,legend);
}
