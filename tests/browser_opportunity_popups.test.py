"""Real Chromium interaction tests for contextual, dismissible growth tips."""
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
  page.evaluate("""() => {const d={};window.__testStore=d;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}})}""")
  for name in names:page.add_script_tag(content=(root/'assets/js'/name).read_text())
  assert page.locator('#growthPopup').count()==0 or page.locator('#growthPopup').is_hidden()
  page.evaluate("""() => {selectedPeriod='all';entries=[{id:'e1',platform:'Twitch',account:'Stream',currency:'USD',gross:100,fees:0,refunds:0,tax:0,earnedDate:'2026-11-01',status:'Pending',incomeType:'Subscriptions',channel:'stream'}];accounts=[];payouts=[];adjustments=[];render()}""")
  popup=page.locator('#growthPopup')
  popup.wait_for(state='visible',timeout=5000)
  first_title=page.locator('#growthPopupTitle').inner_text()
  assert first_title.strip(), 'recommendation should have a title'
  assert popup.get_attribute('role')=='region'
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2')
  page.locator('.growth-popup-close').focus()
  page.keyboard.press('Escape')
  assert popup.is_hidden(), 'Escape should dismiss the popup'
  page.evaluate('CloutFlowOpportunityPopups.resetSession()')
  page.evaluate("localStorage.setItem(CloutFlowOpportunityPopups.lastKey,'1')")
  page.evaluate('render()')
  popup.wait_for(state='visible',timeout=5000)
  assert page.locator('#growthPopupTitle').inner_text()!=first_title
  page.locator('#growthPopupLater').click()
  assert popup.is_hidden()
  assert page.evaluate("JSON.parse(localStorage.getItem('cloutflow_opportunity_dismissals_v1'))")
  page.evaluate('render()')
  assert popup.is_hidden(), 'only one automatic recommendation per visit'
  page.evaluate('CloutFlowOpportunityPopups.resetSession()')
  page.evaluate("localStorage.setItem(CloutFlowOpportunityPopups.lastKey,'1')")
  page.evaluate('render()')
  popup.wait_for(state='visible',timeout=5000) # next unsnoozed idea
  page.locator('#growthPopupMore').click()
  assert popup.is_hidden()
  assert page.locator('#incomeOpportunitiesSection').is_visible()
  assert page.locator('#incomeOpportunitiesTitle').evaluate('(el)=>document.activeElement===el')
  page.evaluate('CloutFlowOpportunityPopups.resetSession()')
  page.evaluate("localStorage.setItem(CloutFlowOpportunityPopups.lastKey,'1')")
  page.evaluate('render()')
  popup.wait_for(state='visible',timeout=5000)
  page.locator('#growthPopupOptout').click()
  assert popup.is_hidden()
  assert page.evaluate('CloutFlowOpportunityPopups.disabled(localStorage)')
  page.evaluate('CloutFlowOpportunityPopups.resetSession()')
  page.evaluate("localStorage.setItem(CloutFlowOpportunityPopups.lastKey,'1')")
  page.evaluate('render()')
  assert popup.is_hidden(), 'opted-out users should not see automatic popups'
  page.locator('#showGrowthIdeas').click()
  assert page.locator('#incomeOpportunitiesSection').is_hidden(), 'manual browser remains independently toggleable'
  page.locator('#showGrowthIdeas').click()
  assert page.locator('#incomeOpportunitiesSection').is_visible()
  page.locator('#growthTipPreference').click()
  assert not page.evaluate('CloutFlowOpportunityPopups.disabled(localStorage)')
  assert page.locator('#growthTipPreference').get_attribute('aria-pressed')=='true'
  # Daily frequency cap suppresses repeated visits without new activity.
  page.evaluate('localStorage.setItem(CloutFlowOpportunityPopups.lastKey,String(Date.now()))')
  page.evaluate('CloutFlowOpportunityPopups.resetSession()')
  page.evaluate('render()')
  assert popup.is_hidden(), 'recent tip should respect the 24-hour frequency cap'
  # Unrelated new platforms must not bypass the daily frequency limit.
  page.evaluate("""() => {accounts=[{id:'a-unrelated',name:'Offline business',platform:'UnrecognizedPlatform',channel:'offline'}];render()}""")
  assert popup.is_hidden(), 'unmatched platform must not bypass daily tip limit'
  # A genuinely new platform overrides the daily cap and offers a relevant idea.
  page.evaluate("""() => {accounts=[{id:'a-new',name:'New Kick channel',platform:'Kick',channel:'stream'}];render()}""")
  popup.wait_for(state='visible',timeout=5000) # new platform contextual tip
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2')
  # Turning automatic tips off in the directory must immediately close a visible tip.
  page.locator('#growthTipPreference').click()
  assert popup.is_hidden(), 'preference toggle should close an already-visible tip'
  assert page.evaluate('CloutFlowOpportunityPopups.disabled(localStorage)')
  page.locator('#growthTipPreference').click()
  assert not page.evaluate('CloutFlowOpportunityPopups.disabled(localStorage)')
  assert not errors, errors
  print(f'PASS {width}px popup, snooze, next suggestion, explore, focus, layout')
  page.close()
 browser.close()
