const assert=require('node:assert/strict');
const {pending,totals}=require('../assets/js/payout-queue.js');
const records=[
 {id:'b',received:'2026-11-02',platform:'Twitch',account:'Main',currency:'USD',amount:100,allocations:[{entryId:'x',amount:40.1}]},
 {id:'a',received:'2026-11-01',platform:'YouTube',account:'Main',currency:'EUR',amount:25.3,allocations:[{entryId:'y',amount:5.2}]},
 {id:'c',received:'2026-11-03',platform:'Twitch',account:'Main',currency:'USD',amount:50,allocations:[{entryId:'z',amount:50}]},
 {id:'d',received:'2026-11-04',platform:'Twitch',account:'Main',currency:'USD',amount:10,allocations:[]}
];
const result=pending(records);
assert.deepEqual(result.map(p=>p.id),['a','b','d']);
assert.deepEqual(result.map(p=>p.remaining),[20.1,59.9,10]);
assert.deepEqual(totals(result),[{currency:'EUR',count:1,overallocated:0,remaining:20.1},{currency:'USD',count:2,overallocated:0,remaining:69.9}]);
assert.equal(records[0].allocations[0].amount,40.1);
assert.deepEqual(pending([]),[]);
assert.deepEqual(pending(null),[]);
assert.deepEqual(pending({}),[]);
const malformed=[
 {id:'bad-amount',received:'2026-11-01',amount:'not-money',allocations:[]},
 {id:'negative',received:'2026-11-01',amount:20,allocations:[{amount:-5}]},
 {id:'bad-allocation',received:'2026-11-01',amount:20,allocations:[{amount:Infinity}]},
 {id:'bad-date',amount:20,allocations:[]},
 {id:'invalid-date',received:'2026-02-30',amount:10},
 {id:'invalid-currency',received:'2026-11-01',currency:'US$',amount:10},
 {id:'blank-money',received:'2026-11-01',amount:''},
 {id:'space-money',received:'2026-11-01',amount:'   '},
 {id:'boolean-money',received:'2026-11-01',amount:false},
 {id:'fractional-cent',received:'2026-11-01',amount:10.001},
 {id:'fractional-allocation',received:'2026-11-01',amount:10,allocations:[{amount:1.001}]},
 {id:'valid',received:'2026-11-05',amount:20,allocations:[{amount:5}]}
];
assert.deepEqual(pending(malformed).map(p=>p.id),['valid']);
assert.deepEqual(totals([]),[]);
const over=pending([{id:'over',received:'2026-11-06',currency:'USD',amount:10,allocations:[{amount:12}]}]);
assert.equal(over.length,1,'overallocated deposits stay visible for correction');
assert.equal(over[0].overallocated,true);
assert.equal(over[0].remaining,0);
assert.deepEqual(totals(over),[{currency:'USD',count:0,overallocated:1,remaining:0}]);
assert.deepEqual(totals(pending([{id:'bad',received:'2026-11-01',amount:10,allocations:[{amount:-2}]}])),[]);
assert.equal(pending([{id:'tiny',received:'2026-11-01',currency:'USD',amount:.3,allocations:[{amount:.1},{amount:.2}]}]).length,0);
console.log('Payout attention queue: validation and over-allocation assertions passed');
