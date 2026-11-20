const assert=require('node:assert/strict');
const {candidates}=require('../assets/js/payout-duplicates');
const base={id:'a',platform:'YouTube',account:'Main',currency:'USD',received:'2026-11-15',amount:123.45,reference:''};
const list=[base,{...base,id:'b',amount:200},{...base,id:'c',account:'Other'},{...base,id:'d',currency:'EUR'},{...base,id:'e',received:'2026-11-14'}];
assert.equal(candidates({...base,id:'new'},list).length,1);
assert.equal(candidates(base,list).length,0);
assert.equal(candidates({...base,id:'new',platform:'youtube',account:' main '},list).length,1);
assert.equal(candidates({...base,id:'new',amount:123.46},list).length,0);
assert.equal(candidates({...base,id:'new',amount:''},list).length,0);
assert.equal(candidates({...base,id:'new'},null).length,0);
assert.equal(candidates({...base,id:'new',received:''},list).length,0);\nassert.equal(candidates({...base,id:'new',received:'2026-02-30'},list).length,0);\nassert.equal(candidates({...base,id:'new',amount:0},list).length,0);\nassert.equal(candidates({...base,id:'new',currency:'US
console.log('Payout duplicate advisory: 7 checks passed');
},list).length,0);\nassert.equal(candidates({...base,id:'new'},[...list,{...base,id:'invalid',received:'2026-02-30'}]).length,1);\nassert.equal(candidates({...base,id:'new'},[...list,{...base,id:'bad-amount',amount:123.456}]).length,1);
console.log('Payout duplicate advisory: 7 checks passed');
