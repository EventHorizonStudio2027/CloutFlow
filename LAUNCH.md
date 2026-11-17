# Launch CloutFlow from GitHub

## One-time publication

The repository is private. GitHub Pages availability for a private source repository depends on the account plan and settings; Pages sites may be publicly accessible even when their source repository is private. **Do not enter real financial data into an unverified preview deployment.** This release is a local-browser preview, not cloud-backed production software.

1. Open Terminal on your Mac. Obtain the prepared CloutFlow source project and unzip it to a folder you control (if needed).
2. In Terminal, navigate into the project directory: `cd /path/to/Creator_Ledger_Project`.
3. Run `git remote -v` and verify `https://github.com/FatesPassage/CloutFlow.git`.
4. Run `npm test` (requires Node.js installed).
5. Run `git push -u origin main` and `git push -u origin develop`. GitHub may ask you to authenticate with a browser or credential manager.
6. In GitHub repository Settings > Pages, choose **GitHub Actions** as the build and deployment source. If Pages is not available for this private repository on your plan, don't change visibility without deciding whether publishing the source is acceptable. Consider a hosting service that supports private GitHub repositories instead.
7. Open the Actions tab and verify both quality checks and `Deploy CloutFlow preview to GitHub Pages` succeed. The deployment job provides the published URL. Expected default URL if Pages is enabled: `https://fatespassage.github.io/CloutFlow/` (not verified until deployment).

## Subsequent updates

After verifying local tests, commit changes on `develop`, merge reviewed changes into `main`, and push `main`. Every push to `main` triggers the Pages workflow. The deployment workflow reruns Node regression tests and publishes only `index.html` and `assets/`, not tests, Git metadata, or backup files.

## Data safety and limitations

CloutFlow currently stores creator records in the **browser's local storage**. Data entered on one phone/computer does not automatically sync to another. Clearing browser data or using private browsing can erase records. Export a backup frequently and keep it somewhere secure. A public Pages URL is not a secure user account system. Do not treat the preview as a production financial service.

## Troubleshooting

- **Pages is unavailable:** Check your GitHub plan and repository Pages settings. Private repo does not necessarily mean private website.
- **Action fails at Configure Pages:** Enable Pages with GitHub Actions as the source in repository settings.
- **Push fails:** Confirm GitHub authentication and repository write access; do not put personal access tokens in scripts or chat.
- **Blank page:** Open browser developer tools, inspect console errors, and check that all `assets/` paths exist. The app uses relative paths suitable for project Pages.
