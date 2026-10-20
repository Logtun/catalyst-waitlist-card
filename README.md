# Catalyst Waitlist Hype Card

Make your personalised "I'm on the Catalyst waitlist" card with your X name, photo and belief, then download it or share it on X.

made by @iamlogtun · not official

## Deploy

vercel.com/new → Import this repo → Deploy

- Framework Preset: **Other**
- Build Command: none (leave empty)
- Output Directory: leave as default (the site is at the repo root)

It's a plain static site: no build step, no environment variables.

## After the first deploy

The share caption and the link on the card use whatever address the site is opened on, so they follow your Vercel URL automatically.

For the link preview on X/WhatsApp, some apps need a full image URL. Once you know your Vercel address, you can change `og.jpg?v=5` in `index.html` (the `og:image` and `twitter:image` tags) to the full URL, e.g. `https://YOUR-PROJECT.vercel.app/og.jpg`.

## Believers wall (off)

The believers wall is switched off in this version, so the site is fully static. The wall section and its checkbox are hidden and the page makes no wall requests.

All the wall code is in `wall.js`. To bring it back later (for example with Vercel KV / Upstash Redis), add an API route at `/api/believers` and set `WALL_ENABLED = true` at the top of `wall.js`. The file header describes what the route needs to return.
