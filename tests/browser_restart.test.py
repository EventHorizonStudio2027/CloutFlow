"""Simulated restart: fresh Chromium document and JS state, persisted storage snapshot."""
import pathlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
HTML=(ROOT/'index.html').read_text().replace('<link rel="stylesheet" href="assets/css/app.css">','').replace('<script src="assets/js/currency-overview.js"></script>','<script src="assets/js/account-insights.js"></script>','').replace('<script src="assets/js/account-insights.js"></script>','').replace('<script src="assets/js/ledger-tools.js"></script>','').replace('<script src="assets/js/app.js"></script>','')
CSS=(ROOT/'assets/css/app.css').read_text()
JS=(ROOT/'assets/js/currency-overview.js').read_text()+'\n'+(ROOT/'assets/js/account-insights.js').read_text()+'\n'+(ROOT/'assets/js/ledger-tools.js').read_text()+'\n'+(ROOT/'assets/js/app.js').read_text()

def boot(browser, data=None):
    page=browser.new_page(viewport={'width':390,'height':844})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(HTML)
    page.add_style_tag(content=CSS)
    page.evaluate('''seed=>{window.__data={...seed};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__data[k]??null,setItem:(k,v)=>window.__data[k]=String(v),removeItem:k=>delete window.__data[k]}})}''',data or {})
    page.add_script_tag(content=JS)
    assert not errors,errors
    return page,errors

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page,errors=boot(browser)
    page.locator('#addBtn').click()
    page.locator('#gross').fill('120')
    page.locator('#fees').fill('20')
    page.locator('#earnedDate').fill('2026-11-01')
    page.locator('#incomeForm button[type=submit]').click()
    assert page.evaluate('entries.length')==1
    snapshot=page.evaluate('({...window.__data})')
    page.close()
    fresh,errors=boot(browser,snapshot)
    assert fresh.evaluate('entries.length')==1
    assert fresh.evaluate('net(entries[0])')==100
    assert fresh.evaluate('ledgerReadOnly') is False
    fresh.close()
    print('PASS fresh Chromium document reloads persisted income and calculations')
    bad=dict(snapshot)
    bad['creatorLedgerData_v2']='{"version":4,"entries":[{"id":"missing-gross","earnedDate":"2026-11-01"}]}'
    fresh,errors=boot(browser,bad)
    assert fresh.evaluate('ledgerReadOnly') is True
    assert fresh.evaluate('entries.length')==0
    assert fresh.evaluate('window.__data["creatorLedgerData_v2"]')==bad['creatorLedgerData_v2']
    assert fresh.evaluate('integrityLoadFailure.length')>0
    assert not errors,errors
    fresh.close()
    print('PASS corrupt saved data stays intact and enters read-only recovery mode')
    browser.close()
