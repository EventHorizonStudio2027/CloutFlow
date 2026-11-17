const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const api=require('../assets/js/quick-access.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.equal(api.TARGETS.length,6);assert.equal(api.ACTIONS.length,2);
for(const id of api.TARGETS){assert.match(html,new RegExp('id="'+id+'"'));assert.match(html,new RegExp('data-quick-target="'+id+'"'));}
for(const id of api.ACTIONS){assert.match(html,new RegExp('id="'+id+'"'));assert.match(html,new RegExp('data-quick-action="'+id+'"'));}
assert.match(html,/aria-label="Quick access to financial tools"/);
assert.match(html,/assets\/js\/quick-access\.js/);
console.log('Quick access structural tests passed');
