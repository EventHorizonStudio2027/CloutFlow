const assert=require('node:assert/strict');
const {analyze}=require('../assets/js/payout-reliability');
const dues=[
 {id:'a',due:'2026-09-15',platform:'YouTube',currency:'USD',amount:100},
 {id:'a',due:'2026-10-15',platform:'YouTube',currency:'USD',amount:100},
 {id:'a',due:'2026-11-15',platform:'YouTube',currency:'USD',amount:100},
 {id:'b',due:'2026-10-15',platform:'Twitch',currency:'EUR',amount:50},
 {id:'a',due:'2026-12-15',platform:'YouTube',currency:'USD',amount:100}
];
const payouts=[
 {id:'p1',currency:'USD',amount:100,received:'2026-09-14'},
 {id:'p2',currency:'USD',amount:100,received:'2026-10-18'},
 {id:'p3',currency:'USD',amount:20,received:'2026-11-16'},
 {id:'p4',currency:'EUR',amount:50,received:'2026-10-12'}
];
const links=[
 {agreementId:'a',due:'2026-09-15',payoutId:'p1',amount:100},
 {agreementId:'a',due:'2026-10-15',payoutId:'p2',amount:100},
 {agreementId:'a',due:'2026-11-15',payoutId:'p3',amount:20},
 {agreementId:'b',due:'2026-10-15',payoutId:'p4',amount:50}
];
const result=analyze(dues,links,payouts,'2026-11-20');
assert.equal(result.error,'');
const usd=result.groups.find(x=>x.platform==='YouTube');
assert.deepEqual({count:usd.installments,fully:usd.fullyLinked,partial:usd.partiallyLinked,onTime:usd.linkedOnTime,late:usd.linkedLate},{count:3,fully:2,partial:1,onTime:1,late:1});
assert.equal(result.groups.find(x=>x.currency==='EUR').fullyLinked,1);
assert.equal(usd.coveragePercent,67);
assert.equal(usd.coverageLabel,'Developing history');
assert.equal(result.groups.find(x=>x.currency==='EUR').coverageLabel,'Limited history');
assert.equal(analyze(dues,links,payouts,'2026-02-30').error,'Invalid reliability inputs');
assert.equal(analyze(dues,links,payouts,'2026-11-20').excluded,0,'future installments are not invalid history');
assert.equal(analyze(dues,[...links,links[0]],payouts,'2026-11-20').excluded,1);
assert.equal(analyze([...dues,dues[0]],links,payouts,'2026-11-20').excluded,1);
assert.equal(analyze(dues,links,[...payouts,payouts[0]],'2026-11-20').groups.find(x=>x.platform==='YouTube').fullyLinked,1);
assert.equal(analyze(dues,[...links,{agreementId:'a',due:'2026-09-15',payoutId:'p2',amount:100}],payouts,'2026-11-20').excluded,1);
console.log('Historical payout linkage reliability tests passed');
