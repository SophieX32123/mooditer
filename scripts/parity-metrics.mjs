export const groups={vader_signals:{tolerance:1e-6,maxDifference:0,sumDifference:0,cells:0,worst:[],columns:{},failures:[]},goemotions:{tolerance:1e-3,maxDifference:0,sumDifference:0,cells:0,worst:[],columns:{},failures:[]},lgbm:{tolerance:1e-6,maxDifference:0,sumDifference:0,cells:0,worst:[],columns:{},failures:[]},end_to_end:{tolerance:2e-3,maxDifference:0,sumDifference:0,cells:0,worst:[],columns:{},failures:[]}};
export function compare(group,id,column,actual,expected){
 const g=groups[group],diff=Math.abs(actual-expected),entry={id,column,actual,expected,diff};
 g.maxDifference=Math.max(g.maxDifference,diff);g.sumDifference+=diff;g.cells++;
 const c=g.columns[column] ||= {maxDifference:0,sumDifference:0,cells:0};c.maxDifference=Math.max(c.maxDifference,diff);c.sumDifference+=diff;c.cells++;
 g.worst.push(entry);g.worst.sort((a,b)=>b.diff-a.diff);g.worst.length=Math.min(g.worst.length,10);
 if(!Number.isFinite(diff)||diff>g.tolerance)g.failures.push(entry);
}
export function finish(fixtures){
 for(const g of Object.values(groups)) {
  g.pass=g.failures.length===0;g.meanDifference=g.sumDifference/g.cells;
  for(const c of Object.values(g.columns))c.meanDifference=c.sumDifference/c.cells;
  for(const entry of g.worst)entry.text=fixtures.find(r=>r.id===entry.id).text;
 }
 return groups;
}
export function table(){console.table(Object.entries(groups).map(([group,g])=>({group,maxDifference:g.maxDifference,meanDifference:g.meanDifference,tolerance:g.tolerance,pass:g.pass,failingCells:g.failures.length})));}
