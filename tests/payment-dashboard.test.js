const assert=require('node:assert/strict');
const api=require('../assets/js/payment-dashboard.js');
const queue={rows:[{remaining:100,currency:'USD',status:'overdue',partial:false},{remaining:50,status:'due-today',partial:true},{remaining:0,status:'allocated',partial:false},{remaining:40,status:'upcoming',partial:true}]};
assert.deepEqual(api.summarize(queue,[{},{}]),{blocked:false,overdue:1,dueToday:1,partial:2,reminders:2,attention:3,upcomingWeek:0,upcomingMonth:0,nextDue:null,weekAmounts:[],monthAmounts:[],overdueAmounts:[{currency:'USD',amount:100}],excludedAmounts:0});
assert.equal(api.summarize(queue,[],true).blocked,true);
const fields={title:{textContent:''},detail:{textContent:''},button:{textContent:''}};const host={dataset:{},querySelector(s){return fields[s.includes('title')?'title':s.includes('detail')?'detail':'button']}};
api.update({getElementById:()=>host},api.summarize(queue,[{}]));assert.match(fields.title.textContent,/2 overdue or due-today payments/);assert.match(fields.detail.textContent,/Counts may overlap/);assert.equal(host.dataset.state,'urgent');
api.update({getElementById:()=>host},api.summarize(null,null,true));assert.equal(host.dataset.state,'warning');
console.log('Payment dashboard tests passed');

const upcoming=api.summarize({rows:[{remaining:100,status:'upcoming',daysUntilDue:4,due:'2026-11-20'},{remaining:20,status:'upcoming',daysUntilDue:12,due:'2026-11-28'},{remaining:0,status:'allocated',daysUntilDue:1,due:'2026-11-17'}]},[]);
assert.equal(upcoming.upcomingWeek,1);assert.equal(upcoming.nextDue,'2026-11-20');assert.equal(upcoming.attention,0);
api.update({getElementById:()=>host},upcoming);assert.match(fields.title.textContent,/due within 7 days/);assert.match(fields.detail.textContent,/Next expected date: 2026-11-20/);
assert.equal(host.dataset.state,'attention');

// Multiple currencies remain separate, partial payments count only outstanding balances.
const mixed=api.summarize({rows:[
 {remaining:12.34,currency:'USD',status:'upcoming',daysUntilDue:2,due:'2026-11-18'},
 {remaining:5.66,currency:'USD',status:'upcoming',daysUntilDue:3,due:'2026-11-19',partial:true},
 {remaining:20,currency:'EUR',status:'upcoming',daysUntilDue:4,due:'2026-11-20'},
 {remaining:90,currency:'USD',status:'upcoming',daysUntilDue:9,due:'2026-11-25'},
 {remaining:0,currency:'EUR',status:'upcoming',daysUntilDue:1,due:'2026-11-17'},
 {remaining:7,currency:'invalid',status:'upcoming',daysUntilDue:1,due:'2026-11-17'}
]},[]);
assert.deepEqual(mixed.weekAmounts,[{currency:'EUR',amount:20},{currency:'USD',amount:18}]);
assert.equal(mixed.excludedAmounts,1);
api.update({getElementById:()=>host},mixed);
assert.match(fields.detail.textContent,/€20\.00 EUR/);
assert.match(fields.detail.textContent,/\$18\.00 USD/);
assert.match(fields.detail.textContent,/1 installment amount\(s\) omitted/);
assert.match(fields.detail.textContent,/Next 30-day outstanding amounts:.*\$108\.00 USD/);

// 30-day outlook is currency-separated; overdue balances are distinct from future cash flow.
const outlook=api.summarize({rows:[
 {remaining:10,currency:'USD',status:'upcoming',daysUntilDue:3,due:'2026-11-19'},
 {remaining:20,currency:'USD',status:'upcoming',daysUntilDue:21,due:'2026-12-07'},
 {remaining:15,currency:'EUR',status:'upcoming',daysUntilDue:30,due:'2026-12-16'},
 {remaining:100,currency:'USD',status:'upcoming',daysUntilDue:31,due:'2026-12-17'},
 {remaining:5,currency:'USD',status:'overdue',daysUntilDue:-2,due:'2026-11-14'},
 {remaining:7,currency:'EUR',status:'overdue',daysUntilDue:-1,due:'2026-11-15'},
 {remaining:0,currency:'USD',status:'upcoming',daysUntilDue:1,due:'2026-11-17'}
]},[]);
assert.equal(outlook.upcomingMonth,3);
assert.equal(outlook.nextDue,'2026-11-19');
assert.deepEqual(outlook.weekAmounts,[{currency:'USD',amount:10}]);
assert.deepEqual(outlook.monthAmounts,[{currency:'EUR',amount:15},{currency:'USD',amount:30}]);
assert.deepEqual(outlook.overdueAmounts,[{currency:'EUR',amount:7},{currency:'USD',amount:5}]);
api.update({getElementById:()=>host},outlook);
assert.match(fields.detail.textContent,/Next 30-day outstanding amounts:/);
assert.match(fields.detail.textContent,/Overdue outstanding amounts:/);
assert.doesNotMatch(fields.detail.textContent,/\$100\.00/);

// An alert count must not imply distinct payments when reminders overlap.
const reminderOnly=api.summarize({rows:[]},[{},{}]);api.update({getElementById:()=>host},reminderOnly);assert.match(fields.title.textContent,/2 follow-up reminders/);assert.equal(host.dataset.state,'urgent');
// Sub-cent, non-finite and nonnumeric balances must never enter cash totals.
const invalidAmounts=api.moneyGroups([{currency:'USD',remaining:12.34},{currency:'USD',remaining:1.001},{currency:'USD',remaining:'20'},{currency:'USD',remaining:Infinity},{currency:'USD',remaining:5}]);assert.deepEqual(invalidAmounts.totals,[{currency:'USD',amount:17.34}]);assert.equal(invalidAmounts.excluded,3);
