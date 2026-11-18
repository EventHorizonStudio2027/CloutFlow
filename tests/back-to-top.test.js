'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/css/app.css','utf8');
const js=fs.readFileSync('assets/js/back-to-top.js','utf8');
assert.match(html,/id="backToTop"[^>]*hidden/);
assert.match(html,/assets\/js\/back-to-top\.js/);
assert.match(css,/\.back-to-top\[hidden\]\{display:none!important\}/);
function simulate(reduce){
 let scroll=0, listener, click, top;
 const button={hidden:true,addEventListener:(event,fn)=>{assert.equal(event,'click');click=fn}};
 const doc={readyState:'complete',documentElement:{scrollTop:0},getElementById:()=>button};
 const root={document:doc,get scrollY(){return scroll},addEventListener:(event,fn,opts)=>{assert.equal(event,'scroll');assert.equal(opts.passive,true);listener=fn},requestAnimationFrame:fn=>fn(),matchMedia:()=>({matches:reduce}),scrollTo:opts=>top=opts};
 vm.runInNewContext(js,{window:root});
 assert.equal(button.hidden,true);
 scroll=500;listener();assert.equal(button.hidden,false);
 scroll=100;listener();assert.equal(button.hidden,true);
 scroll=900;listener();click();assert.equal(top.top,0);assert.equal(top.behavior,reduce?'instant':'smooth');
}
simulate(false);simulate(true);
console.log('Back-to-top navigation tests passed');
