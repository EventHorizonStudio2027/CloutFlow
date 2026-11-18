'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('assets/js/copy-summary.js','utf8');
assert.match(html,/id="copySummary"/);
assert.match(html,/assets\/js\/copy-summary\.js/);
function setup(fail=false){
 const els={period:{options:[{textContent:'This month'},{textContent:'All time'}],selectedIndex:1},grossTotal:{textContent:'$120.00'},netTotal:{textContent:'$95.00'},paidTotal:{textContent:'$50.00'},pendingTotal:{textContent:'$45.00'}};
 let handler,clipboardText;
 const button={disabled:false,textContent:'Copy summary',addEventListener:(event,fn)=>{assert.equal(event,'click');handler=fn}};
 els.copySummary=button;
 const doc={readyState:'complete',getElementById:id=>els[id]||null};
 const root={document:doc,navigator:{clipboard:{writeText:async value=>{if(fail)throw Error('permission');clipboardText=value}}}};
 vm.runInNewContext(source,{window:root});
 return {button,click:()=>handler(),get copied(){return clipboardText},summary:root.CloutFlowCopySummary.buildSummary};
}
(async()=>{
 const ok=setup();const summary=ok.summary();
 assert.match(summary,/Period: All time/);
 assert.match(summary,/Currency: USD \(other currencies excluded/);
 assert.match(summary,/Gross earnings: \$120\.00/);
 assert.match(summary,/Awaiting payout: \$45\.00/);
 assert.doesNotMatch(summary,/EUR earnings/);
 await ok.click();assert.equal(ok.copied,summary);assert.equal(ok.button.textContent,'Copied!');assert.equal(ok.button.disabled,false);
 const blocked=setup(true);await blocked.click();assert.equal(blocked.button.textContent,'Copy unavailable');assert.equal(blocked.button.disabled,false);
 console.log('Copy summary tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
