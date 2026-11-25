"""Chromium quick-access interactions and responsive overflow."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
css=(root/'assets/css/app.css').read_text()
html=html.replace('<link rel="stylesheet" href="assets/css/app.css">','')
html=re.sub(r'<script src="assets/js/[^\"]+"></script>','',html)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,768,1280):
  page=browser.new_page(viewport={'width':width,'height':850})
  page.set_content(html)
  page.add_style_tag(content=css)
  page.add_script_tag(content=(root/'assets/js/quick-access.js').read_text())
  assert page.locator('.quick-access-actions button').count()==8
  assert page.locator('.quick-access').evaluate('el => getComputedStyle(el).position') == ('sticky' if width >= 1050 else 'static')
  assert page.locator('.quick-access-actions').evaluate('el => el.scrollWidth <= el.clientWidth')
  assert page.locator('.workspace-content #adjustmentsSection').count()==1
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
  page.locator('[data-quick-target="ledgerSection"]').click()
  assert page.evaluate('document.activeElement === document.querySelector("#ledgerSection h3")')
  assert page.locator('#recurringAgreements').is_visible()
  page.locator('[data-quick-target="recurringAgreements"]').click()
  assert page.evaluate('document.activeElement === document.querySelector("#recurringAgreements h4")')
  page.locator('[data-quick-target="accountsSection"]').click()
  assert page.evaluate('document.activeElement === document.querySelector("#accountsSection h3")')
  page.evaluate('window.quickClicks=0;document.getElementById("addBtn").addEventListener("click",()=>window.quickClicks++)')
  page.locator('[data-quick-action="addBtn"]').click()
  assert page.evaluate('window.quickClicks')==1
  page.locator('[data-quick-action="newPayoutBtn"]').focus()
  page.keyboard.press('Enter')
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
  print(f'PASS {width}px quick access')
  page.close()
 browser.close()
