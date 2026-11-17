"""Browser checks for monthly earned-income trends and responsive rendering."""
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
  page.evaluate("""() => {selectedPeriod='all';entries=[{id:'e1',platform:'Twitch',account:'Stream',currency:'USD',gross:100,fees:5,refunds:0,tax:0,earnedDate:'2026-11-01',status:'Pending',incomeType:'Subscriptions',channel:'stream'},{id:'e2',platform:'Twitch',account:'Stream',currency:'EUR',gross:80,fees:5,refunds:0,tax:0,earnedDate:'2026-10-01',status:'Pending',incomeType:'Subscriptions',channel:'stream'},{id:'e3',platform:'Twitch',account:'Stream',currency:'USD',gross:200,fees:0,refunds:0,tax:0,earnedDate:'2026-03-01',status:'Pending',incomeType:'Subscriptions',channel:'stream'}];accounts=[];payouts=[];adjustments=[];render();document.getElementById('incomeOpportunitiesSection').hidden=false;}""")
  # Current month depends on clock; use the module for deterministic month calculations.
  assert page.evaluate("CloutFlowGrowthIncomeTrends.build(entries,'2026-11',3).rows.length") == 3
  assert page.evaluate("CloutFlowGrowthIncomeTrends.build(entries,'2026-11',3).rows[2].amounts.find(x=>x.currency==='USD').amount") == 95
  assert page.evaluate("CloutFlowGrowthIncomeTrends.build(entries,'2026-11',3).rows[1].amounts.find(x=>x.currency==='EUR').amount") == 75
  assert page.locator('#growthIncomeTrends table').count()==1
  assert page.locator('#growthIncomeTrends tbody tr').count()==6
  page.locator('#growthTrendRange').select_option('12')
  assert page.locator('#growthIncomeTrends tbody tr').count()==12
  page.locator('#growthTrendRange').select_option('3')
  assert page.locator('#growthIncomeTrends tbody tr').count()==3
  with page.expect_download() as dl:
   page.locator('#exportGrowthHistory').click()
  download=dl.value
  assert download.suggested_filename=='cloutflow-earned-income-history.csv'
  csv=Path(download.path()).read_text(encoding='utf-8-sig')
  assert 'net earned income' in csv and 'Valid earning entries' in csv
  assert 'growth target' not in csv.lower()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'), 'horizontal overflow'
  assert not errors,errors
  print(f'PASS {width}px income history calculations, range changes, responsive layout')
  page.close()
 browser.close()
