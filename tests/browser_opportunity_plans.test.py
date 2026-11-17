"""Opportunity plan browser interaction, validation and rerender persistence."""
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
  page.evaluate("""() => {selectedPeriod='all';entries=[{id:'e1',platform:'Twitch',account:'Stream',currency:'USD',gross:100,fees:0,refunds:0,tax:0,earnedDate:'2026-11-01',status:'Pending',incomeType:'Subscriptions',channel:'stream'}];accounts=[];payouts=[];adjustments=[];render();document.getElementById('incomeOpportunitiesSection').hidden=false;}""")
  panel=page.locator('[data-opportunity-plan="multistream"]')
  panel.locator('summary').click()
  panel.locator('[data-plan-note]').fill('Test two streaming destinations')
  panel.locator('[data-plan-target]').fill('125.50')
  panel.locator('[data-plan-currency]').select_option('EUR')
  panel.locator('[data-plan-save]').click()
  assert 'saved' in panel.locator('[data-plan-feedback]').inner_text().lower()
  assert page.evaluate("CloutFlowOpportunityPlans.get(localStorage,'multistream').target")==125.5
  assert '€125.50' in page.locator('#opportunityGoalSummary').inner_text()
  assert 'not earned income' in page.locator('#opportunityGoalSummary').inner_text()
  page.evaluate('renderIncomeOpportunities()')
  panel=page.locator('[data-opportunity-plan="multistream"]')
  panel.locator('summary').click()
  assert panel.locator('[data-plan-note]').input_value()=='Test two streaming destinations'
  assert panel.locator('[data-plan-currency]').input_value()=='EUR'
  panel.locator('[data-plan-target]').fill('-1')
  panel.locator('[data-plan-save]').click()
  assert 'valid' in panel.locator('[data-plan-feedback]').inner_text().lower()
  assert page.evaluate("CloutFlowOpportunityPlans.get(localStorage,'multistream').target")==125.5
  assert '€125.50' in page.locator('#opportunityGoalSummary').inner_text()
  assert 'not earned income' in page.locator('#opportunityGoalSummary').inner_text()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2')
  assert not errors,errors
  print(f'PASS {width}px opportunity planning save, rerender, invalid goal, layout')
  page.close()
 browser.close()
