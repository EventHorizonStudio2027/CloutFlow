"""Chromium UI regression checks without network/file navigation.
Requires: pip install playwright; system Chromium. Uses an in-memory localStorage shim.
"""
import pathlib, re
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
HTML=(ROOT/'index.html').read_text()
CSS=(ROOT/'assets/css/app.css').read_text()
SCRIPTS=re.findall(r'<script src="assets/js/([^"]+)"></script>',HTML)
HTML=re.sub(r'<script src="assets/js/[^"]+"></script>','',HTML)
HTML=HTML.replace('<link rel="stylesheet" href="assets/css/app.css">','')

def setup(browser, width):
    page=browser.new_page(viewport={'width':width,'height':850},accept_downloads=True)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(HTML)
    page.add_style_tag(content=CSS)
    page.evaluate('''() => {const data={}; Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>delete data[k]}})}''')
    for script in SCRIPTS:
        page.add_script_tag(content=(ROOT/"assets/js"/script).read_text())
    assert not errors, errors
    return page,errors

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in (390,1280):
        page,errors=setup(browser,width)
        page.locator('#addBtn').click()
        assert 'show' in (page.locator('#modal').get_attribute('class') or '')
        page.locator('#gross').fill('0')
        page.locator('#incomeForm button[type=submit]').click()
        assert page.evaluate("JSON.parse(localStorage.getItem('creatorLedgerData_v2')).entries.length")==0, 'Zero-gross income was saved'
        page.locator('#gross').fill('100.00')
        page.locator('#fees').fill('10.00')
        page.locator('#earnedDate').fill('2026-11-01')
        page.locator('#description').fill('Browser integration test')
        page.locator('#incomeForm button[type=submit]').click()
        records=page.evaluate("JSON.parse(localStorage.getItem('creatorLedgerData_v2')).entries")
        assert len(records)==1,records
        assert records[0]['gross']==100 and records[0]['fees']==10
        # The workspace router intentionally hides unrelated sections on load.
        # Navigate through the visible Quick Access action, then use the real payout control.
        if width <= 800:
            page.locator('.quick-sidebar-toggle').click()
        page.locator('[data-quick-action="newPayoutBtn"]').click()
        assert 'show' in page.locator('#payoutModal').get_attribute('class')
        page.locator('#payoutAmount').fill('30')
        page.locator('#payoutReceived').fill('2026-11-05')
        page.locator('#payoutReference').fill('settlement-ui-test')
        page.locator('#payoutForm button[type=submit]').click()
        stored=page.evaluate("JSON.parse(localStorage.getItem('creatorLedgerData_v2'))")
        assert len(stored['payouts'])==1,(stored,page.locator('#toast').inner_text(),page.locator('#payoutPlatform').input_value(),page.locator('#payoutAccount').input_value())
        # Select the adjustments workspace before interacting with its form.
        if width <= 800:
            page.locator('.quick-sidebar-toggle').click()
        page.locator('[data-quick-target="adjustmentsSection"]').click()
        # Exercise the adjustment action directly: a floating growth-tip overlay can
        # intercept pointer events at narrow viewports. Overlay behavior is tested separately.
        page.locator('#addAdjustmentBtn').evaluate('(button) => button.click()')
        page.locator('#adjustmentDate').fill('2026-11-06')
        page.locator('#adjustmentPlatform').fill('YouTube')
        page.locator('#adjustmentAmount').fill('-15')
        page.locator('#adjustmentReference').fill('refund-ui-test')
        page.locator('#adjustmentForm button[type=submit]').click()
        stored=page.evaluate("JSON.parse(localStorage.getItem('creatorLedgerData_v2'))")
        assert len(stored['adjustments'])==1,(stored,page.locator('#toast').inner_text())
        assert stored['adjustments'][0]['amount']==-15
        snapshot=page.evaluate("localStorage.getItem('creatorLedgerData_v2')")
        page.evaluate("window.confirm=()=>true")
        page.evaluate("text=>restore(text)",snapshot)
        assert page.evaluate("JSON.parse(localStorage.getItem('creatorLedgerData_v2')).adjustments.length")==1
        assert not errors,errors
        print(f'PASS Chromium UI width={width}: load, income validation/create, payout create, adjustment create, backup restore, no page errors')
        page.close()
    browser.close()
