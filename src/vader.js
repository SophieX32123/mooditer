// Port of vaderSentiment 3.3.2, C.J. Hutto (MIT); see licenses/vaderSentiment.txt.
// Preserve Python's rule order and even its first-index behavior in the "but" loop.
import data from './vader-data.json' with { type: 'json' };
const negate = new Set(data.NEGATE);
const has = (o,k) => Object.hasOwn(o,k);
const upper = w => w.toUpperCase() === w && w.toLowerCase() !== w;
const negated = w => negate.has(w) || w.includes("n't");
const punct = new Set('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');
function stripWord(w) {
  const a = [...w]; let l=0,r=a.length;
  while(l<r && punct.has(a[l])) l++;
  while(r>l && punct.has(a[r-1])) r--;
  return r-l <= 2 ? w : a.slice(l,r).join('');
}
function round(value, digits) {
  // toFixed uses the original binary float, like Python round for these decimal places.
  return Number(value.toFixed(digits));
}
export function polarityScores(input, spec) {
  const lex = spec.lexicon, boosters = spec.booster_dict;
  let text='', space=true;
  for(const c of input) {
    if(has(data.emojis,c)) { text += (space?'':' ')+data.emojis[c]; space=false; }
    else { text+=c; space=c===' '; }
  }
  text=text.trim();
  const words=(text.match(/\S+/gu)||[]).map(stripWord), low=words.map(w=>w.toLowerCase());
  const caps=words.filter(upper).length, capDiff=caps>0&&caps<words.length;
  const values=words.map((word,i)=>{
    const key=low[i];
    if(has(boosters,key)||(key==='kind'&&low[i+1]==='of')||!has(lex,key)) return 0;
    let v=lex[key];
    if(key==='no'&&i<words.length-1&&has(lex,low[i+1])) v=0;
    if(low[i-1]==='no'||low[i-2]==='no'||(low[i-3]==='no'&&['or','nor'].includes(low[i-1]))) v=lex[key]*-.74;
    if(upper(word)&&capDiff) v+=v>0?.733:-.733;
    for(let d=0;d<3;d++) if(i>d&&!has(lex,low[i-d-1])) {
      const prev=low[i-d-1]; let s=0;
      if(has(boosters,prev)) { s=boosters[prev]*(v<0?-1:1); if(upper(words[i-d-1])&&capDiff) s+=v>0?.733:-.733; }
      v+=s*(d===1?.95:d===2?.9:1);
      if(d===0&&negated(prev)) v*= -.74;
      if(d===1) {
        if(low[i-2]==='never'&&['so','this'].includes(low[i-1])) v*=1.25;
        else if(!(low[i-2]==='without'&&low[i-1]==='doubt')&&negated(prev)) v*= -.74;
      }
      if(d===2) {
        // Parentheses intentionally match Python 3.3.2's and/or precedence.
        if((low[i-3]==='never'&&['so','this'].includes(low[i-2]))||['so','this'].includes(low[i-1])) v*=1.25;
        else if(!(low[i-3]==='without'&&(low[i-2]==='doubt'||low[i-1]==='doubt'))&&negated(prev)) v*= -.74;
        const onezero=low.slice(i-1,i+1).join(' '), twoonezero=low.slice(i-2,i+1).join(' '), twoone=low.slice(i-2,i).join(' '), threetwoone=low.slice(i-3,i).join(' '), threetwo=low.slice(i-3,i-1).join(' ');
        for(const seq of [onezero,twoonezero,twoone,threetwoone,threetwo]) if(has(data.SPECIAL_CASES,seq)) { v=data.SPECIAL_CASES[seq]; break; }
        for(const n of [2,3]) if(i+n<=low.length) { const seq=low.slice(i,i+n).join(' '); if(has(data.SPECIAL_CASES,seq)) v=data.SPECIAL_CASES[seq]; }
        for(const seq of [threetwoone,threetwo,twoone]) if(has(boosters,seq)) v+=boosters[seq];
      }
    }
    if(i>0&&low[i-1]==='least'&&!has(lex,low[i-1])&&(i===1||!['at','very'].includes(low[i-2]))) v*= -.74;
    return v;
  });
  const bi=low.indexOf('but');
  if(bi>=0) for(let i=0;i<values.length;i++) { const s=values[i], si=values.indexOf(s); if(si<bi) values[si]=s*.5; else if(si>bi) values[si]=s*1.5; }
  if(!values.length) return {neg:0,neu:0,pos:0,compound:0};
  const q=(text.match(/\?/g)||[]).length;
  const emphasis=Math.min(4,(text.match(/!/g)||[]).length)*.292+(q>3?.96:q>1?q*.18:0);
  let total=values.reduce((a,b)=>a+b,0); total+=total>0?emphasis:total<0?-emphasis:0;
  let pos=0,neg=0,neu=0;
  for(const v of values) { if(v>0) pos+=v+1; else if(v<0) neg+=v-1; else neu++; }
  if(pos>Math.abs(neg)) pos+=emphasis; else if(pos<Math.abs(neg)) neg-=emphasis;
  const denom=pos+Math.abs(neg)+neu;
  return {compound:round(total/Math.sqrt(total*total+15),4),pos:round(Math.abs(pos/denom),3),neg:round(Math.abs(neg/denom),3),neu:round(neu/denom,3)};
}
