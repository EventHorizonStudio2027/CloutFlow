"""Real browser coverage for growth-idea progress filters and persistence."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
names=re.findall(r'<script src="assets/js/([^"]+)"></script>',html)
html=re.sub(r'<script src="assets/js/[^"]+"></script>','',html).replace('<link rel="stylesheet" href="assets/css/app.css">','')
css=(root/'assets/css/app.css').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,768,1280):
  page=browser.new_page(viewport={'width':width,'height':850})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html)
  page.add_style_tag(content=css)
  page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}})}""")
  for name in names:page.add_script_tag(content=(root/'assets/js'/name).read_text())
  page.evaluate("""() => {selectedPeriod='all';entries=[{id:'e1',platform:'Twitch',account:'Stream',currency:'USD',gross:100,fees:0,refunds:0,tax:0,earnedDate:'2026-11-01',status:'Pending',incomeType:'Subscriptions',channel:'stream'}];accounts=[];payouts=[];adjustments=[];render()}""")
  assert page.locator('[data-opportunity-progress]').count()>=3
  page.evaluate("document.getElementById('incomeOpportunitiesSection').hidden=false")
  page.locator('[data-opportunity-progress="multistream"]').select_option('interested')
  page.locator('#opportunityStatus').select_option('interested')
  assert page.locator('[data-opportunity-progress]').count()==1
  assert page.locator('[data-opportunity-progress="multistream"]').input_value()=='interested'
  page.locator('[data-opportunity-progress="multistream"]').select_option('trying')
  assert page.locator('[data-opportunity-progress]').count()==0
  page.locator('#opportunityStatus').select_option('trying')
  assert page.locator('[data-opportunity-progress="multistream"]').input_value()=='trying'
  assert '1 trying' in page.locator('#opportunityProgressSummary').inner_text()
  page.locator('[data-opportunity-progress="multistream"]').select_option('doing')
  page.locator('#opportunityStatus').select_option('doing')
  assert page.locator('[data-opportunity-progress="multistream"]').input_value()=='doing'
  assert page.evaluate("CloutFlowOpportunityProgress.get(window.localStorage,'multistream')")=='doing'
  page.locator('#opportunityStatus').select_option('all')
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2')
  assert not errors,errors
  print(f'PASS {width}px growth progress filter, saved status, counts, layout')
  page.close()
 browser.close()
