/* Read-only historical agreement settlement reliability, not bank verification. */
(function(root){'use strict';
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const cents=n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=Number.MAX_SAFE_INTEGER/100&&Math.abs(n*100-Math.round(n*100))<1e-6?Math.round(n*100):null;
function analyze(dueRows,links,payouts,asOf){
 if(!validDate(asOf)||!Array.isArray(dueRows)||!Array.isArray(links)||!Array.isArray(payouts))return {groups:[],excluded:0,error:'Invalid reliability inputs'};
 const deposits=new Map(),allocated=new Map(),seen=new Set(),bad=new Set(),invalidInstallments=new Set();let excluded=0;
 for(const p of payouts){if(!p||typeof p.id!=='string'||!p.id.trim()||deposits.has(p.id)||bad.has(p.id)||!validDate(p.received)||cents(p.amount)===null||typeof p.currency!=='string'){excluded++;if(p?.id){deposits.delete(p.id);bad.add(p.id)}continue}deposits.set(p.id,p)}
 for(const l of links){const installmentKey=l&&typeof l.agreementId==='string'&&validDate(l.due)?JSON.stringify([l.agreementId,l.due]):null;if(!l||typeof l.agreementId!=='string'||!validDate(l.due)||typeof l.payoutId!=='string'||cents(l.amount)===null){excluded++;if(installmentKey)invalidInstallments.add(installmentKey);continue}const key=JSON.stringify([l.agreementId,l.due,l.payoutId]);if(seen.has(key)){excluded++;if(installmentKey)invalidInstallments.add(installmentKey);continue}seen.add(key);const p=deposits.get(l.payoutId);if(!p){excluded++;if(installmentKey)invalidInstallments.add(installmentKey);continue}const k=JSON.stringify([l.agreementId,l.due]);const rows=allocated.get(k)||[];rows.push({amount:cents(l.amount),received:p.received,currency:p.currency,payoutId:p.id});allocated.set(k,rows)}
 const payoutAllocations=new Map();for(const rows of allocated.values())for(const row of rows)payoutAllocations.set(row.payoutId,(payoutAllocations.get(row.payoutId)||0)+row.amount);
 const overallocatedPayouts=new Set([...payoutAllocations].filter(([id,amount])=>amount>cents(deposits.get(id)?.amount)).map(([id])=>id));
 const groups=new Map(),dueSeen=new Set(),details=[],exclusions=[];
 for(const d of dueRows){if(d&&validDate(d.due)&&d.due>=asOf)continue;if(!d||typeof d.id!=='string'||!d.id.trim()||!validDate(d.due)||typeof d.platform!=='string'||typeof d.currency!=='string'||!/^[A-Z]{3}$/.test(d.currency)||cents(d.amount)===null){excluded++;continue}
  const key=JSON.stringify([d.id,d.due]);if(invalidInstallments.has(key)){excluded++;exclusions.push({agreementId:d.id,due:d.due,reason:'Invalid or duplicate settlement link'});continue}if(dueSeen.has(key)){excluded++;continue}dueSeen.add(key);
  const allLinks=allocated.get(key)||[];if(allLinks.some(x=>x.currency!==d.currency||overallocatedPayouts.has(x.payoutId))){excluded++;exclusions.push({agreementId:d.id,due:d.due,reason:allLinks.some(x=>x.currency!==d.currency)?'Currency mismatch':'Deposit overallocated'});continue}
  const matching=allLinks,total=matching.reduce((n,x)=>n+x.amount,0),expected=cents(d.amount);
  if(total>expected||!Number.isSafeInteger(total)){excluded++;exclusions.push({agreementId:d.id,due:d.due,reason:'Installment overallocated'});continue}
  const status=total===expected?'fully-linked':total>0?'partially-linked':'unlinked';
  details.push({agreementId:d.id,name:typeof d.name==='string'?d.name:'',platform:d.platform.trim()||'Unspecified',currency:d.currency,due:d.due,expected:expected/100,linked:total/100,outstanding:(expected-total)/100,status});
  const gKey=JSON.stringify([d.platform.trim()||'Unspecified',d.currency]);const g=groups.get(gKey)||{platform:d.platform.trim()||'Unspecified',currency:d.currency,installments:0,fullyLinked:0,partiallyLinked:0,unlinked:0,linkedOnTime:0,linkedLate:0,expectedCents:0,linkedCents:0,outstandingCents:0};
  g.installments++;g.expectedCents+=expected;g.linkedCents+=total;g.outstandingCents+=expected-total;
  if(total===expected){g.fullyLinked++;const last=matching.map(x=>x.received).sort().at(-1);if(last<=d.due)g.linkedOnTime++;else g.linkedLate++}
  else if(total>0)g.partiallyLinked++;else g.unlinked++;
  groups.set(gKey,g);
 }
 return {quality:{validInstallments:details.length,disputedInstallments:exclusions.length,otherExcluded:Math.max(0,excluded-exclusions.length),complete:excluded===0},exclusions:exclusions.sort((a,b)=>b.due.localeCompare(a.due)),details:details.sort((a,b)=>b.due.localeCompare(a.due)||a.platform.localeCompare(b.platform)||a.agreementId.localeCompare(b.agreementId)),groups:[...groups.values()].map(g=>({...g,expected:g.expectedCents/100,linked:g.linkedCents/100,outstanding:g.outstandingCents/100,coveragePercent:Math.round(g.fullyLinked/g.installments*100),coverageLabel:g.installments<3?'Limited history':g.installments<6?'Developing history':'Established history'})).sort((a,b)=>a.platform.localeCompare(b.platform)||a.currency.localeCompare(b.currency)),excluded,error:''};
}
const api={analyze};root.CloutFlowPayoutReliability=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
