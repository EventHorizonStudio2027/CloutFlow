/* Observed recurring-category income, never an assertion of a contractual agreement. */
(function(root){'use strict';
const CATEGORIES=[/subscri/i,/member/i,/patreon/i,/recurring/i,/paid subscription/i];
function summarize(entries,end,count=6){
 if(!Array.isArray(entries)||typeof end!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(end)||!Number.isInteger(count)||count<2||count>12)return [];
 const [y,m]=end.split('-').map(Number);const months=Array.from({length:count},(_,i)=>new Date(Date.UTC(y,m-count+i,1)).toISOString().slice(0,7));
 const groups=new Map();
 for(const e of entries){if(!e||typeof e!=='object'||!CATEGORIES.some(re=>re.test(String(e.incomeType||''))))continue;
  const date=String(e.earnedDate||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!months.includes(date.slice(0,7))||!Number.isFinite(new Date(date+'T00:00:00Z').getTime())||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)continue;
  const currency=String(e.currency||'');if(!/^[A-Z]{3}$/.test(currency))continue;
  const amounts=['gross','fees','refunds','tax'].map(k=>Number(e[k]??0));if(amounts.some(n=>!Number.isFinite(n)||n<0||Math.abs(Math.round(n*100)-n*100)>1e-6))continue;
  const cents=Math.round(amounts[0]*100)-amounts.slice(1).reduce((s,n)=>s+Math.round(n*100),0);if(cents<0)continue;
  const platform=String(e.platform||'Unknown').trim().slice(0,100),account=String(e.account||'').trim().slice(0,100),type=String(e.incomeType||'').trim().slice(0,100);
  const key=JSON.stringify([currency,platform,account,type]);if(!groups.has(key))groups.set(key,{currency,platform,account,type,months:new Map(),entries:0});
  const g=groups.get(key);g.months.set(date.slice(0,7),(g.months.get(date.slice(0,7))||0)+cents);g.entries++;
 }
 return [...groups.values()].map(g=>{const active=months.filter(month=>g.months.has(month));const last=months.at(-1),prior=months.at(-2);const recent=g.months.get(last),previous=g.months.get(prior);const delta=recent!==undefined&&previous!==undefined?(recent-previous)/100:null;const consecutive=recent!==undefined&&previous!==undefined;return {currency:g.currency,platform:g.platform,account:g.account,type:g.type,entries:g.entries,activeMonths:active.length,selectedMonths:count,latest:recent===undefined?null:recent/100,previous:previous===undefined?null:previous/100,delta,consecutive,observedPattern:active.length>=3&&consecutive,history:months.map(month=>({month,amount:g.months.has(month)?g.months.get(month)/100:null}))};}).sort((a,b)=>b.activeMonths-a.activeMonths||a.currency.localeCompare(b.currency)||a.platform.localeCompare(b.platform)||a.type.localeCompare(b.type));
}
const api={summarize};root.CloutFlowRecurringIncome=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
