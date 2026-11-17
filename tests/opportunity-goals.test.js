const assert=require('node:assert/strict');const api=require('../assets/js/opportunity-goals');const plans=require('../assets/js/opportunity-plans');const map=new Map();const store={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
assert.deepEqual(api.summarize([],plans,store),{planned:0,withTargets:0,totals:[]});
assert.equal(plans.set(store,'affiliate',{note:'try links',currency:'USD',target:10.25}),true);
assert.equal(plans.set(store,'merch',{note:'try merch',currency:'USD',target:15.35}),true);
assert.equal(plans.set(store,'digital',{note:'research',currency:'EUR',target:5}),true);
assert.deepEqual(api.summarize([{id:'affiliate'},{id:'merch'},{id:'digital'}],plans,store),{planned:3,withTargets:3,totals:[{currency:'EUR',amount:5},{currency:'USD',amount:25.6}]});
assert.deepEqual(api.summarize([{id:'affiliate'}],plans,store).totals,[{currency:'USD',amount:10.25}]);
assert.equal(api.format('USD',10).includes('10'),true);
console.log('Opportunity goals: passed');
