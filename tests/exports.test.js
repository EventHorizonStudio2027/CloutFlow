const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../assets/js/app.js'),'utf8');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i);assert(i>=0&&j>i);return src.slice(i,j)}
const context=vm.createContext({});
vm.runInContext([
 slice('const $=id=>','function toast(s)'),
 slice('function csvCell(v){','function exportAdjustmentCSV(){'),
 slice('function parseCSV(text){','let pendingImport=null;'),
 slice('function exportPayoutReconciliation(){','function settlementRows('),
 slice('function settlementRows(','function renderSettlementReview()'),
 slice('function exportSettlementReview(){',"$('exportSettlementReview').onclick="),
 slice('function exportAdjustmentCSV(){','function recoveryReviewRows(){'),
 slice('function recoveryReviewRows(){','function exportRecoveryCSV(){'),
 slice('function exportRecoveryCSV(){','function exportCSV(){')
].join('\n'),context);
context.download=(name,body)=>{context.result={name,body}};context.toast=()=>{};
context.entries=[{id:'earn-1',channel:'app',platform:'Google Play',account:'Game',incomeType:'Subscriptions',currency:'USD',gross:100,fees:10,refunds:0,tax:0,earnedDate:'2026-01-01',payoutDate:'',status:'Pending',reference:'sale-1',description:'One, "two"\nthree'}];
context.payouts=[{id:'pay-1',received:'2026-02-01',platform:'Google Play',account:'Game',currency:'USD',amount:75,allocations:[{entryId:'earn-1',amount:60}],reference:'=DANGEROUS()',notes:'Settlement, first'}];
context.adjustments=[{id:'adj-1',date:'2026-02-02',platform:'Google Play',account:'Game',currency:'USD',type:'Refund',amount:-20,reference:'refund-1',entryId:'earn-1',recovered:5,recoveryDate:'2026-02-03',recoveryReference:'settlement-2',recoveryPayoutId:'',notes:'Partial recovery'}];
context.allocatedTo=id=>id==='earn-1'?60:0;
context.__entries=context.entries;context.__payouts=context.payouts;context.__adjustments=context.adjustments;vm.runInContext('entries=__entries;payouts=__payouts;adjustments=__adjustments',context);
function rows(){context.__body=context.result.body.replace(/^\uFEFF/,'');return Array.from(vm.runInContext('parseCSV(__body)',context),r=>Array.from(r))}
function run(name){vm.runInContext(name+'()',context);return rows()}
const tests=[
 ['payout worksheet has correct columns and allocation',()=>{const r=run('exportPayoutReconciliation');assert.equal(r[0].length,11);assert.equal(r[1].length,11);assert.equal(r[1][5],'75');assert.equal(r[1][6],'60');assert.equal(r[1][7],'15');assert.equal(r[1][10],'earn-1:60')}],
 ['payout worksheet neutralizes formula references',()=>{const r=run('exportPayoutReconciliation');assert.equal(r[1][8],"'=DANGEROUS()") }],
 ['settlement worksheet preserves quoted multiline descriptions',()=>{const r=run('exportSettlementReview');assert.equal(r[0].length,16);assert.equal(r[1].length,16);assert.equal(r[1][9],'90');assert.equal(r[1][10],'60');assert.equal(r[1][11],'30');assert.equal(r[1][15],'One, "two"\nthree')}],
 ['adjustments worksheet preserves negative values',()=>{const r=run('exportAdjustmentCSV');assert.equal(r[0].length,14);assert.equal(r[1][6],'-20');assert.equal(r[1][9],'5')}],
 ['recovery review worksheet preserves confirmed and unconfirmed values',()=>{const r=run('exportRecoveryCSV');assert.equal(r[0].length,14);assert.equal(r[1][5],'20');assert.equal(r[1][6],'5');assert.equal(r[1][7],'15')}],
];
let passed=0;for(const [name,fn] of tests){try{fn();passed++;console.log('PASS:',name)}catch(err){console.error('FAIL:',name);throw err}}console.log(`${passed}/${tests.length} export integration tests passed`);
