# Contributing to CloutFlow

CloutFlow is a local-first creator income application. Financial correctness and data safety take priority over feature velocity.

## Branches

- `main`: stable, reviewed and tested source.
- `develop`: integration branch for upcoming changes.
- Feature/fix branches: open pull requests against `develop`.
- Promote tested `develop` to `main` using a reviewed pull request.

## Verification

1. Run `npm test` before proposing changes.
2. Install Python Playwright and Chromium to run `npm run test:browser`. The existing browser harness currently expects Chromium at `/usr/bin/chromium`; CI provides that path.
3. Document browser failures and platform coverage explicitly; passing unit tests does not establish full browser compatibility.
4. Preserve per-currency totals and never count anticipated agreements or deposits as earned revenue.
5. Test import, backup, and restore changes with invalid input and interrupted storage writes.

## Privacy

Do not commit real creator data, exported CSV files, JSON backups, tokens, passwords, API keys, or `.env` files. Use synthetic records in tests. Keep the repository private until a deliberate public-release decision.

## Release procedure

Review open bugs, run CI, test real mobile devices, and tag a release only after verification. The portable ZIP is a distribution artifact; the repository is the source of truth.
