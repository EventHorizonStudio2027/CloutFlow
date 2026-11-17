const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../assets/js/app.js'),'utf8');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i);assert(i>=0&&j>i,`Missing section ${a}`);return src.slice(i,j)}
const sandbox={};vm.createContext(sandbox);
const setup=[
 slice('const $=id=>','function toast(s)'),
 slice('function payoutReconciliationSummary(','function renderReconciliationSummary()'),
 slice('function settlementRows(','function renderSettlementReview()'),
 slice('function payoutFinancialDetailsChanged(','$(\'payoutForm\').onsubmit='),
 slice('function matchingRecoveryPayouts(','function renderLinkedAdjustmentReview()')
].join('\n');
vm.runInContext(setup,sandbox);
function run(code){return vm.runInContext(code,sandbox)}
function entry(id,amount=100,extra={}){return {id,platform:'YouTube',account:'Main',currency:'USD',gross:amount,fees:0,refunds:0,tax:0,earnedDate:'2026-01-01',status:'Pending',payoutDate:'',...extra}}
function payout(id,amount,allocations=[],extra={}){return {id,platform:'YouTube',account:'Main',currency:'USD',amount,received:'2026-02-01',allocations,...extra}}
function adjustment(id,amount,extra={}){return {id,date:'2026-02-10',platform:'YouTube',account:'Main',currency:'USD',type:amount<0?'Refund':'Correction',amount,recovered:0,recoveryDate:'',recoveryReference:'',recoveryPayoutId:'',entryId:'',reference:'',...extra}}
function invoke(name,...args){sandbox.__args=args;return run(name+'(...__args)')}
const tests=[
 ['net deducts fees, refunds and tax',()=>assert.equal(invoke('net',entry('e',100,{fees:10,refunds:5,tax:2})),83)],
 ['validMoney rejects fractional cents and negatives',()=>{assert.equal(invoke('validMoney',1.001),false);assert.equal(invoke('validMoney',-1),false);assert.equal(invoke('validMoney',1.25),true)}],
 ['deposit cannot allocate more than its amount',()=>assert.match(invoke('validatePayoutData',payout('p',40,[{entryId:'e',amount:50}]),[entry('e')],[]),/exceed/i)],
 ['deposit cannot allocate beyond earnings',()=>assert.match(invoke('validatePayoutData',payout('p',200,[{entryId:'e',amount:110}]),[entry('e')],[]),/outstanding/i)],
 ['duplicate allocations rejected',()=>assert.match(invoke('validatePayoutData',payout('p',100,[{entryId:'e',amount:30},{entryId:'e',amount:30}]),[entry('e')],[]),/more than once/i)],
 ['cross-payout over-allocation rejected',()=>assert.match(invoke('validatePayoutData',payout('new',80,[{entryId:'e',amount:60}]),[entry('e')],[payout('old',70,[{entryId:'e',amount:70}])]),/outstanding/i)],
 ['same payout can be edited without counting itself twice',()=>assert.equal(invoke('validatePayoutData',payout('old',70,[{entryId:'e',amount:70}]),[entry('e')],[payout('old',70,[{entryId:'e',amount:70}])]),'')],
 ['payout account mismatch rejected',()=>assert.match(invoke('validatePayoutData',payout('p',50,[{entryId:'e',amount:30}],{account:'Different'}),[entry('e')],[]),/account/i)],
 ['payout date cannot precede earnings',()=>assert.match(invoke('validatePayoutData',payout('p',50,[{entryId:'e',amount:30}],{received:'2025-12-31'}),[entry('e')],[]),/predate/i)],
 ['reconciliation keeps currencies separate',()=>{const r=invoke('payoutReconciliationSummary',[entry('usd',100),entry('eur',50,{currency:'EUR'})],[payout('p',40,[{entryId:'usd',amount:30}])],[],()=>true);assert.equal(r.length,2);assert.equal(r.find(x=>x.currency==='USD').unallocated,10);assert.equal(r.find(x=>x.currency==='EUR').received,0)}],
 ['reconciliation includes signed adjustments only once',()=>{const r=invoke('payoutReconciliationSummary',[entry('e')],[payout('p',90,[{entryId:'e',amount:90}])],[adjustment('r',-20,{entryId:'e',recovered:20,recoveryDate:'2026-02-12',recoveryReference:'statement'})],()=>true)[0];assert.equal(r.adjustedNet,80);assert.equal(r.received,90);assert.equal(r.allocated,90)}],
 ['partial settlement correctly computed',()=>{const r=invoke('settlementRows',[entry('e')],[payout('p',40,[{entryId:'e',amount:40}])])[0];assert.equal(r.remaining,60);assert.equal(r.settlementStatus,'Partially allocated')}],
 ['legacy paid is not mistaken for allocated',()=>{const r=invoke('settlementRows',[entry('e',100,{status:'Paid',payoutDate:'2026-02-01'})],[])[0];assert.equal(r.allocated,0);assert.equal(r.settlementStatus,'Legacy paid — not allocated')}],
 ['allocation reordering does not count as financial edit',()=>{const p=payout('p',70,[{entryId:'a',amount:30},{entryId:'b',amount:40}]);assert.equal(invoke('payoutFinancialDetailsChanged',p,{...p,allocations:[...p.allocations].reverse()}),false)}],
 ['linked refund must match original earnings',()=>assert.match(invoke('validateAdjustment',adjustment('r',-20,{entryId:'e',account:'Wrong'}),[entry('e')],[]),/match/i)],
 ['recovery requires a statement reference',()=>assert.match(invoke('validateAdjustment',adjustment('r',-20,{recovered:10,recoveryDate:'2026-02-12'}),[],[]),/reference/i)],
 ['recovery cannot exceed refund',()=>assert.match(invoke('validateAdjustment',adjustment('r',-20,{recovered:21,recoveryDate:'2026-02-12',recoveryReference:'statement'}),[],[]),/exceed/i)],
 ['recovery payout must be same currency',()=>assert.match(invoke('validateAdjustment',adjustment('r',-20,{recovered:10,recoveryDate:'2026-02-12',recoveryReference:'statement',recoveryPayoutId:'p'}),[],[payout('p',100,[],{currency:'EUR',received:'2026-02-13'})]),/currency/i)],
];
let passed=0;for(const [name,fn] of tests){try{fn();passed++;console.log('PASS:',name)}catch(err){console.error('FAIL:',name);throw err}}
console.log(`${passed}/${tests.length} financial regression tests passed`);
