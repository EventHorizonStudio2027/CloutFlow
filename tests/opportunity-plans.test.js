const assert=require('node:assert/strict');
const api=require('../assets/js/opportunity-plans.js');
function store(){const data={};return {getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v},data}}
const s=store();assert.equal(api.count(s),0);assert.equal(api.set(s,'multistream',{note:'Try weekend broadcasts',target:125.50,currency:'USD'}),true);assert.equal(api.get(s,'multistream').target,125.5);assert.equal(api.get(s,'multistream').note,'Try weekend broadcasts');assert.equal(api.count(s),1);
assert.equal(api.set(s,'bad id!',{note:'test',target:1,currency:'USD'}),false);assert.equal(api.set(s,'multistream',{note:'',target:-1,currency:'USD'}),false);assert.equal(api.set(s,'multistream',{note:'',target:1.234,currency:'USD'}),false);assert.equal(api.get(s,'multistream').target,125.5);
assert.equal(api.set(s,'multistream',{note:'',target:0,currency:'USD'}),true);assert.equal(api.count(s),0);
s.setItem(api.key,'not json');assert.deepEqual(api.read(s),{});s.setItem(api.key,JSON.stringify({valid:{note:'Hi',currency:'EUR',target:20},bad:{note:'Oops',target:-10}}));assert.equal(api.get(s,'valid').currency,'EUR');assert.equal(api.count(s),1);
const denied={getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('denied')}};assert.deepEqual(api.read(denied),{});assert.equal(api.set(denied,'valid',{note:'hi',target:1}),false);
console.log('Opportunity plan validation, persistence, clearing, and storage failures passed');
