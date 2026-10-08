# Hosting FeeFlow

FeeFlow is a **pure static site**: HTML + CSS + vanilla JS + fonts + icons. There is no build step, no server code and no environment variables, so it runs on any static host — including straight from this GitHub repository.

## Option 1 — GitHub Pages (recommended, already wired up)

1. Make sure the repository contents are on your default branch (`main`).
2. In the repository: **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Push (or merge a PR into) `main`. The workflow `.github/workflows/deploy.yml` uploads the repo root as a Pages artifact and deploys it.
5. Your site lands at `https://<user>.github.io/<repo>/`.

Notes:

- `.nojekyll` is committed so GitHub Pages serves the files as-is (folders like `assets/` and `sw.js` are untouched).
- The app uses hash routing (`#/students`), so **no rewrite rules are needed** — deep links and refreshes always work on Pages.
- The service worker scopes itself to the folder it is served from, so a `/repo/` base path works without configuration.
- To deploy from a different branch, edit the `on.push.branches` list in `.github/workflows/deploy.yml`.

### Manual Pages (no Actions)

If you prefer **Settings → Pages → Source: Deploy from a branch**, pick your branch and the `/ (root)` folder. Same result, no workflow involved.

## Option 2 — Netlify / Vercel / Cloudflare Pages

- **Build command:** *(leave empty)*
- **Publish directory:** `/` (the repository root)
- No redirects needed (hash routing). Add SPA fallback only if you change routing later.

## Option 3 — Any web server / shared hosting

Copy the repository contents (everything except `.git`, `.github`, `tests/`, `tools/`, `docs/`, `package.json` if you want a minimal footprint) into the web root. That's it — `index.html` at the root is the whole app.

Example nginx:

```nginx
server {
  listen 80;
  server_name fees.example.com;
  root /var/www/feeflow;
  index index.html;

  # long-cache the immutable assets
  location ~* \.(woff2|png|svg)$ { add_header Cache-Control "public, max-age=31536000, immutable"; }
  location = /sw.js { add_header Cache-Control "no-cache"; }
}
```

## Option 4 — Local only

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Opening `index.html` directly from disk also renders the app, but browsers restrict service workers and sometimes `localStorage` on `file://`, so serving over HTTP(S) is recommended.

## After deploying

- **HTTPS matters:** the service worker (offline mode) and “Install app” only activate on HTTPS (or `localhost`). GitHub Pages gives you HTTPS automatically.
- **Updates:** bump `VERSION` at the top of `sw.js` whenever you ship changes so returning visitors get the new shell immediately.
- **Data stays with the visitor:** whatever you deploy, student records remain in each visitor's own browser. There is nothing to secure server-side.
