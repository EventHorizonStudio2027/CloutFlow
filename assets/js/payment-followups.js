/* Local-only follow-up notes for expected installments; never ledger entries. */
(function(root){'use strict';
const KEY='cloutflow_payment_followups_v1';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
function dateValid(v){if(!DATE.test(v))return false;const d=new Date(v+'T00:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===v;}
function key(agreementId,due){if(typeof agreementId!=='string'||!agreementId.trim()||!dateValid(due))throw Error('Invalid installment reference');return JSON.stringify([agreementId,due]);}
function validate(record){return record&&typeof record==='object'&&!Array.isArray(record)&&typeof record.agreementId==='string'&&record.agreementId.trim().length>0&&record.agreementId.length<=200&&dateValid(record.due)&&typeof record.note==='string'&&record.note.length<=1000&&['none','contacted','waiting','resolved'].includes(record.status)&&(!record.remindOn||dateValid(record.remindOn))&&typeof record.updated==='string'&&dateValid(record.updated);}
function read(store){try{const raw=store.getItem(KEY);if(raw===null)return {records:[],error:''};const data=JSON.parse(raw);if(!Array.isArray(data)||data.length>10000||!data.every(validate))throw Error('Invalid saved follow-ups');const ids=new Set();for(const r of data){const k=key(r.agreementId,r.due);if(ids.has(k))throw Error('Duplicate follow-up');ids.add(k)}return {records:data,error:''}}catch{return {records:[],error:'Saved payment follow-ups cannot be read. Editing is disabled to protect the original data.'}}}
function save(store,records){if(!Array.isArray(records)||records.length>10000||!records.every(validate))return false;const keys=records.map(r=>key(r.agreementId,r.due));if(new Set(keys).size!==keys.length)return false;try{if(read(store).error)return false;store.setItem(KEY,JSON.stringify(records));return true}catch{return false}}
function upsert(records,entry){if(!validate(entry))throw Error('Invalid follow-up');const k=key(entry.agreementId,entry.due);return [...records.filter(r=>key(r.agreementId,r.due)!==k),entry]}
function remove(records,agreementId,due){const k=key(agreementId,due);return records.filter(r=>key(r.agreementId,r.due)!==k)}
function reminders(records,today){if(!dateValid(today))throw Error('Invalid current date');return records.filter(r=>r.remindOn&&r.remindOn<=today&&r.status!=='resolved').sort((a,b)=>a.remindOn.localeCompare(b.remindOn)||a.due.localeCompare(b.due));}
const api={KEY,key,validate,read,save,upsert,remove,reminders};root.CloutFlowPaymentFollowups=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
