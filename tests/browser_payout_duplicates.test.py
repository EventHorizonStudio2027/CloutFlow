"""Full-app duplicate warning and confirmation tests across responsive viewports."""
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
  for name in names: page.add_script_tag(content=(root/'assets/js'/name).read_text())
  page.evaluate("""() => {
   selectedPeriod='all';entries=[{id:'e1',platform:'YouTube',account:'Main',currency:'USD',gross:500,fees:0,refunds:0,tax:0,earnedDate:'2026-11-01',status:'Pending',incomeType:'Ads',channel:'stream'}];
   payouts=[{id:'p1',platform:'YouTube',account:'Main',currency:'USD',amount:100,received:'2026-11-10',reference:'Bank-001',notes:'',allocations:[]}];
   accounts=[];adjustments=[];render();openPayout();
  }""")
  page.locator('#payoutAmount').fill('100')
  page.locator('#payoutReceived').fill('2026-11-10')
  assert page.locator('#payoutDuplicateWarning').is_visible(),f'{width}px: duplicate warning missing'
  assert 'Possible duplicate' in page.locator('#payoutDuplicateWarning').inner_text()
  page.locator('#payoutCurrency').select_option('EUR')
  assert not page.locator('#payoutDuplicateWarning').is_visible(),'currency switch must immediately clear warning'
  page.locator('#payoutCurrency').select_option('USD')
  assert page.locator('#payoutDuplicateWarning').is_visible(),'currency switch back must restore warning'
  page.locator('#payoutAmount').fill('101')
  assert not page.locator('#payoutDuplicateWarning').is_visible(),'amount change must clear warning'
  page.locator('#payoutAmount').fill('100')
  assert page.locator('#payoutDuplicateWarning').is_visible()
  page.once('dialog',lambda dialog: dialog.dismiss())
  page.locator('#payoutForm button[type="submit"]').click()
  assert len(page.evaluate('payouts'))==1,'cancelled duplicate must not persist'
  assert page.locator('#payoutModal').is_visible()
  page.once('dialog',lambda dialog: dialog.accept())
  page.locator('#payoutForm button[type="submit"]').click()
  assert len(page.evaluate('payouts'))==2,'confirmed duplicate should persist'
  assert len(page.evaluate("JSON.parse(localStorage.getItem('creatorLedgerData_v2')).payouts"))==2
  assert not errors,errors
  print(f'PASS {width}px duplicate warning, currency update, rejection, confirmation and persistence')
  page.close()
 browser.close()
