"""Real-browser unified backup/restore, legacy compatibility, and preflight protection."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
source=(ROOT/'index.html').read_text()
names=re.findall(r'<script src="assets/js/([^"]+)"></script>',source)
html=re.sub(r'<script src="assets/js/[^"]+"></script>','',source).replace('<link rel="stylesheet" href="assets/css/app.css">','')
css=(ROOT/'assets/css/app.css').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,768,1280):
  page=browser.new_page(viewport={'width':width,'height':850});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.add_style_tag(content=css)
  page.evaluate('''() => {const data={};window.__data=data;window.__failKey='';window.confirm=()=>true;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>{if(k===window.__failKey)throw Error('Quota exceeded');data[k]=String(v)},removeItem:k=>delete data[k]}})}''')
  for name in names:page.add_script_tag(content=(ROOT/'assets/js'/name).read_text())
  page.evaluate('''() => {window.__download=null;download=(name,body,type)=>{window.__download={name,body,type}};}''')
  result=page.evaluate('''() => {
   const a={id:'agreement1',name:'Brand Retainer',platform:'Acme',currency:'USD',amount:100,frequency:'monthly',start:'2026-09-15',end:'',status:'active'};
   const payout={id:'deposit1',platform:'Acme',account:'',currency:'USD',amount:100,received:'2026-10-15',reference:'',notes:'',allocations:[]};
   const s={agreementId:'agreement1',due:'2026-10-15',payoutId:'deposit1',amount:75};
   const f={agreementId:'agreement1',due:'2026-10-15',status:'waiting',note:'Invoice reminder',remindOn:'2026-11-18',updated:'2026-11-16'};
   restore(JSON.stringify({version:4,entries:[],accounts:[],payouts:[payout],adjustments:[],recurringAgreements:[a],agreementSettlements:[s],paymentFollowups:[f]}));
   backup(); const exported=JSON.parse(window.__download.body);
   const keys=[KEY,CloutFlowRecurringAgreements.KEY,CloutFlowAgreementSettlements.KEY,CloutFlowPaymentFollowups.KEY];
   const original=keys.map(k=>localStorage.getItem(k));
   for(const k of keys)localStorage.removeItem(k);
   restore(JSON.stringify(exported));
   const recovered=keys.map(k=>localStorage.getItem(k));
   const after={ledger:JSON.parse(recovered[0]),agreements:CloutFlowRecurringAgreements.read(localStorage),settlements:CloutFlowAgreementSettlements.read(localStorage),followups:CloutFlowPaymentFollowups.read(localStorage)};
   const legacy={version:4,entries:[],accounts:[],payouts:[],adjustments:[]};
   restore(JSON.stringify(legacy));
   const legacyPreserved=keys.slice(1).every((k,i)=>localStorage.getItem(k)===recovered[i+1]);
   const beforeInvalid=keys.map(k=>localStorage.getItem(k));
   const prompts=[];window.confirm=message=>{prompts.push(message);return false};
   restore(JSON.stringify(exported));
   const canceledUnchanged=keys.every((k,i)=>localStorage.getItem(k)===beforeInvalid[i]);
   const inventoryShown=prompts.some(message=>['income records','accounts','deposits','adjustments','agreements','settlement links','payment follow-ups'].every(term=>message.includes(term)));
   restore(JSON.stringify(legacy));
   const legacyNoticeShown=prompts.some(message=>message.includes('older backup')&&message.includes('preserved'));
   window.confirm=()=>true;
   let rejected=false;try{restore(JSON.stringify({...exported,paymentFollowups:[{...f,status:'invalid'}]}))}catch(e){rejected=/invalid payment follow-ups/.test(e.message)}
   const invalidUnchanged=keys.every((k,i)=>localStorage.getItem(k)===beforeInvalid[i]);
   return {after,legacyPreserved,rejected,invalidUnchanged,canceledUnchanged,inventoryShown,legacyNoticeShown,original,exported};
  }''')
  assert result['after']['ledger']['payouts'][0]['id']=='deposit1'
  assert len(result['after']['agreements']['records'])==1
  assert len(result['after']['settlements']['records'])==1
  assert len(result['after']['followups']['records'])==1
  assert result['legacyPreserved'] and result['rejected'] and result['invalidUnchanged']
  assert result['canceledUnchanged'] and result['inventoryShown'] and result['legacyNoticeShown']
  assert not errors,errors
  print(f'PASS unified backup roundtrip, legacy preservation, invalid restore preflight at {width}px')
  page.close()
 browser.close()
