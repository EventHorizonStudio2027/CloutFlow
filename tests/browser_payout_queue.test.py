"""Full app Chromium interactions for unallocated payout attention queue."""
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
   selectedPeriod='all';entries=[{id:'e1',platform:'YouTube',account:'Main',currency:'USD',gross:100,fees:0,refunds:0,tax:0,earnedDate:'2026-11-01',status:'Pending',incomeType:'Ads',channel:'stream'}];
   payouts=[{id:'p1',platform:'YouTube',account:'Main',currency:'USD',amount:100,received:'2026-11-10',reference:'Bank-001',notes:'',allocations:[{entryId:'e1',amount:40}]},{id:'p2',platform:'YouTube',account:'Main',currency:'USD',amount:20,received:'2026-11-11',reference:'Complete',notes:'',allocations:[{entryId:'e1',amount:20}]},{id:'p3',platform:'Twitch',account:'Main',currency:'USD',amount:30,received:'2026-11-12',reference:'Overallocated',notes:'',allocations:[{entryId:'e1',amount:40}]}];
   accounts=[];adjustments=[];render();
  }""")
  assert page.locator('#payoutQueueCount').inner_text()=='2 items to review'
  assert '$60.00' in page.locator('#payoutQueueRows').inner_text()
  assert 'Bank-001' in page.locator('#payoutQueueRows').inner_text()
  assert 'Complete' not in page.locator('#payoutQueueRows').inner_text()
  assert 'Over by $10.00' in page.locator('#payoutQueueRows').inner_text()
  assert page.locator('.payout-queue-item.is-overallocated').count()==1
  page.locator('[data-queue-payout="p1"]').click()
  assert 'show' in (page.locator('#payoutModal').get_attribute('class') or '')
  assert page.locator('#payoutRecordId').input_value()=='p1'
  assert page.locator('#growthPopup').count()==0 or page.locator('#growthPopup').is_hidden(), page.evaluate('''() => {const p=document.querySelector('#growthPopup'),m=document.querySelector('#payoutModal');return {popupDisplay:p&&getComputedStyle(p).display,popupInline:p?.style.cssText,modalClass:m?.className,modalDisplay:m&&getComputedStyle(m).display}}''')
  # Reviewing an item must not mutate financial records before an explicit save.
  assert page.locator('#payoutAmount').input_value()=='100'
  assert page.locator('[data-allocation="e1"]').input_value()=='40'
  page.locator('#cancelPayoutBtn').click()
  assert page.locator('#payoutModal').is_hidden() or 'show' not in (page.locator('#payoutModal').get_attribute('class') or '')
  assert page.evaluate("payouts.find(p=>p.id==='p1').allocations[0].amount")==40
  assert not errors,errors
  print(f'PASS {width}px payout queue, financial balance, review action')
  page.close()
 browser.close()
