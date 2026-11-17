const assert=require('node:assert/strict');const {summarize}=require('../assets/js/recurring-income');
const e=(month,type='Subscriptions',gross=100,currency='USD',extra={})=>({earnedDate:month+'-10',incomeType:type,gross,fees:10,refunds:0,tax:0,currency,platform:'Twitch',account:'Main',...extra});
const rows=summarize([e('2026-08'),e('2026-09'),e('2026-10'),e('2026-11'),e('2026-11','Sponsorship'),e('2026-11','Subscriptions',80,'EUR')],'2026-11',6);
assert.equal(rows.length,2);const usd=rows.find(x=>x.currency==='USD');assert.equal(usd.latest,90);assert.equal(usd.previous,90);assert.equal(usd.observedPattern,true);assert.equal(usd.activeMonths,4);assert.equal(rows.find(x=>x.currency==='EUR').observedPattern,false);
assert.equal(summarize([e('2026-11','Subscriptions',10,'USD',{fees:20})],'2026-11',6).length,0);
assert.equal(summarize([e('2026-11','Subscriptions',10,'USD',{earnedDate:'2026-11-31'})],'2026-11',6).length,0);
assert.equal(summarize([e('2026-11','Subscriptions',10,'USD',{gross:'1.001'})],'2026-11',6).length,0);
assert.equal(summarize([e('2026-11','Subscriptions')],'bad',6).length,0);
console.log('recurring income tests passed');
