'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/app.js'),'utf8');
function slice(a,b){const i=source.indexOf(a),j=source.indexOf(b,i);assert(i>=0&&j>i,`Missing ${a}`);return source.slice(i,j)}
const ctx={};vm.createContext(ctx);
vm.runInContext([
 slice('const $=id=>','function toast(s)'),
 slice('function validDate(','function toast(s)'),
 slice('function auditLedgerDetailed(','function auditLedgerData('),
 slice('function payoutReconciliationSummary(','function renderReconciliationSummary()'),
 slice('function settlementRows(','function renderSettlementReview()'),
 slice('function validateAdjustment(','function renderLinkedAdjustmentReview()'),
 slice('function validateRecoveryMatch(','function validateAdjustment(')
].join('\n'),ctx);
function call(name,...args){ctx.__args=args;return vm.runInContext(name+'(...__args)',ctx)}
const e=(id='income',over={})=>({id,platform:'YouTube',account:'Creator A',currency:'USD',gross:100,fees:10,refunds:0,tax:0,earnedDate:'2026-01-10',payoutDate:'',status:'Pending',...over});
const p=(id='deposit',over={})=>({id,platform:'YouTube',account:'Creator A',currency:'USD',amount:50,received:'2026-02-10',reference:'DEP-1',allocations:[{entryId:'income',amount:50}],...over});
const a=(id='refund',over={})=>({id,date:'2026-02-20',platform:'YouTube',account:'Creator A',currency:'USD',type:'Refund',amount:-20,recovered:0,recoveryDate:'',recoveryReference:'',recoveryPayoutId:'',entryId:'income',reference:'REF-1',...over});
let count=0;
function test(name,fn){try{fn();count++;console.log('PASS:',name)}catch(error){console.error('FAIL:',name);throw error}}
const clean=()=>[e()];
test('earnings then partial deposit keeps 40 outstanding',()=>{const rows=call('settlementRows',clean(),[p()]);assert.equal(rows[0].earned,90);assert.equal(rows[0].allocated,50);assert.equal(rows[0].remaining,40)});
test('second deposit completes allocation',()=>{const rows=call('settlementRows',clean(),[p(),p('deposit2',{reference:'DEP-2',amount:40,allocations:[{entryId:'income',amount:40}]})]);assert.equal(rows[0].remaining,0);assert.equal(rows[0].settlementStatus,'Fully allocated')});
test('third deposit over-allocation detected across deposits',()=>{const deposits=[p(),p('deposit2',{reference:'DEP-2',amount:50,allocations:[{entryId:'income',amount:50}]})];assert(call('auditLedgerDetailed',clean(),[],deposits).some(x=>x.level==='error'&&/outstanding|exceed/i.test(x.message)))});
test('refund after partial payout reduces revenue but not bank deposits',()=>{const summary=call('payoutReconciliationSummary',clean(),[p()],[a()],()=>true)[0];assert.equal(summary.earnedNet,90);assert.equal(summary.adjustedNet,70);assert.equal(summary.received,50);assert.equal(summary.allocated,50)});
test('confirmed recovery does not double subtract revenue',()=>{const refund=a('refund',{recovered:10,recoveryDate:'2026-03-10',recoveryReference:'REC-1'});assert.equal(call('validateAdjustment',refund,clean(),[p()]),'');const summary=call('payoutReconciliationSummary',clean(),[p()],[refund],()=>true)[0];assert.equal(summary.adjustedNet,70)});
test('matching recovery to deposit is validated',()=>{const deposit=p('deposit',{received:'2026-03-10'});const refund=a('refund',{recovered:10,recoveryDate:'2026-03-10',recoveryReference:'REC-1',recoveryPayoutId:'deposit'});assert.equal(call('validateAdjustment',refund,clean(),[deposit]),'')});
test('recovery cannot be matched to earlier deposit',()=>{const refund=a('refund',{recovered:10,recoveryDate:'2026-03-10',recoveryReference:'REC-1',recoveryPayoutId:'deposit'});assert.match(call('validateAdjustment',refund,clean(),[p()]),/date|recovery|preced|before/i)});
test('duplicate deposit references trigger audit warning',()=>{const deposits=[p(),p('deposit2',{amount:10,allocations:[],reference:' dep-1 '})];assert(call('auditLedgerDetailed',clean(),[],deposits).some(x=>x.level==='warning'&&/Repeated deposit reference/.test(x.message)))});
test('same reference in a different account is not flagged',()=>{const deposits=[p(),p('deposit2',{account:'Creator B',amount:10,allocations:[],reference:'DEP-1'})];assert(!call('auditLedgerDetailed',clean(),[],deposits).some(x=>/Repeated deposit reference/.test(x.message)))});
test('duplicate deposit references are warnings, not destructive errors',()=>{const deposits=[p(),p('deposit2',{amount:10,allocations:[],reference:'DEP-1'})];const findings=call('auditLedgerDetailed',clean(),[],deposits);assert(findings.some(x=>x.level==='warning'&&/Repeated deposit reference/.test(x.message)));assert(!findings.some(x=>x.level==='error'))});
test('legacy paid is distinct from actual deposit allocation',()=>{const entry=e('income',{status:'Paid',payoutDate:'2026-02-10'});const summary=call('payoutReconciliationSummary',[entry],[],[],()=>true)[0];assert.equal(summary.received,0);assert.equal(summary.legacyPaid,90)});
test('a paid legacy transaction allocated again triggers error',()=>{const entry=e('income',{status:'Paid',payoutDate:'2026-02-10'});assert(call('auditLedgerDetailed',[entry],[],[p()]).some(x=>x.level==='error'&&/double counting/i.test(x.message)))});
console.log(`${count}/${count} lifecycle tests passed`);
