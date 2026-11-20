"""Verify prioritized agreement attention queue and filtering in Chromium."""
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
  page.evaluate("""() => {document.getElementById('incomeOpportunitiesSection').hidden=false;const a=CloutFlowRecurringAgreements;a.save(localStorage,[{id:'a',name:'Brand Retainer',platform:'Acme',currency:'USD',amount:100,frequency:'monthly',start:'2026-09-15',end:'',status:'active'}]);CloutFlowRecurringAgreementsUI.mount(document,localStorage,a,()=> '2026-11-16',()=>[])}""")
  queue=page.locator('#cashflowAttention')
  assert 'Payment attention queue' in queue.inner_text()
  assert 'Overdue' in queue.inner_text()
  assert queue.locator('tbody tr').count()==3
  assert queue.locator('.cashflow-status.status-overdue').count()==3
  assert queue.locator('.cashflow-due-hint').count()==3
  assert 'days overdue' in queue.inner_text()
  page.locator('#cashflowAttentionFilter').select_option('upcoming')
  assert queue.locator('tbody tr').count()==2
  with page.expect_download() as download_info:
   page.locator('#exportPaymentAttention').click()
  download=download_info.value
  assert re.fullmatch(r'cloutflow-payment-attention-upcoming-\d{4}-\d{2}-\d{2}\.csv',download.suggested_filename)
  exported=Path(download.path()).read_text(encoding='utf-8-sig')
  assert 'Brand Retainer' in exported and '2026-12-15' in exported and '2026-09-15' not in exported
  assert 'Expected amount' in exported and 'Remaining amount' in exported
  page.locator('#cashflowAttentionFilter').select_option('allocated')
  assert 'No installments in this filter' in queue.inner_text()
  page.locator('#cashflowAttentionFilter').select_option('all')
  assert queue.locator('tbody tr').count()>=5
  assert not errors,errors
  print(f'PASS {width}px cashflow attention filter and priority')
  page.close()
 browser.close()
