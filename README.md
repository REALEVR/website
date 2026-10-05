# realevr.com

Static marketing site for REALEVR, which makes virtual property tours in Uganda. It is plain HTML, CSS and JS with no build step.

- `index.html`, `styles.css`, `main.js`: the site
- `404.html`: not-found page
- `vercel.json`: hosting config (redirects for old `/RVR/...` URLs, security and cache headers)

Preview locally with `python3 -m http.server 8000` and open http://localhost:8000.

Deployed on Vercel. Any push to `main` redeploys automatically once the project is connected to this repo.
