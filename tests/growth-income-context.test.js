'use strict';const assert=require('assert');const api=require('../assets/js/growth-income-context');
const entries=[
 {earnedDate:'2026-11-01',currency:'USD',gross:100.10,fees:2.05,refunds:3.01,tax:5.04},
 {earnedDate:'2026-11-15',currency:'USD',gross:0.20,fees:0.10},
 {earnedDate:'2026-11-12',currency:'EUR',gross:80,fees:5},
 {earnedDate:'2026-10-31',currency:'USD',gross:900},
 {earnedDate:'2026-11-13',currency:'USD',gross:10,fees:12},
 {earnedDate:'2026-11-31',currency:'USD',gross:100},
 {earnedDate:'2026-11-16',currency:'USD',gross:'oops'}
];
const report=api.context(entries,'2026-11',{totals:[{currency:'USD',amount:250},{currency:'GBP',amount:50}]});
assert.equal(report.records,3);assert.deepEqual(report.rows,[
 {currency:'EUR',earned:75,goal:0,hasEarned:true,hasGoal:false},
 {currency:'GBP',earned:0,goal:50,hasEarned:false,hasGoal:true},
 {currency:'USD',earned:90.1,goal:250,hasEarned:true,hasGoal:true}
]);
assert.equal(api.monthKey('2026-02-29'),null);assert.equal(api.monthKey('2024-02-29'),'2024-02');
assert.deepEqual(api.summarize(entries,'bad'),{month:'bad',totals:[],records:0});
console.log('Growth income context tests passed');
