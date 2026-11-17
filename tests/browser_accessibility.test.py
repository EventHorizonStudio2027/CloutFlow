"""Keyboard, dialog and responsive checks in actual Chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="assets/css/app.css">','').replace('<script src="assets/js/currency-overview.js"></script>','<script src="assets/js/account-insights.js"></script>','').replace('<script src="assets/js/account-insights.js"></script>','').replace('<script src="assets/js/ledger-tools.js"></script>','').replace('<script src="assets/js/app.js"></script>','').replace('<script src="assets/js/accessibility.js"></script>','')
css=(root/'assets/css/app.css').read_text()
js=(root/'assets/js/currency-overview.js').read_text()+'\n'+(root/'assets/js/account-insights.js').read_text()+'\n'+(root/'assets/js/ledger-tools.js').read_text()+'\n'+(root/'assets/js/app.js').read_text()
a11y=(root/'assets/js/accessibility.js').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,768,1280):
  page=browser.new_page(viewport={'width':width,'height':850})
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.set_content(html)
  page.add_style_tag(content=css)
  page.evaluate("""() => {const data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]}})}""")
  page.add_script_tag(content=js)
  page.add_script_tag(content=a11y)
  assert page.locator('.skip-link').get_attribute('href')=='#mainContent'
  assert page.locator('#gross').evaluate('(el)=>el.labels.length')>=1
  page.locator('#addBtn').click()
  page.wait_for_function("document.querySelector('#modal').getAttribute('aria-modal')==='true' && document.activeElement.closest('#modal')!==null")
  assert page.locator('#modal').get_attribute('aria-labelledby')=='modalTitle'
  page.keyboard.press('Escape')
  page.wait_for_function("!document.querySelector('#modal').classList.contains('show')")
  assert page.evaluate("document.activeElement.id")=='addBtn'
  page.locator('#addBtn').click()
  page.wait_for_function("document.activeElement.closest('#modal')!==null")
  page.keyboard.press('Shift+Tab')
  assert page.evaluate("document.activeElement.closest('#modal')!==null")
  page.locator('#cancel').click()
  page.wait_for_function("!document.querySelector('#modal').classList.contains('show')")
  assert not errors,errors
  print(f'PASS width={width}: dialog focus, Escape, labels, focus restoration')
  page.close()
 browser.close()
