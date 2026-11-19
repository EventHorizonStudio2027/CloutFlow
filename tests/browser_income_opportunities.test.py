"""Real Chromium checks for personalized income opportunities."""
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
  assert 'Add a creator account' in page.locator('#incomeOpportunityResults').inner_text()
  page.evaluate("""() => {selectedPeriod='all';entries=[{id:'e1',platform:'Twitch',account:'Stream',currency:'USD',gross:100,fees:0,refunds:0,tax:0,earnedDate:'2026-11-01',status:'Pending',incomeType:'Subscriptions',channel:'stream'}];accounts=[];payouts=[];adjustments=[];render()}""")
  content=page.locator('#incomeOpportunityResults').inner_text()
  assert 'Explore multistreaming' in content
  assert 'Turn streams into short-form clips' in content
  assert page.locator('#incomeOpportunitiesSection').is_hidden(),'growth ideas should start collapsed'
  page.locator('#showGrowthIdeas').click()
  assert page.locator('#incomeOpportunitiesSection').is_visible(),'growth ideas should open on request'
  page.locator('#opportunityCategory').select_option('community')
  assert 'Already tracked' in page.locator('#incomeOpportunityResults').inner_text()
  page.locator('#opportunityCategory').select_option('all')
  assert 'in-app purchases' not in content
  page.locator('#opportunityCategory').select_option('partners')
  content=page.locator('#incomeOpportunityResults').inner_text()
  assert 'sponsorships' in content and 'multistreaming' not in content
  page.locator('#opportunityCategory').select_option('all')
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2')
  assert not errors,errors
  print(f'PASS {width}px income opportunities personalization and layout')
  page.close()
 browser.close()
