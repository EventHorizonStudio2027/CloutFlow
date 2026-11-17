const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/app.js'),'utf8');
const begin=source.indexOf('function validDate(');
const end=source.indexOf('function validatePayoutData(',begin);
assert(begin>=0&&end>begin);
const ctx={};vm.createContext(ctx);
vm.runInContext(source.slice(begin,end),ctx);
const run=data=>{ctx.__data=data;return vm.runInContext('validateRawFinancialRecords(__data)',ctx)};
const income={id:'earning-1',gross:100,fees:0,refunds:0,tax:0};
const base=()=>({entries:[{...income}],accounts:[],payouts:[],adjustments:[]});
const cases=[
 ['valid data',d=>d,''],
 ['missing gross',d=>{delete d.entries[0].gross;return d},/gross amount/],
 ['zero gross',d=>{d.entries[0].gross=0;return d},/gross amount/],
 ['negative gross',d=>{d.entries[0].gross=-1;return d},/gross amount/],
 ['fractional cents',d=>{d.entries[0].gross=12.345;return d},/gross amount/],
 ['missing income id',d=>{delete d.entries[0].id;return d},/identifier/],
 ['empty account id',d=>{d.accounts=[{id:'',name:'Main'}];return d},/identifier/],
 ['missing payout id',d=>{d.payouts=[{amount:20,allocations:[]}];return d},/identifier/],
 ['missing allocation entry id',d=>{d.payouts=[{id:'p',amount:20,allocations:[{amount:10}]}];return d},/allocation/],
 ['zero allocation',d=>{d.payouts=[{id:'p',amount:20,allocations:[{entryId:'earning-1',amount:0}]}];return d},/allocation/],
 ['repeated earnings allocation',d=>{d.payouts=[{id:'p',amount:20,allocations:[{entryId:'earning-1',amount:5},{entryId:'earning-1',amount:5}]}];return d},/more than once/],
 ['missing adjustment id',d=>{d.adjustments=[{amount:-10}];return d},/identifier/],
 ['duplicate income identifiers',d=>{d.entries.push({...income});return d},/Duplicate income/],
 ['duplicate account identifiers',d=>{d.accounts=[{id:'a',name:'One'},{id:'a',name:'Two'}];return d},/Duplicate account/],
 ['duplicate payout identifiers',d=>{d.payouts=[{id:'p',amount:20,allocations:[]},{id:'p',amount:30,allocations:[]}];return d},/Duplicate payout/],
 ['duplicate adjustment identifiers',d=>{d.adjustments=[{id:'a'},{id:'a'}];return d},/Duplicate adjustment/],
 ['non-array entries',d=>{d.entries={};return d},/array/],
 ['missing optional deductions',d=>{delete d.entries[0].fees;return d},''],
];
for(const [name,modify,expected] of cases){const result=run(modify(base()));if(typeof expected==='string')assert.equal(result,expected,name);else assert.match(result,expected,name);console.log('PASS:',name)}
console.log(`${cases.length}/${cases.length} raw-data integrity tests passed`);
