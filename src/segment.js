import { wordTokens } from './features.js';
export function segment(text) {
  const blocks=[];
  for(const part of text.split(/\r?\n[\t ]*\r?\n+/)) {
    const block=part.split(/\r?\n/).map(s=>s.trim()).join(' ').trim();
    const matches=[...block.matchAll(/@?[A-Za-z][A-Za-z']*/g)];
    if(matches.length<4) continue;
    if(matches.length<=80) { blocks.push(block); continue; }
    let start=0;
    for(let i=60;i<matches.length;i+=60) {
      // Avoid a final fragment with fewer than four words.
      if(matches.length-i<4) break;
      const end=matches[i].index; blocks.push(block.slice(start,end).trim()); start=end;
    }
    blocks.push(block.slice(start).trim());
  }
  return [...new Set(blocks)].map((text,index)=>({text,index,n:wordTokens(text).length}))
    .sort((a,b)=>b.n-a.n||a.index-b.index).slice(0,20).sort((a,b)=>a.index-b.index).map(b=>b.text);
}
