"""Browser regression for read-only monthly income intelligence."""
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
  page=browser.new_page(viewport={'width':width,'height':850});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.add_style_tag(content=css)
  page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}})}""")
  for name in names:page.add_script_tag(content=(root/'assets/js'/name).read_text())
  page.evaluate("""() => {selectedPeriod='all';entries=[{id:'a',platform:'Twitch',account:'Stream',currency:'USD',gross:100,fees:5,earnedDate:'2026-11-01',status:'Pending',incomeType:'Subscriptions',channel:'stream'},{id:'b',platform:'Twitch',account:'Stream',currency:'EUR',gross:80,fees:5,earnedDate:'2026-10-01',status:'Pending',incomeType:'Subscriptions',channel:'stream'}];accounts=[];payouts=[];adjustments=[];render();document.getElementById('incomeOpportunitiesSection').hidden=false;}""")
  assert page.locator('#growthIncomeIntelligence').count()==1
  assert page.locator('#growthIncomeIntelligence').inner_text().strip()
  assert page.locator('#growthIncomeIntelligence').get_by_text('USD income insights').count()==1
  assert page.locator('#growthIncomeIntelligence').get_by_text('EUR income insights').count()==1
  assert 'Insufficient adjacent monthly data' in page.locator('#growthIncomeIntelligence').inner_text()
  page.locator('#growthTrendRange').select_option('3')
  assert '3 months' in page.locator('#growthIncomeIntelligence').inner_text()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2')
  assert not errors,errors
  print(f'PASS {width}px income intelligence, missing-month safety, period switching')
  page.close()
 browser.close()
