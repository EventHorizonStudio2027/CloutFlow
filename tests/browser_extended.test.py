"""Chromium integration: CSV preview/commit, duplicate prevention, download round trips,
backup validation, persistence simulation and narrow-screen overflow.
Run: python3 tests/browser_extended.test.py
"""
import json, pathlib, re
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
html=(ROOT/'index.html').read_text()
css=(ROOT/'assets/css/app.css').read_text()
scripts=re.findall(r'<script src="assets/js/([^"]+)"></script>',html)
html=re.sub(r'<script src="assets/js/[^"]+"></script>','',html)
html=html.replace('<link rel="stylesheet" href="assets/css/app.css">','')

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in (320,390,768,1280):
        page=browser.new_page(viewport={'width':width,'height':820},accept_downloads=True)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html)
        page.add_style_tag(content=css)
        page.evaluate('''() => {const data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]}})}''')
        for script in scripts:page.add_script_tag(content=(ROOT/"assets/js"/script).read_text())
        sample='id,channel,platform,account,incomeType,currency,gross,fees,refunds,tax,earnedDate,payoutDate,status,reference,description\r\n' + 'test-import-1,stream,YouTube,Main,Ad revenue,USD,100,10,0,0,2026-10-01,,Pending,video-123,"Hello, ""World"""\r\n'
        # Exercise the actual file picker and import-options flow.
        page.locator('#mobileImport' if width<=800 else '#importBtn').click()
        assert 'show' in page.locator('#importOptionsModal').get_attribute('class')
        page.locator('#chooseImportFile').click()
        page.locator('#csvFile').set_input_files({'name':'income.csv','mimeType':'text/csv','buffer':sample.encode()})
        page.wait_for_function('() => document.querySelector("#importSummary").textContent.includes("1 new")')
        assert '1 new' in page.locator('#importSummary').inner_text()
        assert page.locator('#importPreviewRows tr').count()==1
        page.locator('#confirmImport').click()
        assert len(page.evaluate("JSON.parse(localStorage.getItem('creatorLedgerData_v2')).entries"))==1
        assert page.evaluate("JSON.parse(localStorage.getItem('creatorLedgerData_v2')).entries[0].description")=='Hello, "World"'
        page.evaluate('(s)=>importCSV(s)',sample)
        assert '0 new' in page.locator('#importSummary').inner_text()
        assert page.locator('#confirmImport').is_disabled()
        page.locator('#cancelImport').click()
        with page.expect_download() as download_info:
            page.evaluate('exportCSV()')
        downloaded=download_info.value
        assert downloaded.suggested_filename=='cloutflow-transactions.csv'
        export_text=pathlib.Path(downloaded.path()).read_text()
        parsed=page.evaluate('(s)=>parseCSV(s)',export_text)
        assert len(parsed)==2 and len(parsed[0])==len(parsed[1])
        assert parsed[1][-1]=='Hello, "World"'
        with page.expect_download() as download_info:
            page.evaluate('backup()')
        backup=json.loads(pathlib.Path(download_info.value.path()).read_text())
        assert backup['version']==4 and len(backup['entries'])==1
        page.evaluate('window.confirm=()=>true')
        page.evaluate('(s)=>restore(s)',json.dumps(backup))
        assert len(page.evaluate("JSON.parse(localStorage.getItem('creatorLedgerData_v2')).entries"))==1
        broken=json.loads(json.dumps(backup));broken['entries'][0]['gross']=''
        error=page.evaluate('''(s)=>{try{restore(s);return ''}catch(e){return e.message}}''',json.dumps(broken))
        assert error and 'gross' in error.lower(),error
        assert len(page.evaluate("JSON.parse(localStorage.getItem('creatorLedgerData_v2')).entries"))==1
        # Invalid and zero-gross imports must not alter saved data.
        invalid=sample.replace(',100,10,',',0,10,')
        rejected=page.evaluate('''(s)=>{try{importCSV(s);return ''}catch(e){return e.message}}''',invalid)
        assert rejected and 'gross' in rejected.lower(),rejected
        assert len(page.evaluate("JSON.parse(localStorage.getItem('creatorLedgerData_v2')).entries"))==1
        # Simulate a second application load with the same saved localStorage state.
        page.evaluate('load();render()')
        assert len(page.evaluate('entries'))==1
        assert not errors,errors
        print(f'PASS width={width}: import preview, commit, dedup, CSV download, backup download/restore, invalid backup rejection, reload, no page errors')
        page.close()
    browser.close()
