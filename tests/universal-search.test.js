const assert=require('node:assert/strict');
const {match}=require('../assets/js/universal-search.js');
const data=[{label:'Transaction ledger',detail:'Income'},{label:'Payout center',detail:'Deposits'},{label:'Creator accounts',detail:'Profiles'}];
assert.deepEqual(match(data,'payout').map(x=>x.label),['Payout center']);
assert.deepEqual(match(data,'creator accounts').map(x=>x.label),['Creator accounts']);
assert.deepEqual(match(data,'INCOME').map(x=>x.label),['Transaction ledger']);
assert.equal(match(data,'not found').length,0);
console.log('Universal search matching: passed');
