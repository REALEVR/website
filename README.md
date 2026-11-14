# realevr.com

Static marketing site for REALEVR, which makes virtual property tours in Uganda. It is plain HTML, CSS and JS with no build step.

- `index.html`, `styles.css`, `main.js`: the site
- `404.html`: not-found page
- `vercel.json`: hosting config (redirects for old `/RVR/...` URLs, security and cache headers)

Preview locally with `node scripts/dev.js` and open http://localhost:8000 (this also runs the news API). `python3 -m http.server 8000` still works for the marketing pages only.

## Uganda News Filter (`/news`)

A standalone news reader that pulls stories from Ugandan outlets and lets you filter them.

- `api/news.js`: Vercel serverless function at `/api/news`. Fetches each outlet's RSS feed, tags stories by topic and region, and groups the same story reported by different outlets. Responses are cached at the edge for 10 minutes.
- `api/_lib/news.js`: outlet list, feed parser, keyword lists for topics and regions, and story grouping. Edit `SOURCES`, `TOPICS` or `REGIONS` here to add outlets or tune tagging.
- `news/`: the page. Filters by search text, time, topic, region and outlet; mutes words; shows how many outlets carry each story. Topic, region, search and time filters are kept in the URL so a filtered view can be shared. Muted words and hidden outlets are remembered in the browser.
- `tests/news.test.js`: run with `node --test`.

Outlets: Daily Monitor, Nile Post, The Independent, The Observer, SoftPower, Watchdog Uganda, CEO Magazine Uganda, The Cooperator. New Vision, ChimpReports, PML Daily and URN were left out because their feeds are missing or block automated requests. If an outlet's feed fails, the page marks it offline and shows the rest.

Deployed on Vercel. Any push to `main` redeploys automatically once the project is connected to this repo.
