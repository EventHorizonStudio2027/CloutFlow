"""Verify payment follow-up editing, reminders, persistence and XSS safety."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text();names=re.findall(r'<script src="assets/js/([^"]+)"></script>',html)
html=re.sub(r'<script src="assets/js/[^"]+"></script>','',html).replace('<link rel="stylesheet" href="assets/css/app.css">','')
css=(root/'assets/css/app.css').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,768,1280):
  page=browser.new_page(viewport={'width':width,'height':850});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.add_style_tag(content=css)
  page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}})}""")
  for name in names:page.add_script_tag(content=(root/'assets/js'/name).read_text())
  page.evaluate("""() => { document.getElementById('incomeOpportunitiesSection').hidden=false;const a=CloutFlowRecurringAgreements;a.save(localStorage,[{id:'a',name:'Brand Retainer',platform:'Acme',currency:'USD',amount:100,frequency:'monthly',start:'2026-09-15',end:'',status:'active'}]);CloutFlowRecurringAgreementsUI.mount(document,localStorage,a,()=> '2026-11-16',()=>[])}""")
  queue=page.locator('#cashflowAttention');queue.locator('[data-followup-edit]').first.click()
  page.locator('#paymentFollowupStatus').select_option('contacted')
  page.locator('#paymentFollowupReminder').fill('2026-11-15')
  page.locator('#paymentFollowupNote').fill('<img src=x onerror=alert(1)> Emailed partner')
  page.locator('#paymentFollowupSave').click()
  assert 'follow-up reminder(s)' in queue.inner_text()
  assert 'contacted' in queue.inner_text()
  assert queue.locator('img').count()==0
  assert page.evaluate("() => CloutFlowPaymentFollowups.read(localStorage).records.length")==1
  queue.locator('[data-followup-edit]').first.click()
  assert page.locator('#paymentFollowupNote').input_value().startswith('<img')
  page.locator('#paymentFollowupStatus').select_option('resolved');page.locator('#paymentFollowupSave').click()
  assert 'follow-up reminder(s)' not in queue.inner_text()
  queue.locator('[data-followup-edit]').first.click();page.locator('#paymentFollowupClear').click()
  assert page.evaluate("() => CloutFlowPaymentFollowups.read(localStorage).records.length")==0
  assert not errors,errors
  print(f'PASS {width}px payment follow-up CRUD, reminder, and XSS safety')
  page.close()
 browser.close()
