const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8'),js=fs.readFileSync('assets/js/app.js','utf8'),css=fs.readFileSync('assets/css/app.css','utf8');
for(const cls of ['settlement-table','reconciliation-table']){assert(html.includes(`class="${cls}"`));assert(css.includes(`.${cls} tbody`));assert(css.includes(`.${cls} td::before`));}
for(const label of ['Earned','Net','Allocated','Unallocated','Status','Received','Deposit','Reference'])assert(js.includes(`data-label="${label}"`));
assert(js.includes('data-settlement-entry=')&&js.includes('data-payout-edit='));
console.log('Mobile reconciliation structure checks passed');
