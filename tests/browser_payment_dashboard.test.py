"""Dashboard payment reminders are accurate, responsive, and navigate to agreements."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text();names=re.findall(r'<script src="assets/js/([^"]+)"></script>',html)
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
  page.evaluate("""() => {const a=CloutFlowRecurringAgreements;a.save(localStorage,[{id:'a',name:'Brand Retainer',platform:'Acme',currency:'USD',amount:100,frequency:'monthly',start:'2026-09-15',end:'',status:'active'}]);CloutFlowRecurringAgreementsUI.mount(document,localStorage,a,()=> '2026-11-16',()=>[]);CloutFlowPaymentDashboard.mount(document)}""")
  assert 'payment' in page.locator('[data-payment-title]').inner_text().lower()
  assert 'overdue or due-today' in page.locator('[data-payment-title]').inner_text(), 'Overdue installment should be distinct from follow-up reminder counts'
  assert page.locator('#paymentDashboard').get_attribute('data-state') in ('urgent','attention')
  assert page.evaluate('() => document.documentElement.scrollWidth <= innerWidth + 2')
  page.evaluate("""() => {const a=CloutFlowRecurringAgreements;a.save(localStorage,[{id:'soon',name:'Upcoming Sponsor',platform:'Acme',currency:'USD',amount:75,frequency:'monthly',start:'2026-11-20',end:'',status:'active'}]);CloutFlowAgreementUIInstance?.refresh?.();CloutFlowRecurringAgreementsUI.mount(document,localStorage,a,()=> '2026-11-16',()=>[])}""")
  assert 'due within 7 days' in page.locator('[data-payment-title]').inner_text()
  assert '2026-11-20' in page.locator('[data-payment-detail]').inner_text()
  assert '$75.00 USD' in page.locator('[data-payment-detail]').inner_text()
  page.locator('[data-payment-open]').click()
  assert page.evaluate("() => document.activeElement.id==='recurringAgreements'")
  assert not errors,errors
  print(f'PASS {width}px payment dashboard alerts, layout, and navigation')
  page.close()
 browser.close()
