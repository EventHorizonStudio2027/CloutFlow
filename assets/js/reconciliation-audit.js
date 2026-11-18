/* CloutFlow: read-only payout reconciliation audit. Never modifies financial records. */
(function(root){
 'use strict';
 const key=v=>String(v??'').trim().toLocaleLowerCase('en-US');
 const money=v=>{
  if(typeof v==='string'&&!/^-?\d+(?:\.\d{1,2})?$/.test(v.trim()))return null;
  if(typeof v!=='string'&&typeof v!=='number')return null;
  const n=Number(v);return Number.isFinite(n)&&Math.abs(n)<=1e12?Math.round(n*100):null;
 };
 const identity=p=>[key(p.platform),key(p.account),key(p.currency),key(p.reference)].join('\u001f');
 function audit(deposits){
  if(!Array.isArray(deposits))return {issues:[{code:'invalid-input',indices:[]}],summary:{checked:0,invalid:0,duplicateGroups:0}};
  const issues=[],seen=new Map();
  deposits.forEach((p,i)=>{
   if(!p||typeof p!=='object'||Array.isArray(p)){issues.push({code:'invalid-record',indices:[i]});return;}
   const amount=money(p.amount);
   if(amount===null||amount<=0)issues.push({code:'invalid-amount',indices:[i]});
   if(typeof p.received!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.received)||Number.isNaN(Date.parse(p.received+'T00:00:00Z'))||new Date(p.received+'T00:00:00Z').toISOString().slice(0,10)!==p.received)issues.push({code:'invalid-date',indices:[i]});
   if(!key(p.platform)||!key(p.currency))issues.push({code:'missing-identity',indices:[i]});
   // A reference is only comparable within the same platform/account/currency.
   if(key(p.reference)&&key(p.platform)&&key(p.currency)){
    const k=identity(p);if(!seen.has(k))seen.set(k,[]);seen.get(k).push(i);
   }
  });
  let duplicateGroups=0;
  for(const indices of seen.values())if(indices.length>1){
   duplicateGroups++;issues.push({code:'repeated-reference',indices});
  }
  return {issues,summary:{checked:deposits.length,invalid:issues.filter(x=>x.code!=='repeated-reference').length,duplicateGroups}};
 }
 const api={audit,money};root.CloutFlowReconciliationAudit=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
