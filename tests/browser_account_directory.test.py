"""Full-app Chromium account search and status filters."""
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
  page.evaluate("""() => {selectedPeriod='all';entries=[{id:'e1',platform:'YouTube',account:'Untracked',currency:'USD',gross:100,fees:0,refunds:0,tax:0,earnedDate:'2026-11-01',status:'Pending',incomeType:'Ads',channel:'stream'}];accounts=[{id:'a1',name:'Main Channel',platform:'YouTube',channel:'stream',notes:'video'},{id:'a2',name:'Shop',platform:'Etsy',channel:'commerce',notes:'crafts'}];payouts=[];adjustments=[];render()}""")
  assert page.locator('.account-summary-card').count()==3
  assert 'Showing 3 of 3' in page.locator('#accountDirectoryCount').inner_text()
  page.locator('#accountDirectorySearch').fill('youTUBE')
  assert page.locator('.account-summary-card').count()==2
  page.locator('#accountDirectoryStatus').select_option('unmanaged')
  assert page.locator('.account-summary-card').count()==1
  assert 'Untracked' in page.locator('#accountCards').inner_text()
  page.locator('#accountDirectorySearch').fill('nothing')
  assert 'No accounts match' in page.locator('#accountCards').inner_text()
  page.locator('#accountDirectorySearch').fill('')
  page.locator('#accountDirectoryStatus').select_option('managed')
  assert page.locator('.account-summary-card').count()==2
  assert not errors,errors
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2')
  print(f'PASS {width}px account directory filtering and layout')
  page.close()
 browser.close()
