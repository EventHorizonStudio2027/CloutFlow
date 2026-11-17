const assert=require('node:assert/strict');
const G=require('../assets/js/account-growth.js');
const windows={current:['2026-11-01','2026-11-16'],previous:['2026-10-01','2026-10-16']};
const entries=[
 {currency:'USD',platform:'YouTube',account:'Main',earnedDate:'2026-10-04',gross:100},
 {currency:'USD',platform:'YouTube',account:'Main',earnedDate:'2026-11-04',gross:140},
 {currency:'USD',platform:'Twitch',account:'Main',earnedDate:'2026-10-04',gross:50},
 {currency:'EUR',platform:'YouTube',account:'Main',earnedDate:'2026-11-04',gross:90},
 {currency:'USD',platform:'TikTok',account:'New',earnedDate:'2026-11-04',gross:30},
 {currency:'USD',platform:'YouTube',account:'Outside',earnedDate:'2026-10-25',gross:5000}];
const adjustments=[{currency:'USD',platform:'YouTube',account:'Main',date:'2026-11-05',amount:-20},{currency:'USD',platform:'Twitch',account:'Main',date:'2026-10-05',amount:-10}];
const rows=G.calculate(windows,entries,adjustments,e=>e.gross);
const find=(c,p,a)=>rows.find(r=>r.currency===c&&r.platform===p&&r.account===a);
assert.deepEqual([find('USD','YouTube','Main').current,find('USD','YouTube','Main').previous,find('USD','YouTube','Main').difference,find('USD','YouTube','Main').percent],[120,100,20,20]);
assert.deepEqual([find('USD','Twitch','Main').current,find('USD','Twitch','Main').previous,find('USD','Twitch','Main').difference], [0,40,-40]);
assert.equal(find('EUR','YouTube','Main').difference,90);
assert.equal(find('USD','TikTok','New').percent,null);
assert.equal(find('USD','YouTube','Outside'),undefined);
assert.equal(G.calculate(null,entries,adjustments,e=>e.gross),null);
assert.deepEqual(G.calculate(windows,[],[],e=>e.gross),[]);
console.log('Account growth tests passed');
