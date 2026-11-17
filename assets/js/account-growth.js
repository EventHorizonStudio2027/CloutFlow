/* Currency-safe, period-matched account growth. Read-only financial projection. */
(function(root){
 'use strict';
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 const inside=(date,range)=>typeof date==='string'&&date>=range[0]&&date<=range[1];
 function calculate(windows,entries,adjustments,net){
  if(!windows)return null;
  const map=new Map();
  function add(item,period,amount){
   if(!item||!item.platform||!item.account||!item.currency)return;
   const key=JSON.stringify([item.currency,item.platform,item.account]);
   if(!map.has(key))map.set(key,{currency:item.currency,platform:item.platform,account:item.account,current:0,previous:0});
   const row=map.get(key);row[period]+=Number(amount)||0;
  }
  for(const e of entries){if(inside(e.earnedDate,windows.current))add(e,'current',net(e));else if(inside(e.earnedDate,windows.previous))add(e,'previous',net(e))}
  for(const a of adjustments){if(inside(a.date,windows.current))add(a,'current',a.amount);else if(inside(a.date,windows.previous))add(a,'previous',a.amount)}
  return [...map.values()].map(r=>{const current=round(r.current),previous=round(r.previous),difference=round(current-previous);return {...r,current,previous,difference,percent:previous>0?Math.round(difference/previous*1000)/10:null}})
   .sort((a,b)=>a.currency.localeCompare(b.currency)||b.difference-a.difference||a.platform.localeCompare(b.platform)||a.account.localeCompare(b.account));
 }
 const api={calculate};root.AccountGrowth=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
