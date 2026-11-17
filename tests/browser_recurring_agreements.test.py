"""Actual agreement CRUD, schedule and corrupted storage recovery in Chromium."""
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
  page.evaluate("document.getElementById('incomeOpportunitiesSection').hidden=false")
  page.locator('#agreementName').fill('Brand Retainer')
  page.locator('#agreementPlatform').fill('Acme')
  page.locator('#agreementAmount').fill('250.25')
  page.locator('#agreementStart').fill('2026-11-01')
  page.locator('#agreementForm button[type=submit]').click()
  assert 'Brand Retainer' in page.locator('#agreementList').inner_text()
  assert '250.25' in page.locator('#agreementSchedule').inner_text()
  page.locator('[data-agreement-edit]').click()
  page.locator('#agreementStatus').select_option('paused')
  page.locator('#agreementForm button[type=submit]').click()
  assert 'No scheduled payments' in page.locator('#agreementSchedule').inner_text()
  assert page.evaluate("JSON.parse(localStorage.getItem('cloutflow_recurring_agreements_v1'))[0].status")=='paused'
  page.reload() if False else None
  page.evaluate("window.confirm=()=>true")
  page.locator('[data-agreement-delete]').click()
  assert 'No confirmed agreements' in page.locator('#agreementList').inner_text()
  page.evaluate("localStorage.setItem('cloutflow_recurring_agreements_v1','bad');CloutFlowRecurringAgreementsUI.mount(document,localStorage,CloutFlowRecurringAgreements)")
  assert page.locator('#agreementForm button[type=submit]').is_disabled()
  assert 'editing is blocked' in page.locator('#agreementNotice').inner_text()
  assert not errors,errors
  print(f'PASS {width}px agreement create/edit/pause/delete, schedule, corrupted storage')
  page.close()
 browser.close()
