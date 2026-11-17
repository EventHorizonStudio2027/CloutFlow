const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../assets/js/app.js'),'utf8');
const start=src.indexOf('function chartSeries('),end=src.indexOf('function drawChart(',start);
assert(start>=0&&end>start);
const ctx={validDate:s=>/^\d{4}-\d{2}-\d{2}$/.test(s),net:e=>e.gross,selectedPeriod:'last',adjustments:[]};
vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
function chart(earnings,adjustments,period,now){ctx.args={earnings,adjustments,period,now};return vm.runInContext('chartSeries(args.earnings,args.adjustments,args.period,args.now)',ctx)}
const now=new Date(2026,0,15);
let result=chart([{earnedDate:'2025-12-08',gross:70},{earnedDate:'2025-11-12',gross:900}],[], 'last',now);
assert.equal(result.buckets.length,1,'Last month must show exactly one bucket');assert.equal(result.buckets[0].key,'2025-12');assert.equal(result.buckets[0].value,70);
console.log('PASS: Last month is a single prior-month bucket across a year boundary');
result=chart([{earnedDate:'2025-12-08',gross:70}], [{date:'2025-12-20',currency:'USD',amount:-20}], 'last',now);
assert.equal(result.buckets[0].value,50);console.log('PASS: Last month includes dated adjustments');
result=chart([{earnedDate:'2020-01-01',gross:12},{earnedDate:'2025-12-08',gross:70}],[], 'all',now);
assert.equal(result.yearly,true);assert.equal(result.buckets.length,7);assert.equal(result.buckets[0].value,12);console.log('PASS: All-time yearly chart includes older years');
result=chart([{earnedDate:'2025-12-08',gross:70}],[], 'year',now);
assert.equal(result.buckets.length,12);assert.equal(result.buckets[0].key,'2026-01');console.log('PASS: This year displays twelve current-year months');
result=chart([{earnedDate:'2025-12-08',gross:70}],[], 'month',now);
assert.equal(result.buckets.length,6);assert.equal(result.buckets.at(-1).key,'2026-01');console.log('PASS: This month trend ends in current month');
