"""Storage write/read failure and mobile overflow tests using actual Chromium UI."""
import pathlib, re
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
HTML=(ROOT/'index.html').read_text().replace('<link rel="stylesheet" href="assets/css/app.css">','')
HTML=re.sub(r'<script src="assets/js/[^"]+"></script>','',HTML)
SCRIPT_NAMES=re.findall(r'<script src="assets/js/([^"]+)"></script>',(ROOT/'index.html').read_text())
CSS=(ROOT/'assets/css/app.css').read_text()
JS='\n'.join((ROOT/'assets/js'/name).read_text() for name in SCRIPT_NAMES)
KEY='creatorLedgerData_v2'

def start(browser,width):
    page=browser.new_page(viewport={'width':width,'height':850},accept_downloads=True)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(HTML)
    page.add_style_tag(content=CSS)
    page.evaluate('''() => {const data={}; window.__testStore=data; window.__failWrite=false; window.__failRead=false; Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>{if(window.__failRead)throw Error('Storage read blocked');return data[k]??null},setItem:(k,v)=>{if(window.__failWrite)throw Error('QuotaExceededError');data[k]=String(v)},removeItem:k=>delete data[k]}})}''')
    page.add_script_tag(content=JS)
    assert not errors,errors
    return page,errors

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in (320,390,768,1280):
        page,errors=start(browser,width)
        page.locator('#addBtn').click()
        page.locator('#gross').fill('100')
        page.locator('#earnedDate').fill('2026-11-01')
        baseline=page.evaluate('localStorage.getItem("creatorLedgerData_v2")')
        page.evaluate('window.__failWrite=true')
        page.locator('#incomeForm button[type=submit]').click()
        assert page.evaluate('entries.length')==0,'Failed save left phantom in-memory income'
        assert page.evaluate('localStorage.getItem("creatorLedgerData_v2")') == baseline
        assert 'show' in page.locator('#modal').get_attribute('class'),'Form closed despite save failure'
        page.evaluate('window.__failWrite=false')
        page.locator('#incomeForm button[type=submit]').click()
        assert page.evaluate('entries.length')==1
        stored=page.evaluate('localStorage.getItem("creatorLedgerData_v2")')
        page.evaluate('window.__failWrite=true')
        page.locator('[data-income-copy]').first.click()
        assert page.evaluate('entries.length')==1,'Failed duplicate save left phantom income'
        page.evaluate('window.__failWrite=false')
        page.evaluate('window.__failRead=true')
        page.evaluate("document.getElementById('integrityRaw').click()")
        assert 'Could not read saved data' in page.locator('#toast').inner_text()
        assert not errors,errors
        print(f'PASS storage write/read failures and rollback at {width}px')
        page.close()
    browser.close()
