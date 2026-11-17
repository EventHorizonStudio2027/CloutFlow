/* Read-only, USD-only earned-revenue comparisons. No exchange rates or payout-as-income. */
const PeriodComparison=(()=>{
 const iso=(y,m,d)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 const lastDay=(y,m)=>new Date(y,m,0).getDate();
 const clamp=(y,m,d)=>iso(y,m,Math.min(d,lastDay(y,m)));
 const windows=(period,now=new Date())=>{
  const y=now.getFullYear(),m=now.getMonth()+1,d=now.getDate();
  if(period==='all')return null;
  if(period==='year')return {current:[iso(y,1,1),iso(y,m,d)],previous:[iso(y-1,1,1),clamp(y-1,m,d)],label:'Year to date vs same dates last year'};
  const target=period==='last'?new Date(y,m-2,1):new Date(y,m-1,1);
  const cy=target.getFullYear(),cm=target.getMonth()+1;
  const previous=new Date(cy,cm-2,1),py=previous.getFullYear(),pm=previous.getMonth()+1;
  const end=period==='last'?lastDay(cy,cm):d;
  return {current:[iso(cy,cm,1),clamp(cy,cm,end)],previous:[iso(py,pm,1),clamp(py,pm,end)],label:period==='last'?'Last month vs preceding month (matched days)':'Month to date vs previous month (matched days)'};
 };
 const within=(date,range)=>typeof date==='string'&&date>=range[0]&&date<=range[1];
 const cents=n=>Math.round((n+Number.EPSILON)*100)/100;
 const aggregate=(range,entries,adjustments,net)=>{
  const earnings=entries.filter(e=>e.currency==='USD'&&within(e.earnedDate,range));
  const corrections=adjustments.filter(a=>a.currency==='USD'&&within(a.date,range));
  return {gross:cents(earnings.reduce((s,e)=>s+Number(e.gross),0)),adjustedNet:cents(earnings.reduce((s,e)=>s+net(e),0)+corrections.reduce((s,a)=>s+Number(a.amount),0)),transactions:earnings.length};
 };
 const change=(current,previous)=>({difference:cents(current-previous),percent:previous>0?Math.round(((current-previous)/previous)*1000)/10:null});
 const compare=(period,entries,adjustments,net,now=new Date())=>{
  const w=windows(period,now);if(!w)return null;
  const current=aggregate(w.current,entries,adjustments,net),previous=aggregate(w.previous,entries,adjustments,net);
  return {...w,current,previous,netChange:change(current.adjustedNet,previous.adjustedNet),grossChange:change(current.gross,previous.gross)};
 };
 return {windows,aggregate,change,compare};
})();
if(typeof module!=='undefined')module.exports=PeriodComparison;
