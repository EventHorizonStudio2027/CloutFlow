/* Read-only creator income intelligence. No cross-currency aggregation or causal attribution. */
(function(root){'use strict';
function baseline(series){
 // Exclude the newest (possibly incomplete) reporting month. Only consecutive, observed
 // prior months can form an illustrative baseline; missing data is never treated as zero.
 if(series.length<4)return null;
 const history=series.slice(-4,-1);
 if(history.some(r=>r.amount===null||r.amount<0||!Number.isSafeInteger(r.amount)||typeof r.month!=='string'||!/^\d{4}-\d{2}$/.test(r.month)))return null;
 const serial=m=>{const [y,n]=m.split('-').map(Number);return n>=1&&n<=12?y*12+n:null};
 const months=history.map(r=>serial(r.month));
 if(months.some(m=>m===null)||months[1]!==months[0]+1||months[2]!==months[1]+1)return null;
 const sorted=history.map(r=>r.amount).sort((a,b)=>a-b);
 return {amount:sorted[1]/100,months:history.map(r=>r.month),method:'median of three completed recorded months'};
}
function analyze(report){
 const rows=Array.isArray(report?.rows)?report.rows:[];
 const currencies=Array.isArray(report?.currencies)?report.currencies:[];
 return currencies.filter(c=>/^[A-Z]{3}$/.test(c)).map(currency=>{
  const series=rows.map(row=>{const a=(row.amounts||[]).find(x=>x.currency===currency);return {month:row.month,amount:a&&a.hasData&&Number.isFinite(a.amount)?Math.round(a.amount*100):null};});
  const current=series.at(-1),previous=series.at(-2);
  const currentCents=current?.amount??null,previousCents=previous?.amount??null;
  const delta=currentCents!==null&&previousCents!==null?currentCents-previousCents:null;
  const pct=delta!==null&&previousCents>0?Math.round(delta/previousCents*10000)/100:null;
  const observed=series.filter(x=>x.amount!==null);
  const values=observed.map(x=>x.amount);
  const avg=values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;
  const min=values.length?Math.min(...values):null,max=values.length?Math.max(...values):null;
  // Do not interpret unrecorded months as zero or infer volatility from insufficient history.
  const changes=[];
  for(let i=1;i<series.length;i++)if(series[i].amount!==null&&series[i-1].amount!==null&&series[i-1].amount>0)changes.push((series[i].amount-series[i-1].amount)/series[i-1].amount);
  const averageAbsoluteChange=changes.length>=2?Math.round(changes.reduce((s,n)=>s+Math.abs(n),0)/changes.length*10000)/100:null;
  return {currency,currentMonth:current?.month??null,previousMonth:previous?.month??null,current:currentCents===null?null:currentCents/100,previous:previousCents===null?null:previousCents/100,delta:delta===null?null:delta/100,percentChange:pct,average:avg===null?null:avg/100,min:min===null?null:min/100,max:max===null?null:max/100,observedMonths:observed.length,selectedMonths:series.length,consecutiveComparisons:changes.length,averageAbsoluteChange,baseline:baseline(series)};
 });
}
const api={analyze};root.CloutFlowIncomeIntelligence=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
