"""Verify responsive ledger cards and retained desktop table behavior."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
import re
html=(root/'index.html').read_text();names=re.findall(r'<script src="assets/js/([^"]+)"></script>',html)
html=re.sub(r'<script src="assets/js/[^"]+"></script>','',html).replace('<link rel="stylesheet" href="assets/css/app.css">','')
css=(root/'assets/css/app.css').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,600,768,1280):
  page=browser.new_page(viewport={'width':width,'height':850})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.add_style_tag(content=css)
  page.evaluate("""() => {const data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]}})}""")
  for name in names:page.add_script_tag(content=(root/'assets/js'/name).read_text())
  page.evaluate("""() => {entries=[normalize({id:'mobile-fixture',channel:'stream',platform:'YouTube',account:'Main channel',incomeType:'Ad revenue',currency:'USD',gross:1234,fees:34,refunds:0,tax:0,earnedDate:'2026-10-01',status:'Pending',description:'A very long creator transaction description that should wrap inside the phone card without clipping'} )];selectedPeriod='all';render()}""")
  page.evaluate("window.CloutFlowOpenWorkspace('ledgerSection', false)")
  row=page.locator('#entries tr');assert row.count()==1
  assert row.locator('[data-label="Net"]').inner_text().strip().endswith('1,200.00')
  if width<=600:
   assert row.evaluate('(e)=>getComputedStyle(e).display')=='grid'
   assert row.evaluate('(e)=>e.getBoundingClientRect().width')<=width-20
   assert row.locator('[data-label="Actions"] button').count()==2
   assert row.locator('[data-label="Actions"] button').first.evaluate('(e)=>e.getBoundingClientRect().height')>=44
  else:
   assert row.evaluate('(e)=>getComputedStyle(e).display')=='table-row'
  row.locator('[data-income-edit]').click()
  assert page.locator('#entryId').input_value()=='mobile-fixture'
  page.locator('#cancel').click(force=True)
  assert not errors,errors
  print(f'PASS {width}px: ledger layout, readable amounts, Edit action')
  page.close()
 browser.close()
