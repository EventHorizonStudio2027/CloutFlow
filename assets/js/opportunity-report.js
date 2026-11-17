/* Planning-only CSV export. Never represents targets as earned income. */
(function(root){'use strict';
const HEADERS=['Opportunity','Category','Progress','Next step / notes','Goal currency','Monthly target (not earnings)','Last plan update'];
const STATES={interested:'Interested',trying:'Trying it',doing:'Already doing this'};
function cell(value){const raw=String(value??'');const safe=/^[\s\u0000-\u001f]*[=+@\-]/.test(raw)&&!/^\s*-?\d+(?:\.\d+)?\s*$/.test(raw)?"'"+raw:raw;return '"'+safe.replace(/"/g,'""')+'"';}
function build(ideas,plansApi,progressApi,store){const plans=plansApi&&store?plansApi.read(store):{};const rows=(Array.isArray(ideas)?ideas:[]).map(idea=>{const plan=plans[idea.id];const status=progressApi&&store?progressApi.get(store,idea.id):'';return [idea.title,idea.group||'',STATES[status]||'Not started',plan?.note||'',plan?.target>0?plan.currency:'',plan?.target>0?plan.target.toFixed(2):'',plan?.updatedAt||''];});return '\uFEFF'+[HEADERS,...rows].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';}
const api={build,cell,headers:HEADERS};root.CloutFlowOpportunityReport=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
