# Bear photos

Drop real bear photos in this folder to replace the generated SVG faces.

## How

1. Save an image here, e.g. `128-grazer.jpg`
2. Set `photoUrl` on that bear in `server/src/bears.js`:

   ```js
   {
     id: '128-grazer',
     // ...
     photoUrl: '/bears/128-grazer.jpg',
     photoFocus: null,
   }
   ```

3. Restart the server. `bears.js` re-syncs into the database on every boot, so
   the change takes effect even if the bracket is already built.

A full URL (`https://…`) works in `photoUrl` too, if you would rather host the
images elsewhere.

## Framing

Photos are cropped to a circle and scaled with `object-fit: cover`. Bear photos
are usually landscape, so a centred crop can cut the head off. `photoFocus`
takes a CSS `object-position` to nudge it:

```js
photoFocus: '50% 30%'   // centred horizontally, biased toward the top
photoFocus: '70% 40%'   // bear is right-of-centre in the frame
```

Square-ish crops around the bear's head work best, and roughly 600×600 is
plenty — the largest render is the champion reveal.

## Mixing

You do not have to do the whole field. Any bear without a `photoUrl` keeps its
illustrated face, and the two styles share the same chunky round frame so a
partial set still looks deliberate.

If a photo fails to load — typo, missing file, dead link — that bear falls back
to its illustration rather than showing a broken-image icon on the TV.

## Why these are committed

They are explore.org's images, and the first cut of this repo deliberately kept
them out of git. That turned out to cost more than it saved: Vercel builds from
GitHub, so a git-triggered deploy shipped a field of generated SVG faces and an
empty intermission slideshow, and the failure is silent -- `/bears/<id>.jpg`
comes back as `text/html` rather than 404, because the SPA rewrite catches every
unmatched path.

For a party app that is the wrong trade, so they live in the repo now. If this
ever becomes something more public than one evening in a living room, drop them
again and serve them from your own box instead.

## A note on sourcing

The bears are real animals photographed by Katmai National Park and explore.org.
If you use their images for your party display, credit them (the app already
carries a credit footer on every screen) and don't hotlink straight to
explore.org — download and serve your own copies from this folder.
