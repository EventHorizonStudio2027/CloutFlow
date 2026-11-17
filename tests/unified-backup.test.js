const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../assets/js/app.js'),'utf8');
const agreements=require('../assets/js/recurring-agreements.js');
const settlements=require('../assets/js/agreement-settlements.js');
const example={id:'a1',name:'Retainer',platform:'Direct / other',currency:'USD',frequency:'monthly',amount:100,start:'2026-01-31',end:'',status:'active'};
function storage(seed={}){const map=new Map(Object.entries(seed));return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
function runBackup(store){const start=src.indexOf('function backup(){'),end=src.indexOf('\n',start);const downloads=[],toasts=[];const context={entries:[],accounts:[],payouts:[],adjustments:[],CloutFlowRecurringAgreements:agreements,CloutFlowAgreementSettlements:settlements,CloutFlowPaymentFollowups:require('../assets/js/payment-followups.js'),localStorage:store,download:(...args)=>downloads.push(args),toast:s=>toasts.push(s)};vm.createContext(context);vm.runInContext(src.slice(start,end),context);vm.runInContext('backup()',context);return {downloads,toasts};}
const store=storage({[agreements.KEY]:JSON.stringify([example])});
let result=runBackup(store);assert.equal(result.downloads.length,1);assert.deepEqual(JSON.parse(result.downloads[0][1]).recurringAgreements,[example]);assert.deepEqual(JSON.parse(result.downloads[0][1]).agreementSettlements,[]);
result=runBackup(storage({[agreements.KEY]:'{invalid'}));assert.equal(result.downloads.length,0);assert.match(result.toasts[0],/blocked/i);
result=runBackup(storage({[settlements.KEY]:'{invalid'}));assert.equal(result.downloads.length,0);assert.match(result.toasts[0],/settlement/i);
result=runBackup(storage());assert.deepEqual(JSON.parse(result.downloads[0][1]).recurringAgreements,[]);
// Check that invalid agreement payloads are rejected before ledger validation or any confirmation.
const start=src.indexOf('function restore(text){'),end=src.indexOf('\n',start);assert(start>=0&&end>start);
const restoreSource=src.slice(start,end);
const testStore=storage({[agreements.KEY]:JSON.stringify([example])});
let confirms=0;
const context={CloutFlowRecurringAgreements:agreements,CloutFlowAgreementSettlements:settlements,localStorage:testStore,confirm:()=>{confirms++;return true},validateRawFinancialRecords:()=>'',entries:[],accounts:[],payouts:[],adjustments:[]};
vm.createContext(context);vm.runInContext(restoreSource,context);
for(const invalid of [[{...example,amount:-1}],[example,example],{}]){
 assert.throws(()=>vm.runInContext('restore('+JSON.stringify(JSON.stringify({version:4,entries:[],recurringAgreements:invalid}))+')',context),/invalid recurring agreements/i);
}
for(const invalid of [[{agreementId:'a1',due:'2026-01-31',payoutId:'p1',amount:-5}],{},[{agreementId:'a1',due:'2026-01-31',payoutId:'p1',amount:5},{agreementId:'a1',due:'2026-01-31',payoutId:'p1',amount:5}]]){assert.throws(()=>vm.runInContext('restore('+JSON.stringify(JSON.stringify({version:4,entries:[],recurringAgreements:[example],agreementSettlements:invalid}))+')',context),/settlement links invalid/i)}
assert.equal(confirms,0);assert.equal(testStore.getItem(agreements.KEY),JSON.stringify([example]));
console.log('Unified backup: agreement inclusion, corrupt-data blocking, and restore prevalidation passed');
const followups=require('../assets/js/payment-followups.js');
const followup={agreementId:'a1',due:'2026-02-28',status:'contacted',note:'Sent invoice',remindOn:'2026-03-05',updated:'2026-02-28'};
result=runBackup(storage({[agreements.KEY]:JSON.stringify([example]),[followups.KEY]:JSON.stringify([followup])}));
assert.equal(result.downloads.length,1);
assert.deepEqual(JSON.parse(result.downloads[0][1]).paymentFollowups,[followup]);
result=runBackup(storage({[followups.KEY]:'{broken'}));
assert.equal(result.downloads.length,0);
assert.match(result.toasts[0],/follow-ups require repair/i);
const followupContext={CloutFlowRecurringAgreements:agreements,CloutFlowAgreementSettlements:settlements,CloutFlowPaymentFollowups:followups,localStorage:storage(),confirm:()=>{confirms++;return true},validateRawFinancialRecords:()=>'',entries:[],accounts:[],payouts:[],adjustments:[]};
vm.createContext(followupContext);vm.runInContext(restoreSource,followupContext);
for(const invalid of [[{...followup,status:'wrong'}],[followup,followup],{bad:'shape'}]){
 assert.throws(()=>vm.runInContext('restore('+JSON.stringify(JSON.stringify({version:4,entries:[],recurringAgreements:[example],paymentFollowups:invalid}))+')',followupContext),/invalid payment follow-ups/i);
}
assert.throws(()=>vm.runInContext('restore('+JSON.stringify(JSON.stringify({version:4,entries:[],paymentFollowups:[followup]}))+')',followupContext),/must include recurring agreements/i);
console.log('Unified backup: follow-up inclusion, corruption protection, and prevalidation passed');

// Restore confirmation must enumerate every financial record class and explain legacy preservation.
assert.match(restoreSource,/restoreCounts/);
assert.match(restoreSource,/payment follow-ups/);
assert.match(restoreSource,/older backup does not contain/);
console.log('Restore confirmation includes a complete inventory and legacy-data notice');
