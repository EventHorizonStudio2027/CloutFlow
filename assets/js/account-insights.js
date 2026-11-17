/* Read-only account analytics. Account identity is platform + account name. */
(function(root){
 'use strict';
 const key=(platform,account)=>JSON.stringify([String(platform||''),String(account||'')]);
 function choices(earned,adjustments,deposits,managed){
  const map=new Map();
  for(const item of [...earned,...adjustments,...deposits,...managed.map(a=>({...a,account:a.name}))]){
   if(!item.platform||!item.account||!String(item.account).trim())continue;
   const k=key(item.platform,item.account);map.set(k,{key:k,platform:item.platform,account:item.account});
  }
  return [...map.values()].sort((a,b)=>a.platform.localeCompare(b.platform)||a.account.localeCompare(b.account));
 }
 function summarize(selected,earned,adjustments,deposits,netFn){
  const match=e=>key(e.platform,e.account)===selected;
  const groups=new Map();
  const group=c=>{if(!groups.has(c))groups.set(c,{currency:c,transactions:0,gross:0,net:0,adjustments:0,deposits:0});return groups.get(c)};
  for(const e of earned.filter(match)){const g=group(e.currency);g.transactions++;g.gross+=Number(e.gross)||0;g.net+=Number(netFn(e))||0}
  for(const a of adjustments.filter(match))group(a.currency).adjustments+=Number(a.amount)||0;
  for(const p of deposits.filter(match))group(p.currency).deposits+=Number(p.amount)||0;
  return [...groups.values()].map(g=>({...g,adjustedNet:g.net+g.adjustments})).sort((a,b)=>a.currency.localeCompare(b.currency));
 }
 const api={key,choices,summarize};root.AccountInsights=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
