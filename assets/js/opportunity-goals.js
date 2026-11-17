/* Goals are user-entered planning targets, never attributed revenue or forecasts. */
(function(root){'use strict';
function summarize(ideas,planApi,store){const ids=new Set((Array.isArray(ideas)?ideas:[]).map(x=>x.id));const plans=planApi&&store?planApi.read(store):{};const totals={};let planned=0,withTargets=0;
for(const [id,p] of Object.entries(plans)){if(!ids.has(id))continue;planned++;if(p.target>0){withTargets++;const cents=Math.round(p.target*100);totals[p.currency]=(totals[p.currency]||0)+cents;}}
return {planned,withTargets,totals:Object.entries(totals).sort(([a],[b])=>a.localeCompare(b)).map(([currency,cents])=>({currency,amount:cents/100}))};}
function format(currency,amount){try{return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(amount)}catch{return currency+' '+amount.toFixed(2)}}
const api={summarize,format};root.CloutFlowOpportunityGoals=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
