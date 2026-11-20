"""Chromium checks for creator command center controls and responsive layout."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
html=re.sub(r'<script src="assets/js/[^"]+"></script>','',html).replace('<link rel="stylesheet" href="assets/css/app.css">','')
css=(root/'assets/css/app.css').read_text()
js=(root/'assets/js/command-center.js').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,768,1280):
  page=browser.new_page(viewport={'width':width,'height':850})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.add_style_tag(content=css);page.add_script_tag(content=js)
  assert page.locator('.command-card').count()==8
  assert page.locator('#commandCenterCount').inner_text()=='8 of 8 shortcuts shown'
  page.locator('.command-card[data-command-target="ledgerSection"]').click()
  assert page.evaluate("document.activeElement.closest('#ledgerSection') !== null"),'Shortcut should focus target heading'
  page.locator('#customizeCommandCenter').click()
  assert page.locator('#commandCenterSettings').is_visible()
  page.locator('#commandCenterOptions input').first.uncheck()
  assert page.locator('.command-card').count()==7
  assert page.locator('#commandCenterCount').inner_text()=='7 of 8 shortcuts shown'
  assert page.evaluate("document.activeElement.getAttribute('aria-label') === 'Show Recent transactions'"),'Keep focus after visibility change'
  page.locator('#commandCenterOptions button[aria-label^="Move down"]').first.click()
  page.locator('#resetCommandCenter').click()
  assert page.locator('.command-card').count()==8
  page.locator('#commandCenterOptions input').first.focus()
  page.keyboard.press('Escape')
  assert page.locator('#commandCenterSettings').is_hidden()
  assert page.evaluate("document.activeElement.id === 'customizeCommandCenter'")
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
  assert not errors,errors
  print(f'PASS {width}px command center customization, reset and layout')
  page.close()
 browser.close()
