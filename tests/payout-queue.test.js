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
assert.deepEqual(totals(result),[{currency:'EUR',count:1,remaining:20.1},{currency:'USD',count:2,remaining:69.9}]);
assert.equal(records[0].allocations[0].amount,40.1);
assert.deepEqual(pending([]),[]);
assert.deepEqual(totals([]),[]);
assert.equal(pending([{id:'tiny',received:'2026-11-01',currency:'USD',amount:.3,allocations:[{amount:.1},{amount:.2}]}]).length,0);
console.log('Payout attention queue: 7 assertions passed');
