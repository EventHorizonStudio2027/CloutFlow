"""Creator-reviewed partial settlement allocations, tested in real Chromium."""
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
  page.evaluate("""() => {document.getElementById('incomeOpportunitiesSection').hidden=false;const a=CloutFlowRecurringAgreements;a.save(localStorage,[{id:'agreement-1',name:'Retainer',platform:'Acme',currency:'USD',amount:100,frequency:'monthly',start:'2026-11-01',end:'',status:'active'}]);CloutFlowRecurringAgreementsUI.mount(document,localStorage,a,()=> '2026-11-01',()=>[{id:'deposit-1',platform:'Acme',currency:'USD',amount:75,received:'2026-11-02'},{id:'deposit-2',platform:'Acme',currency:'USD',amount:50,received:'2026-11-04'}]);}""")
  row=page.locator('#agreementSchedule tbody tr').first
  row.locator('[data-settlement-payout]').select_option('deposit-1')
  row.locator('[data-settlement-amount]').fill('75')
  row.locator('[data-settlement-link]').click()
  assert 'Partially allocated' in page.locator('#agreementSchedule tbody tr').first.inner_text()
  row=page.locator('#agreementSchedule tbody tr').first
  row.locator('[data-settlement-payout]').select_option('deposit-2')
  row.locator('[data-settlement-amount]').fill('25')
  row.locator('[data-settlement-link]').click()
  assert 'Confirmed allocation' in page.locator('#agreementSchedule tbody tr').first.inner_text()
  assert len(page.evaluate("JSON.parse(localStorage.getItem('cloutflow_agreement_settlements_v1'))"))==2
  page.locator('[data-settlement-remove]').first.click()
  assert 'Partially allocated' in page.locator('#agreementSchedule tbody tr').first.inner_text()
  assert not errors,errors
  print(f'PASS {width}px: partial allocation, full allocation, unlink, persistence')
  page.close()
 browser.close()
