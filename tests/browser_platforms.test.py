"""Real Chromium UI checks for supported platform-report import previews and backup rejection."""
import json,pathlib,re
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
css=(root/'assets/css/app.css').read_text()
scripts=re.findall(r'<script src="assets/js/([^"]+)"></script>',html)
html=re.sub(r'<script src="assets/js/[^"]+"></script>','',html)
html=html.replace('<link rel="stylesheet" href="assets/css/app.css">','')
reports={
 'youtube':('youtube.csv','Date,Estimated revenue (USD)\n2026-10-01,14.25\n','YouTube'),
 'apple':('apple.tsv','Begin Date\tUnits\tDeveloper Proceeds\tProceeds Currency\tTitle\n20261001\t2\t1.25\tUSD\tMy App\n','Apple App Store'),
 'google':('google.csv','Transaction Date,Transaction Type,Amount (Merchant Currency),Merchant Currency,Product Title,Transaction ID\n2026-10-01,Sale,2.50,USD,My App,order-1\n','Google Play')
}
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (390,1280):
  page=browser.new_page(viewport={'width':width,'height':850})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.add_style_tag(content=css)
  page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}})}""")
  for script in scripts:page.add_script_tag(content=(root/"assets/js"/script).read_text())
  for format,(filename,report,platform) in reports.items():
   page.locator('#mobileImport' if width<=800 else '#importBtn').click()
   page.locator('#importFormat').select_option(format)
   page.locator('#importAccount').fill('Test Account')
   page.locator('#chooseImportFile').click()
   page.locator('#csvFile').set_input_files({'name':filename,'mimeType':'text/plain','buffer':report.encode()})
   page.wait_for_function('(expected)=>document.querySelector("#importPreviewRows").textContent.includes(expected)',arg=platform)
   assert '1 new' in page.locator('#importSummary').inner_text(),(width,format,page.locator('#importSummary').inner_text())
   assert platform in page.locator('#importPreviewRows').inner_text()
   page.locator('#confirmImport').click()
   assert page.evaluate('entries.length')==list(reports).index(format)+1
   assert page.evaluate('entries[entries.length-1].status')=='Pending'
   # Re-import must be treated as duplicate even though new UUIDs are generated.
   page.evaluate('(s)=>showImportPreview(s)',report)
   assert '0 new' in page.locator('#importSummary').inner_text(),format
   page.locator('#cancelImport').click()
  # Backup shape validation must leave existing records unchanged.
  backup=page.evaluate('({version:4,entries,accounts,payouts,adjustments})')
  for field,bad in [('accounts',{}),('payouts','invalid'),('adjustments',{})]:
   damaged=dict(backup);damaged[field]=bad
   err=page.evaluate('''(s)=>{try{restore(s);return ''}catch(e){return e.message}}''',json.dumps(damaged))
   assert 'array' in err.lower(),(field,err)
   assert page.evaluate('entries.length')==3
  assert not errors,errors
  print(f'PASS width={width}: three report formats, actual preview and commit, re-import dedup, malformed backup rejection')
  page.close()
 browser.close()
