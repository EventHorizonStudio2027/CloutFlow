/* Read-only earned-income context beside creator-entered growth goals.
   It does not attribute revenue to any opportunity or include deposits as earnings. */
(function(root){'use strict';
const DATE=/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
function monthKey(date){return typeof date==='string'&&DATE.test(date)&&!Number.isNaN(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date?date.slice(0,7):null;}
function amount(value){const n=Number(value);return Number.isFinite(n)&&n>=0?Math.round(n*100):null;}
function summarize(entries,month){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return {month,totals:[],records:0};
 const byCurrency=new Map();let records=0;
 for(const e of Array.isArray(entries)?entries:[]){if(!e||monthKey(e.earnedDate||e.date)!==month)continue;
  const currency=String(e.currency||'USD').toUpperCase();if(!/^[A-Z]{3}$/.test(currency))continue;
  const gross=amount(e.gross??e.amount),fees=amount(e.fees??0),refunds=amount(e.refunds??0),tax=amount(e.tax??0);
  if([gross,fees,refunds,tax].some(v=>v===null)||gross<fees+refunds+tax)continue;
  byCurrency.set(currency,(byCurrency.get(currency)||0)+gross-fees-refunds-tax);records++;
 }
 return {month,records,totals:[...byCurrency].sort(([a],[b])=>a.localeCompare(b)).map(([currency,cents])=>({currency,net:cents/100}))};
}
function context(entries,month,goals){const income=summarize(entries,month);const targets=Array.isArray(goals?.totals)?goals.totals:[];return {...income,rows:[...new Set([...income.totals.map(x=>x.currency),...targets.map(x=>x.currency)])].sort().map(currency=>({currency,earned:income.totals.find(x=>x.currency===currency)?.net??0,goal:targets.find(x=>x.currency===currency)?.amount??0,hasEarned:income.totals.some(x=>x.currency===currency),hasGoal:targets.some(x=>x.currency===currency)}))};}
const api={summarize,context,monthKey};root.CloutFlowGrowthIncomeContext=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
