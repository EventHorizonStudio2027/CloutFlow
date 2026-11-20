/* Explicit creator-reviewed links between expected agreement installments and ledger deposits.
   Links are evidence of allocation, not a modification of earned income or deposits. */
(function(root){'use strict';
const KEY='cloutflow_agreement_settlements_v1';
const dateValid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const cents=n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=Number.MAX_SAFE_INTEGER/100&&Math.abs(n*100-Math.round(n*100))<1e-6?Math.round(n*100):null;
const installmentKey=(id,due)=>JSON.stringify([id,due]);
function validate(rows){if(!Array.isArray(rows)||rows.length>5000)return 'Invalid settlement records';const keys=new Set();for(const r of rows){if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.agreementId!=='string'||!r.agreementId.trim()||r.agreementId.length>200||!dateValid(r.due)||typeof r.payoutId!=='string'||!r.payoutId.trim()||r.payoutId.length>200||cents(r.amount)===null)return 'Invalid settlement record';const k=JSON.stringify([r.agreementId,r.due,r.payoutId]);if(keys.has(k))return 'Duplicate settlement link';keys.add(k)}return ''}
function read(store){try{const raw=store.getItem(KEY);const rows=raw===null?[]:JSON.parse(raw);const error=validate(rows);return error?{records:[],error}:{records:rows,error:''}}catch{return {records:[],error:'Saved settlement links cannot be read'}}}
function save(store,rows){if(validate(rows))return false;try{if(read(store).error)return false;store.setItem(KEY,JSON.stringify(rows));return true}catch{return false}}
function allocation(rows,agreementId,due){return rows.filter(r=>r.agreementId===agreementId&&r.due===due).reduce((n,r)=>n+(cents(r.amount)||0),0)}
function reconcile(dueRows,payouts,links){
 const issues=[],paid=new Map(),used=new Map();
 if(!Array.isArray(dueRows)||!Array.isArray(payouts)||validate(links)){return {paid,used,issues:[{reason:'Invalid reconciliation input'}]}}
 const byPayout=new Map(),dueByKey=new Map();
 for(const p of payouts){if(!p||typeof p.id!=='string'||!p.id.trim()||byPayout.has(p.id)||!Number.isInteger(cents(p.amount))||typeof p.currency!=='string'||!/^[A-Z]{3}$/.test(p.currency)){issues.push({payoutId:p?.id||'',reason:'Invalid or duplicate deposit record'});continue}byPayout.set(p.id,p)}
 for(const d of dueRows){if(!d||typeof d.id!=='string'||!d.id.trim()||!dateValid(d.due)||!Number.isInteger(cents(d.amount))||typeof d.currency!=='string'||!/^[A-Z]{3}$/.test(d.currency)){issues.push({installment:d?.id||'',reason:'Invalid installment record'});continue}const k=installmentKey(d.id,d.due);if(dueByKey.has(k)){issues.push({installment:k,reason:'Duplicate installment record'});continue}dueByKey.set(k,d)}
 for(const r of links){const d=dueByKey.get(installmentKey(r.agreementId,r.due)),p=byPayout.get(r.payoutId);if(!d||!p){issues.push({link:r,reason:!d?'Agreement installment unavailable':'Deposit unavailable or invalid'});continue}if(d.currency!==p.currency){issues.push({link:r,reason:'Currency mismatch'});continue}const amount=cents(r.amount),pAmount=cents(p.amount),dAmount=cents(d.amount);if(amount===null||pAmount===null||dAmount===null){issues.push({link:r,reason:'Invalid payment amount'});continue}const pk=installmentKey(d.id,d.due),nextPaid=(paid.get(pk)||0)+amount,nextUsed=(used.get(p.id)||0)+amount;if(!Number.isSafeInteger(nextPaid)||!Number.isSafeInteger(nextUsed)){issues.push({link:r,reason:'Allocation total exceeds safe monetary limits'});continue}paid.set(pk,nextPaid);used.set(p.id,nextUsed)}
 for(const [key,value] of paid){const d=dueByKey.get(key);if(d&&value>cents(d.amount))issues.push({installment:key,reason:'Allocated above expected amount'})}
 for(const [id,value] of used){const p=byPayout.get(id);if(p&&value>cents(p.amount))issues.push({payoutId:id,reason:'Deposit allocated above recorded amount'})}
 return {paid,used,issues};
}
function link(rows,dueRows,payouts,agreementId,due,payoutId,amount){if(validate(rows))return {error:'Settlement storage invalid'};if(!Array.isArray(dueRows)||!Array.isArray(payouts))return {error:'Installment or deposit data invalid'};const d=dueRows.find(x=>x.id===agreementId&&x.due===due),p=payouts.find(x=>x.id===payoutId);if(!d||!p)return {error:'Agreement installment or deposit is missing'};if(d.currency!==p.currency)return {error:'Currencies must match'};const value=cents(amount);if(!value)return {error:'Enter a positive amount in cents'};const existing=rows.filter(r=>!(r.agreementId===agreementId&&r.due===due&&r.payoutId===payoutId));const next=[...existing,{agreementId,due,payoutId,amount:value/100}];const report=reconcile(dueRows,payouts,next);if(report.issues.length)return {error:report.issues[0].reason};return {records:next,error:''}}
function unlink(rows,agreementId,due,payoutId){return rows.filter(r=>!(r.agreementId===agreementId&&r.due===due&&r.payoutId===payoutId))}
const api={KEY,validate,read,save,link,unlink,reconcile,allocation,installmentKey,dateValid,cents};root.CloutFlowAgreementSettlements=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
