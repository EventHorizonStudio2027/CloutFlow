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
assert.equal(usd.expected,300);
assert.equal(result.details.length,4);
assert.deepEqual(result.quality,{validInstallments:4,disputedInstallments:0,otherExcluded:0,complete:true});
assert.equal(analyze(dues,[...links,links[0]],payouts,'2026-11-20').quality.otherExcluded,1);
assert.equal(analyze(dues,[...links,links[0]],payouts,'2026-11-20').quality.disputedInstallments,1);
assert.deepEqual(result.details.filter(x=>x.platform==='YouTube').map(x=>x.outstanding),[80,0,0]);
assert.equal(result.details[0].status,'partially-linked');
assert.equal(result.details.some(x=>x.due==='2026-12-15'),false);
assert.equal(usd.linked,220);
assert.equal(usd.outstanding,80);
assert.equal(result.groups.find(x=>x.currency==='EUR').outstanding,0);
assert.equal(usd.coverageLabel,'Developing history');
assert.equal(result.groups.find(x=>x.currency==='EUR').coverageLabel,'Limited history');
assert.equal(analyze(dues,links,payouts,'2026-02-30').error,'Invalid reliability inputs');
assert.equal(analyze(dues,links,payouts,'2026-11-20').excluded,0,'future installments are not invalid history');
assert.equal(analyze(dues,[...links,links[0]],payouts,'2026-11-20').excluded,2);
assert.equal(analyze([...dues,dues[0]],links,payouts,'2026-11-20').excluded,1);
assert.equal(analyze(dues,links,[...payouts,payouts[0]],'2026-11-20').groups.find(x=>x.platform==='YouTube').fullyLinked,1);
assert.equal(analyze(dues,[...links,{agreementId:'a',due:'2026-09-15',payoutId:'p2',amount:100}],payouts,'2026-11-20').excluded,2,'both installments using an overallocated payout are excluded');
assert.equal(analyze(dues,[...links,{agreementId:'b',due:'2026-10-15',payoutId:'p1',amount:20}],payouts,'2026-11-20').groups.find(x=>x.platform==='Twitch'),undefined,'currency-mismatched allocation cannot count as reliable');
assert.equal(analyze(dues,[...links,{agreementId:'b',due:'2026-10-15',payoutId:'p4',amount:1}],payouts,'2026-11-20').groups.find(x=>x.platform==='Twitch'),undefined,'duplicate settlement link quarantines affected history');
assert.equal(analyze(dues,[...links,{agreementId:'a',due:'2026-11-15',payoutId:'p1',amount:50}],payouts,'2026-11-20').groups.find(x=>x.platform==='YouTube').fullyLinked,1,'deposit overallocated across installments must not count');
assert.equal(analyze(dues,[...links,{agreementId:'b',due:'2026-10-15',payoutId:'p1',amount:20}],payouts,'2026-11-20').exclusions[0].reason,'Currency mismatch');
assert.equal(analyze(dues,[...links,{agreementId:'a',due:'2026-11-15',payoutId:'p1',amount:50}],payouts,'2026-11-20').exclusions[0].reason,'Deposit overallocated');
assert.equal(analyze(dues,[...links,{agreementId:'a',due:'2026-11-15',payoutId:'missing',amount:20}],payouts,'2026-11-20').exclusions[0].reason,'Invalid or duplicate settlement link');
assert.equal(analyze([...dues,dues[0]],links,payouts,'2026-11-20').exclusions[0].reason,'Duplicate installment schedule');
assert.equal(analyze(dues,links,[...payouts.slice(0,1),{...payouts[1],currency:'invalid'},...payouts.slice(2)],'2026-11-20').groups.find(x=>x.platform==='YouTube').fullyLinked,1,'malformed currency cannot contribute to verified linkage');
console.log('Historical payout linkage reliability tests passed');
