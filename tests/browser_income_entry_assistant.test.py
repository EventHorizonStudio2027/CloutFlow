"""Real Chromium validation, accessible feedback, and invalid-submit blocking."""
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
  page.evaluate("""() => {document.querySelector('#modal').classList.add('show');document.querySelector('#earnedDate').value='2026-11-01';} """)
  page.locator('#gross').fill('100')
  page.locator('#fees').fill('120')
  assert page.locator('#incomeEntryFeedback').get_attribute('data-state')=='invalid'
  assert page.locator('#fees').get_attribute('aria-invalid')=='true'
  assert page.locator('#fees').get_attribute('aria-describedby')=='incomeEntryFeedback'
  page.locator('#incomeForm button[type=submit]').click()
  assert page.evaluate('() => document.activeElement.id === "fees"')
  page.locator('#fees').fill('10')
  assert page.locator('#incomeEntryFeedback').get_attribute('data-state')=='valid'
  page.locator('#status').select_option('Paid')
  assert page.locator('#payoutDate').get_attribute('aria-invalid')=='true'
  page.locator('#payoutDate').fill('2026-11-02')
  assert page.locator('#incomeEntryFeedback').get_attribute('data-state')=='valid'
  assert not errors,errors
  print(f'PASS {width}px income editor validation, submit protection, and accessible focus')
  page.close()
 browser.close()
