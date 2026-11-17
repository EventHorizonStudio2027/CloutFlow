# CloutFlow (working brand)

CloutFlow is the current working name. Financial data compatibility is retained from CloutFlow 2.0.

A local-first creator income tracking application.

## Project files

- `index.html` — mobile-first interface and dialogs
- `assets/css/app.css` — visual styles and responsive layouts
- `assets/js/app.js` — ledger logic, imports, exports, and UI interactions
- `tests/smoke.test.js` — dependency-free structural and JavaScript checks

## Run locally

Open `index.html` in a browser. For more consistent browser behavior, run a local web server in this directory (`python3 -m http.server 8000`) and open `http://localhost:8000`. No remote accounts or APIs are connected.

## Data and privacy

The application currently stores financial records in the browser's `localStorage`. Different browsers, devices, and origins have separate storage. **Export a backup before changing browsers or clearing site data.** There is no cloud synchronization.

## Verification

Run `node tests/smoke.test.js` to validate file references, script syntax, and element references. These checks do not replace interactive browser tests or real platform report validation.

## Packaging

The ZIP is a source project, not a native iOS or Android installable. Future modules can be added under `assets/`, `tests/`, and dedicated integration directories without turning the app back into a monolithic file.

## Testing

Run `npm test` with Node.js 18 or newer. The suite checks application asset wiring, script syntax, DOM references, CSV parsing, malformed quote rejection, spreadsheet formula escaping, and CSV export round trips. Browser-level testing and real platform report fixtures are still required before production use.

### Financial and export regression coverage

`npm test` also runs `tests/finance.test.js` and `tests/exports.test.js`. These verify payout allocation limits, currency separation, partial and legacy settlements, signed refunds, recovery matching, and actual generated CSV worksheet contents (including quoted multiline text and spreadsheet formula escaping). These are Node-based code tests, not a substitute for full browser end-to-end testing or verification with live platform statements.

### Financial data safeguards
Startup and backup restore validate raw financial records before normalization. Missing IDs, missing or zero gross earnings, invalid amounts, and malformed payout allocations are rejected rather than silently repaired. Run `npm test` to execute the raw-data integrity regression suite.

### Lifecycle regression tests

`npm test` also exercises multi-deposit allocations, post-payout refunds, confirmed recovery accounting, legacy paid records, and repeated deposit references. Repeated payout references within the same platform/account/currency are flagged for review as warnings, not automatically removed.

## Browser interaction regression tests

Run `npm run test:browser` on a system with Python Playwright and Chromium installed.
The suite renders the actual app in headless Chromium at 390px and 1280px,
using an isolated in-memory localStorage shim because this test environment
blocks navigation to local pages. It checks income validation/creation,
payouts for unnamed accounts, adjustments, backup restoration, and page errors.
These tests do **not** verify normal browser storage persistence across page
reloads, downloaded files, external API connections, or every workflow.

### Browser-tested fixes
- An unnamed creator account is a valid payout account; the payout form no longer
  blocks it with native `required` validation.
- Gross earnings must be positive, consistent with the raw-data integrity
  checks used on reload and backup restore.

## Extended browser integration checks

Run `npm run test:browser` to test real Chromium interactions at mobile and desktop widths. The extended suite covers the import file picker and preview, duplicate detection, actual downloaded CSV/JSON files, backup restore, invalid backup rejection, and in-session reload. It uses a test-only in-memory storage shim because local navigation is restricted in the test environment; this is **not** a substitute for persistence tests across a real browser restart.

### Recent fixes

- Fixed a missing `fmt()` formatter that crashed the CSV import preview.
- Rejected zero-dollar gross income in CSV imports, matching income form and saved-record validation.

## Platform import and backup hardening

`tests/platform-imports.test.js` covers 20 positive and negative cases across YouTube Analytics, Apple Sales and Trends TSV, and the supported-column Google Play earnings CSV. The adapters intentionally reject zero/negative sales rows rather than producing income that fails saved-record validation. Google Play refund and chargeback report rows are **not** automatically imported as adjustments; users must enter verified adjustments separately. References are matched case-insensitively within platform, account and currency to reduce accidental duplicate imports.

`tests/browser_platforms.test.py` exercises all three report import previews, commits and repeat-import duplicate checks in Chromium at mobile and desktop sizes, and rejects malformed backup collection shapes without altering the active ledger. Run `npm run test:browser` with Python Playwright and Chromium installed. These tests use an in-memory storage shim, not persistent browser storage across restarts.

### Imported-content security regression (November 2026)

`tests/browser_security.test.py` renders the application at 320px, 390px, and 1280px with deliberately hostile transaction IDs and HTML descriptions. Income Edit and Copy use delegated event handlers with escaped `data-*` attributes, not dynamically constructed inline JavaScript. Run with `npm run test:browser`. This is focused DOM injection coverage, **not** a comprehensive security audit.

### Reporting period and migration reliability (November 2026)

- The **Last month** chart now uses a single previous-calendar-month bucket, including December/January transitions, instead of showing a six-month trend under a one-month label.
- `load()` resets transient integrity flags when explicitly reloading, and reports legacy migration write failures without clearing the original legacy storage key.
- `tests/periods.test.js` covers period boundaries, adjustments, all-time history, and chart labels.
- Browser import tests wait for asynchronous preview completion rather than racing file reading.

### Storage-failure and restart-style browser tests

`tests/browser_storage.test.py` simulates quota/write failures and denied reads in Chromium at 320, 390, 768 and 1280 pixels. It verifies that failed writes do not leave phantom transactions in memory and that raw-recovery export reports blocked storage reads without an uncaught page error. `tests/browser_restart.test.py` creates a fresh Chromium document with a prior storage snapshot and checks successful reload and read-only protection of corrupt data. These tests use injected storage rather than verifying persistence across an actual browser restart.

## Working-brand migration

- The UI, page title, export filenames and new backup metadata use **CloutFlow**.
- The existing `creatorLedgerData_v2` localStorage key is intentionally **unchanged**: renaming it would make existing saved transactions appear missing.
- Existing version 2–4 backups remain importable. Do not rename their internal financial fields or change their amounts.
- This is a provisional brand, not a verified trademark or domain claim.
- The original ZIP filename is retained during the working-name transition; no financial data migration is required.

### Accessibility and responsive interaction (CloutFlow)

The standalone `assets/js/accessibility.js` enhances dialog semantics, associates form labels with inputs, traps keyboard focus inside open dialogs, supports Escape to dismiss, and restores focus to the initiating control. The stylesheet adds visible focus indicators, a skip link, reduced-motion support and small-screen modal improvements. These changes do not modify financial records. Run `python3 tests/browser_accessibility.test.py` for the four-width Chromium keyboard checks.

## Mobile earnings ledger (November 2026)

On screens up to 600px, the earnings ledger renders semantic table rows as compact two-column cards, with labeled fields, wrapped long descriptions, and 44px Edit/Copy touch targets. Larger screens retain the original financial table. The underlying earnings data and calculations are unchanged. Run `python3 tests/browser_mobile_ledger.test.py` for five viewport checks (320, 390, 600, 768 and 1280px).

### Mobile reconciliation cards
Settlement and actual-deposit reconciliation tables now display labeled, touch-friendly cards at widths of 600px or less; desktop tables and financial calculation logic remain unchanged. Run `npm test` to verify structural checks.

### Account overview currency safety
Account overview cards display separate net earnings totals for every currency present in the selected period. They never silently discard non-USD earnings or combine currencies without exchange rates. Mobile account cards wrap long names and provide full-size account management controls. Run `npm test` to include `tests/accounts.test.js`.

### Mobile navigation
The five-action phone dock links to overview, transactions, new income, import, and a More tray for CSV export, JSON backup and restore. The tray supports keyboard Escape, focus return, and outside-click dismissal. Accounting event handlers remain in `app.js`; the navigation module only controls presentation.

### Mobile navigation browser verification

`tests/browser_mobile_navigation.test.py` checks the five-action dock in Chromium at 320, 390, 768 and 1280 px, including keyboard focus, Escape dismissal, action routing, CSV download, and overflow. Run it directly or through `npm run test:browser`.

## Ledger discovery upgrade (November 2026)

- Transaction search now supports multiple words across platform, account, description, category, reference, currency, date, and status; all search terms must match (case-insensitive).
- Clear-search and reset-all-filters controls, including account/source/status/sort. `Ctrl+K` / `Cmd+K` focuses search; Escape clears the focused nonempty search.
- Sort by newest, oldest, platform, or net amount **within currency**. The net amount sort groups currencies alphabetically rather than implying cross-currency exchange-rate equivalence. Sorting does not mutate stored records.
- Empty-state copy distinguishes a filter mismatch from no earnings in the selected period.
- Pure `assets/js/ledger-tools.js` helper with Node regression tests and responsive Chromium interactions in `tests/browser_ledger_discovery.test.py`.
- The browser test harnesses load the new helper before the existing app script. No storage migration is needed.

### Currency-aware overview
The dashboard now includes a per-currency adjusted-net earnings and recorded-deposit overview. It does not convert currencies, and deposits are not added to revenue. Currency totals follow the selected period, using earned dates for income, adjustment dates for corrections, and received dates for deposits. The four headline KPI cards remain USD-only.

### Account insights
Select a platform/account pair to inspect period-specific gross earnings, adjusted net earnings, adjustments, and recorded deposits by currency. The account selection affects only the Account Insights panel, not global KPIs or the ledger. Account identities include platform to distinguish similarly named channels. No exchange rates are inferred.

### Account Insights browser coverage

`tests/browser_account_insights.test.py` checks account selection, platform/name isolation, USD/EUR financial calculations, adjustment and deposit separation, period changes, empty accounts, and overflow at 320/390/768/1280px. Run with `python3 tests/browser_account_insights.test.py`.

### Revenue chart auditability
The USD adjusted-revenue chart now has a keyboard-accessible Show chart data toggle and a CSV export. Both use the chart's exact period buckets, including negative values and dated adjustments. Deposits are excluded because they are not new earnings. The export uses the existing CSV formula-injection safeguards.

### Revenue chart browser verification
The revenue chart data table refreshes even when the canvas is hidden or cannot draw. The CSV export uses the same projection. Run `python3 tests/browser_revenue_trends.test.py` to verify the table, negative adjustments, currency isolation, CSV download, and layout in Chromium at 320/390/768/1280px.


### Period-over-period revenue comparison
A new USD-only revenue comparison panel shows adjusted net and gross earnings for matched calendar days: current month vs previous month, last month vs preceding month, or year to date vs equivalent dates in the previous year. Adjustments follow their dated records, and payouts are never added as earnings. All-time reports deliberately show no comparison. Percentage changes are not displayed when the previous baseline is zero or negative. The feature is implemented in `assets/js/period-comparison.js` with unit and Chromium tests.

### Top revenue platforms
The dashboard ranks the five highest adjusted-net platforms separately for each recorded currency, for the active reporting period. Dated adjustments are included, deposits are excluded, and no foreign-exchange conversions are assumed. `assets/js/platform-rankings.js` provides a pure summarizer with regression tests in `tests/platform-rankings.test.js`. Interactive browser verification for this new panel is still pending.

## Platform ranking browser verification
- Added Chromium tests at 320, 390, 768, and 1280 pixels for ranking order, mixed currencies, negative adjustments, and HTML escaping.
- Updated browser test harnesses to load platform-rankings.js.
- Clarified the empty-state copy for adjustment-only periods.

### Platform revenue share and concentration
Platform rankings now show each platform's share of **positive adjusted revenue** in its currency, a largest-source indicator, and top-three concentration. Negative and zero adjusted platforms remain listed but have 0% share when positive revenue exists. If no positive adjusted revenue exists, percentages are unavailable rather than misleadingly shown as zero. No currencies are converted or combined; deposits are excluded.

### Account revenue rankings
The dashboard now ranks individual platform-qualified creator accounts by adjusted net earnings within each currency. It includes dated adjustments, excludes deposits, preserves loss-making accounts, and calculates positive-revenue shares without cross-currency conversion. Accounts with the same name on different platforms are distinct. The feature is implemented in `assets/js/account-rankings.js` with unit tests and Chromium checks at 320/390/768/1280px (`tests/browser_account_rankings.test.py`).

## Account growth and declines

The account-growth panel compares matching calendar windows (month-to-date, prior month, or year-to-date) using the existing period comparison rules. It groups earnings and dated adjustments by platform, account, and currency; includes accounts active in either period; and displays absolute changes even when a percentage has no positive previous baseline. Deposits are excluded. All-time reporting has no comparison. The dedicated Node and Chromium tests are included in standard scripts.

### Dashboard organization
Six analytics panels now have keyboard-accessible expand/collapse buttons. All start expanded for existing users; panel preferences are saved separately under `cloutflow_dashboard_panels_v1` and do not affect financial records. If browser storage is unavailable, the controls remain functional for the current page. Verify with `node tests/dashboard-panels.test.js` and `python3 tests/browser_dashboard_panels.test.py`.

### Dashboard quick access
A compact, horizontally scrollable shortcut strip links to Transactions, Accounts, Payouts, Refunds, and Data Health, with Add Income and Record Payout actions. Jump controls move keyboard focus to the destination heading; they do not modify financial records.

### Payout allocation assistant
The payout form now displays live remaining deposit balances and an over-allocation warning. **Fill available earnings** proposes allocations in displayed earnings order up to the deposit amount; it never saves automatically. Existing validation remains authoritative.

### Payout assistant browser verification (November 2026)
The `tests/browser_payout_assistant.test.py` Chromium test covers auto-allocation ordering, live remaining balances, over-allocation warnings, invalid deposit amounts, currency formatting, and dynamic earnings rows at 320, 390, 768, and 1280 pixels. The test uses a controlled payout-form fixture; it does not by itself establish end-to-end persistence of a saved payout. Run it with `python3 tests/browser_payout_assistant.test.py`.

### Payout reconciliation attention queue
The Payout Reconciliation section now displays a read-only list of deposits with unallocated balances for the selected reporting period. It groups outstanding amounts by currency, orders deposits oldest-first, and provides a Review button opening the existing payout editor. Fully allocated deposits do not appear in the attention queue. No deposits or allocations are changed automatically.

Tests: `node tests/payout-queue.test.js` verifies cent-safe totals, ordering, full allocations, and currency separation. `python3 tests/browser_payout_queue.test.py` tests the actual app at 320, 390, 768, and 1280 pixels, including editing an allocation, accepting confirmation, saving to local storage, and reloading.

### Duplicate deposit review
The payout form warns about an existing deposit with the same platform, account, currency, received date and amount, even without a bank reference. Saving a potential duplicate requires explicit confirmation; exact matching references remain blocked by the original validation. Detection is advisory and does not alter saved records.

### Duplicate payout browser verification
- `tests/browser_payout_duplicates.test.py` runs the real payout form in Chromium at 320, 390, 768, and 1280 pixels.
- Verifies warning updates when currency or amount changes, rejecting a duplicate without mutation, and accepting a legitimate repeated deposit with saved-storage verification.
- Payout platform, account, and currency changes now refresh duplicate previews immediately after rebuilding eligible allocation rows.

### Duplicate identifier protection (November 2026)
Saved financial records with repeated IDs in any collection (income, accounts, payouts, or adjustments) are rejected before normalization. The original localStorage payload is preserved, editing remains locked, and the recovery center can export raw data. Four Chromium fixture checks cover each collection. Real browser-profile restart verification remains outstanding because the test environment blocks navigation to both local files and localhost.

### Backup and saved-data hardening (November 2026)
- JSON backup downloads now include a UTC timestamp in the filename to reduce accidental overwriting of older backups. The version 4 backup structure remains unchanged.
- Raw-data validation blocks a payout with repeated allocations to the same earnings record before normalizing stored data. The app preserves the original localStorage value and enters read-only recovery mode.
- Automated Node and Chromium tests cover these cases.

### Creator account directory (November 2026)

The Creator accounts & apps section now offers live, case-insensitive search across account name, platform, and notes, plus All / Managed / Not yet managed filters. A live result count distinguishes total accounts from filtered results, and the empty state distinguishes an empty directory from no search matches. The directory is read-only until the existing account edit/management buttons are used; filtering never mutates records. The controls remain usable at 320px width. Unit coverage: `tests/account-directory.test.js`; real Chromium interaction coverage: `tests/browser_account_directory.test.py` (320, 390, 768, 1280px).

### Personalized income opportunities (November 2026)
- Dashboard includes **Ideas to grow your income**, a read-only recommendation section derived from recorded creator accounts and income entries (not external tracking).
- Streaming/social creators see opportunities such as multistreaming, short-form clips, brand sponsorships, affiliate links, supporter memberships, digital products, and merchandise. App developers and storefront operators receive category-specific ideas.
- Each suggestion includes an actionable next step and a caution about platform rules, eligibility, disclosures, or costs. Already-tracked income types are identified where possible; this is not a claim that a service is connected or that a strategy will earn money.
- Filter by audience growth, brand/affiliate, community, or products. Recommendations do not write to financial records or imply guaranteed income.
- Node checks: `tests/income-opportunities.test.js`; Chromium tests: `tests/browser_income_opportunities.test.py` (320, 390, 768, 1280px).

### Contextual growth recommendation pop-ups
Relevant revenue ideas now appear as a compact, dismissible pop-up, at most once per page visit. Dismissing an idea snoozes it for 30 days in separate local preferences; financial records are untouched. A small Browse growth ideas control expands the complete suggestion directory on demand. Recommendations remain advisory and platform rules should be checked before acting.

### Growth-tip pop-up browser coverage
The pop-up supports Escape-key dismissal when focused, 30-day per-idea snoozing, one automatic tip per visit, and a keyboard-focused Explore ideas destination. `tests/browser_opportunity_popups.test.py` verifies the interactions at 320, 390, 768, and 1280 px and is part of `npm run test:browser`.

### Growth tip preferences
Contextual growth tip pop-ups can be snoozed for 30 days or disabled entirely with **Turn off automatic tips**. The full recommendations directory remains available through **Browse growth ideas**, where the **Automatic tips: On/Off** button can restore pop-ups. Preferences are stored separately from financial records.

### Context-aware recommendation timing
Growth pop-ups now keep a separate, local-only record of observed creator platforms (`cloutflow_opportunity_activity_v1`) and the last automatic display (`cloutflow_opportunity_last_shown_v1`). The first observed platform set establishes a baseline; later additions can prioritize an eligible related recommendation immediately. Ordinary recommendations are capped at once per 24 hours across visits, as well as once per page visit. The 30-day per-idea snooze and permanent opt-out take precedence. These preference records never modify the financial ledger. If local storage is unavailable, recommendations degrade without preventing financial operations. Browser tests cover the cooldown and a new-platform trigger at four screen widths.

### Recommendation notification edge-case hardening
- Switching automatic tips off from the growth-ideas directory immediately closes a currently visible notification.
- A newly detected platform only overrides the 24-hour notification cooldown when there is an eligible recommendation specifically matching that platform. Unrelated new platforms cannot trigger a generic tip during the cooldown.
- Chromium regression coverage verifies both behaviors at 320, 390, 768 and 1280px.

### Income milestone-triggered growth tips
Automatic growth tips can now prioritize complementary ideas after the first newly observed sponsorship, affiliate commission, membership/subscription, or viewer-support earnings category. Existing records establish a baseline; milestones are tracked in separate optional local preferences and do not alter the financial ledger. The standard 24-hour limit remains for routine tips, while relevant newly observed milestones can surface earlier.

### Growth idea progress
Creators can mark each recommendation Interested, Trying it, Already doing this, or Not started. Preferences persist in a separate localStorage key (`cloutflow_opportunity_progress_v1`) and never alter earnings. Ideas marked Already doing this are suppressed from automatic pop-ups while remaining visible in the manual directory.

### Growth idea progress tracker
The optional growth-ideas directory now filters by Not started, Interested, Trying it, and Already doing this. It shows visible counts for experiments underway and ideas already adopted. Changes are saved in a separate local-only preference key; they never alter earnings or payouts.

### Growth opportunity planning
Each idea now offers a collapsible planning area for a short next-step note (up to 500 characters) and an optional monthly income goal in a selected currency. These are creator-entered targets, **not forecasts or attributed revenue**, and they never change the financial ledger. Plans persist under `cloutflow_opportunity_plans_v1`, separate from financial data. Empty note and zero target clears a plan. Input is validated for nonnegative amounts and up to two decimal places. Added Node and Chromium tests covering persistence, invalid goals, and four viewport widths.

### Growth goal overview
The recommendations directory summarizes saved opportunity plans and user-entered monthly targets, grouped by original currency (never converted or added across currencies). Goals are planning targets only, not realized income, revenue forecasts, or causal attribution to an opportunity. The overview updates immediately when a plan is saved, including when a plan is cleared. Tests cover currency-safe aggregation, filtering out unavailable recommendations, and responsive browser plan-save interactions.

### Growth planning CSV export
The Growth Ideas directory includes **Export growth plans CSV**, which downloads `cloutflow-growth-plans.csv` with the relevant opportunity name, category, current progress, optional next-step notes, target currency, monthly target, and plan update timestamp. Monthly targets are explicitly labeled **not earnings**. Export does not alter or include financial ledger records. Spreadsheet formula-like notes are escaped to prevent execution when opened in spreadsheet software. Node tests: `tests/opportunity-report.test.js`; Chromium download tests: `tests/browser_opportunity_report.test.py`.

### Growth income context
The growth ideas directory displays current-calendar-month **recorded net earnings by earned date**, alongside saved monthly growth targets, grouped by currency. This is a read-only side-by-side context, **not** a goal attainment percentage, causal attribution, payout calculation, or forecast. Invalid income rows are omitted from this supplementary context; financial integrity checks remain authoritative. Unit coverage: `tests/growth-income-context.test.js`.

### Monthly earned-income history and CSV export
The optional Growth Ideas directory now displays a read-only month-by-month history of recorded **net earned income** with selectable 3-, 6-, and 12-month windows. The table groups amounts by their original currency, never adds deposits as new earnings, and displays absent currency/month combinations as missing rather than zero. It is horizontally scrollable on narrow mobile screens. **Export income history CSV** downloads the selected period's month-by-currency values, with blank cells for missing income. These figures are not attributed to growth opportunities and are not compared to planning targets as attainment. Financial integrity and ledger reconciliation remain independent. Node tests cover month/year boundaries, currency separation, and export serialization; Chromium tests verify the range selector, responsive layout, and downloaded CSV at 320, 390, 768, and 1280px.

### Monthly income intelligence (November 2026)
The Growth Ideas directory now provides read-only per-currency month-over-month net earned income comparisons, an average across months with recorded earnings, and average absolute percentage changes where at least two consecutive comparisons have valid nonzero baselines. Months without entries are missing observations, not zero earnings. This is descriptive history, not a forecast, and it never attributes income to recommendations or modifies the ledger. Unit tests: `tests/income-intelligence.test.js`; browser tests: `tests/browser_income_intelligence.test.py` (320, 390, 768, 1280px).


### Confirmed recurring agreement planner (local-only)

The Growth Ideas section includes a separate recurring agreement register for creator-entered commitments. It supports create, edit, pause, end, and delete, monthly/quarterly/annual expected payments, optional last-payment date, and a next-90-days schedule with currency-separated totals. This is **not** verified contract data, an accounts-receivable ledger, or recognized revenue. The planner is stored under `cloutflow_recurring_agreements_v1` separately from the core financial ledger. Existing financial JSON backups do not yet include this separate planner; retain browser storage until a combined backup feature is added. Invalid stored agreement data locks planner editing rather than overwriting the data. Monthly day-of-month dates clamp to the final calendar day for short months. Unit and Chromium tests cover scheduling and CRUD.

### Unified backup for recurring agreements
JSON backups now include the separately stored recurring agreement records. If stored agreements are invalid or unreadable, backup is blocked rather than silently omitting them. Unified restore prevalidates all included agreements and attempts ledger rollback if agreement persistence fails. Older backups without `recurringAgreements` remain supported and leave existing agreement records unchanged. Local browser storage is not cloud synchronization; maintain external backups.

### Agreement deposit review (advisory)
The expected-payment calendar now displays potential deposit matches from recorded payouts when currency, amount in cents, and dates within ten days align. Platform matching ranks candidates first. These are unverified suggestions, not automatic settlements: deposits may be shared across agreements, and absent candidates do not prove nonpayment. Historical agreement dates are not retroactively generated by the 90-day future schedule.

### Explicit agreement-to-deposit allocations (November 2026)
The recurring agreement calendar now permits creator-confirmed, **partial or full** allocations of a recorded deposit to an expected agreement installment. A deposit can be shared between installments only up to its recorded total; an installment cannot be allocated beyond its expected amount. Currency mismatches, missing deposits, invalid amounts, and duplicate links are rejected. Users can unlink allocations. These links are evidence for manual review and **do not modify the underlying payout, income, or accounting allocations**. The UI distinguishes unallocated, partially allocated, and fully allocated installments and displays remaining amounts. Editing/deleting deposits triggers an updated review; orphaned or overallocated links produce warnings instead of being silently treated as paid. Links are stored in `cloutflow_agreement_settlements_v1` and included in unified JSON backups. A backup with malformed settlement records is rejected before modifying financial data. Restore attempts rollback of ledger and agreement data if writing settlement links fails; rollback itself can fail if storage is unavailable. Legacy backups without settlement data preserve existing settlement links, which should be reviewed after restore for mismatched references. Unit tests: `tests/agreement-settlements.test.js`, `tests/unified-backup.test.js`; browser tests: `tests/browser_agreement_settlements.test.py` at four viewport widths.

### Creator cash-flow attention overview
The recurring agreement manager now shows a read-only currency-separated summary covering 90 days before and after the current date. It distinguishes expected installment amounts, creator-confirmed deposit allocations, outstanding amounts, past-due unallocated amounts, and upcoming/due-today amounts. This is not a cash balance or recognized revenue; settlement link warnings are surfaced. Run `node tests/creator-cashflow.test.js` for calculation regression coverage.

### Payment attention queue
A read-only, prioritized queue for agreement installments now appears beneath the cash-flow overview. Filter overdue, due-today, upcoming, fully allocated, or all installments; the default attention view includes overdue, due-today and partially allocated installments. It uses the same 90-day past/future reporting window as the cash-flow overview. No payment is automatically recognized as revenue or settled. Tested with `tests/cashflow-attention.test.js` and Chromium at 320/390/768/1280 px.

### Payment attention CSV export
The Payment Attention Queue can export the currently selected filter to a UTF-8 CSV containing due dates, agreement names, currency, expected/allocated/remaining amounts, allocation status and days until due. These are expected contractual installments and creator-confirmed deposit links, **not** recognized earnings or bank-verified payments. CSV text fields are escaped against spreadsheet formula injection. The browser regression suite exercises a real CSV download at four viewport widths.

### Payment follow-up notes and in-app reminders
The Payment Attention Queue supports installment-specific follow-up status (not started, contacted, waiting, resolved), notes (up to 1,000 characters), and optional reminder dates. Due reminders are displayed when the queue is viewed; they are **not** operating-system push notifications or scheduled background alerts. Notes are HTML-escaped on display, stored locally in `cloutflow_payment_followups_v1`, and are never counted as earnings or deposits. Invalid/corrupted follow-up storage locks edits rather than overwriting records. Follow-up notes are not yet part of the unified JSON backup; export or copy them separately until backup coverage is expanded.

### Approved brand assets
The header uses the chosen flowing-C icon from the supplied CloutFlow identity board and the exact gradient CloutFlow lettering from the user-selected wordmark screenshot. Cropped image assets are in `assets/icons/`: `cloutflow-symbol.png` (transparent symbol), `cloutflow-wordmark.png` (transparent lettering), `cloutflow-app-icon.png` (512px app tile), `cloutflow-icon-192.png`, and `cloutflow-favicon.png`. The old SVG remains for historical compatibility but is no longer the active favicon.

### Logo-aligned color polish
The app uses a midnight-navy foundation with vivid cyan, electric blue, and violet accents matched to the approved CloutFlow identity. Primary actions and data highlights share a controlled three-stop gradient; focus rings remain visible and reduced-motion preferences are respected. The PNG favicon MIME type and browser theme color match the actual assets.

### Payment workspace discoverability (November 2026)
- Recurring agreements, 90-day payment schedule, cash-flow overview, settlement allocation, and follow-up queue now occupy a visible independent dashboard card instead of being nested inside the optional hidden Growth Ideas directory.
- The main quick-access strip includes **Agreements & follow-ups**, and keyboard navigation focuses the workspace heading (including `h4` headings).
- Existing element IDs and saved data formats are unchanged. Browser regression covers the workspace shortcut and visibility at 320/390/768/1280px, plus mobile navigation, agreement CRUD, payment attention, settlements, and follow-up interactions.

### Unified backup: payment follow-ups
JSON backup now includes `paymentFollowups` with installment-specific notes, contact status, reminder dates and last-updated dates. Backups fail closed if follow-up storage is corrupt. Restore validates records and unique installment keys before writing; backups without the field preserve existing follow-ups. Restore attempts to roll back ledger, agreement, settlement and follow-up storage to their previous raw values if a later write fails. These are local browser backups, not automatic cloud sync. Unit tests cover inclusion, invalid records, duplicate keys and corrupt-storage blocking; focused Chromium suites cover follow-up editing, settlement allocation and payment attention across four widths.

### Unified restore browser regression (November 2026)
Chromium test `tests/browser_unified_restore.test.py` verifies full JSON backup/restore round-trip for ledger deposits, recurring agreements, settlement links and payment follow-ups; preservation of business records when importing older backups; and preflight rejection of invalid follow-ups without changing stored records at 320, 390, 768 and 1280 px. The previously malformed `browser_storage.test.py` script injection was repaired and its storage failure tests now pass.

### Dashboard payment reminders
The main dashboard now contains a responsive, read-only payment attention summary, backed by `assets/js/payment-dashboard.js`. It reports overdue, due-today, partially allocated expected installments and follow-up reminders separately, noting overlapping counts. The shortcut navigates and focuses the agreements workspace. It never records scheduled payments as income and displays a warning if underlying agreement or follow-up storage is invalid. Tests: `tests/payment-dashboard.test.js` and `tests/browser_payment_dashboard.test.py`.

### Seven-day payment forecast (2026-11-16)
The dashboard reminder panel now groups upcoming (1–7 days) *outstanding* expected installment balances by ISO currency, excluding allocated/settled balances and future dates outside the window. No exchange-rate assumptions are made; these are expected contractual payments, not recorded earnings. Invalid currency/amount values are omitted with a visible warning. Regression tests cover mixed currencies, partial balances, invalid data, and four Chromium viewport sizes.

### Payment forecast extension
The dashboard now groups outstanding upcoming installments by currency for 7-day and 30-day windows and reports overdue outstanding amounts separately. The next expected date excludes past-due installments. These figures are user-entered expected payments, not earned revenue or verified bank balances. Invalid currencies or amounts are omitted with a warning.

### Income editor validation hardening

The live income-entry assistant validates integer-cent monetary amounts, gross/deduction limits, earned and payout dates (including real calendar dates), and Paid status/date consistency. It announces the first issue, associates invalid fields with feedback for assistive technology, and prevents invalid form submissions before the ledger save handler runs. Chromium coverage exercises four viewport widths.

## GitHub source-control workflow

The repository is intended to be **private**. The canonical branches are `main` (stable) and `develop` (integration). Pull requests run the Node financial regression suite and full Chromium browser suite through `.github/workflows/ci.yml`. Repository hygiene checks run separately. CI browser tests use Linux Chromium; passing them does not verify iOS Safari or production deployment. See `CONTRIBUTING.md` for the contribution and release process. Never commit real financial data, backups, exported reports, or credentials.
