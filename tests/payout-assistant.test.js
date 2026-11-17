const assert=require('node:assert/strict');const {plan,summary}=require('../assets/js/payout-assistant.js');
assert.deepEqual(plan(100,[{id:'old',available:80},{id:'new',available:90}]),[{id:'old',amount:80},{id:'new',amount:20}]);
assert.deepEqual(plan(0,[{id:'a',available:20}]),[{id:'a',amount:0}]);
assert.deepEqual(plan(10,[{id:'a',available:0},{id:'b',available:7}]),[{id:'a',amount:0},{id:'b',amount:7}]);
assert.deepEqual(plan(0.3,[{id:'a',available:0.1},{id:'b',available:0.2}]),[{id:'a',amount:0.1},{id:'b',amount:0.2}]);
assert.equal(summary(100,[25,20]).remaining,55);assert.equal(summary(100,[60,60]).over,true);assert.equal(summary(0.3,[0.1,0.2]).remaining,0);assert.equal(summary(100,[0,0]).allocated,0);
console.log('Payout assistant: 8 assertions passed');
