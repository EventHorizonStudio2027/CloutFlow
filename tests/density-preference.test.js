'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/css/app.css','utf8');
const script=fs.readFileSync('assets/js/density-preference.js','utf8');
assert.match(html,/id="densityToggle" aria-pressed="true"/);
assert.match(html,/assets\/js\/density-preference\.js/);
assert.match(css,/\.comfortable-dashboard \.card/);
function run(initial,throws=false){
  const attrs={};let handler;let saved;let cls=false;
  const button={setAttribute:(k,v)=>attrs[k]=v,addEventListener:(k,fn)=>{assert.equal(k,'click');handler=fn},textContent:'',title:''};
  const sandbox={document:{getElementById:()=>button,documentElement:{classList:{toggle:(k,v)=>{assert.equal(k,'comfortable-dashboard');cls=v}}}},localStorage:{getItem:()=>{if(throws)throw Error('denied');return initial},setItem:(k,v)=>{if(throws)throw Error('denied');saved=[k,v]}}};
  vm.runInNewContext(script,sandbox);
  return {button,attrs,click:()=>handler(),get state(){return cls},get saved(){return saved}};
}
const fresh=run(null);assert.equal(fresh.attrs['aria-pressed'],'true');assert.equal(fresh.state,false);
fresh.click();assert.equal(fresh.attrs['aria-pressed'],'false');assert.equal(fresh.state,true);assert.deepEqual(fresh.saved,['cloutflow_dashboard_density_v1','comfortable']);
fresh.click();assert.equal(fresh.attrs['aria-pressed'],'true');assert.equal(fresh.state,false);
const remembered=run('comfortable');assert.equal(remembered.state,true);
const blocked=run(null,true);blocked.click();assert.equal(blocked.state,true);
console.log('Dashboard density preference tests passed');
