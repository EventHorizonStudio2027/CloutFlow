"""Download a planning-only CSV after editing a real opportunity card."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
names=re.findall(r'<script src="assets/js/([^"]+)"></script>',html)
html=re.sub(r'<script src="assets/js/[^"]+"></script>','',html).replace('<link rel="stylesheet" href="assets/css/app.css">','')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,768,1280):
  page=browser.new_page(viewport={'width':width,'height':850},accept_downloads=True)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html)
  page.add_style_tag(content=(root/'assets/css/app.css').read_text())
  page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}})}""")
  for name in names:page.add_script_tag(content=(root/'assets/js'/name).read_text())
  page.evaluate("""() => {selectedPeriod='all';entries=[{id:'e1',platform:'Twitch',account:'Stream',currency:'USD',gross:100,fees:0,refunds:0,tax:0,earnedDate:'2026-11-01',status:'Pending',incomeType:'Subscriptions',channel:'stream'}];accounts=[];payouts=[];adjustments=[];render();document.getElementById('incomeOpportunitiesSection').hidden=false;}""")
  panel=page.locator('[data-opportunity-plan="multistream"]')
  panel.locator('summary').click()
  panel.locator('[data-plan-note]').fill('=HYPERLINK("https://example.com")')
  panel.locator('[data-plan-target]').fill('125.50')
  panel.locator('[data-plan-currency]').select_option('EUR')
  panel.locator('[data-plan-save]').click()
  page.locator('[data-opportunity-progress="multistream"]').select_option('trying')
  with page.expect_download() as info:page.locator('#exportGrowthPlans').click()
  download=info.value
  assert download.suggested_filename=='cloutflow-growth-plans.csv'
  data=Path(download.path()).read_text(encoding='utf-8-sig')
  assert '"EUR","125.50"' in data
  assert '"Trying it"' in data
  assert "'=HYPERLINK" in data
  assert 'Monthly target (not earnings)' in data
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2')
  assert not errors,errors
  print(f'PASS {width}px planning CSV download, formula protection, progress, currency')
  page.close()
 browser.close()
