# jsc-fall-backpacking

A one-page trip guide for the JSC fall backpacking trip in Great Smoky Mountains National Park, October 10–13, 2026. It covers the packing list, group gear, permits, a live weather forecast, the schedule, a safety and check-in plan for families, food and water, and the route (Plan A: Jakes Creek, Miry Ridge & AT Loop, with Rabbit Creek & Abrams Creek as the backup).

Plain HTML, CSS and JS with no build step: `index.html`, `styles.css`, `script.js`.

## Publish on GitHub Pages

1. Push to `main`.
2. In the repo, open **Settings → Pages**.
3. Under **Build and deployment**, set Source to **Deploy from a branch**, then pick `main` and `/ (root)`.
4. The site will be at `https://rickeyjohnson.github.io/jsc-fall-backpacking/` within a minute or two.

## Preview locally

```bash
python3 -m http.server 8123
```

Then open http://localhost:8123.

## Updating the guide

- **Group gear:** the "Who's bringing it" column is in `index.html`. Replace `<span class="open">Open</span>` with a name.
- **Weather:** loads live from Open-Meteo when the page opens. Nothing to update.

## Swapping photos

The photos are linked from Wikimedia Commons, and their credits are in the footer. To use your own, put them in an `images/` folder and change the `src` on the three `<img>` tags in `index.html`. If you do, update the footer credits too.
