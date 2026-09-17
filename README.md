# Fat Bear Week 🐻

A live bracket-voting game for an in-person Fat Bear Week party. Guests vote on
their phones, the bracket updates on the TV, and one extremely round bear gets a
crown.

Eleven real 2025 contestants, single elimination, byes for the odd field:
**11 → 6 → 3 → 2 → champion**, four rounds.

```
The Round of Chonk     The Quarter-Pounders   The Semi-Rounds   The Fat Bear Finals
  128 Grazer .. bye        3 matchups         1 matchup + bye       1 matchup
  32 Chunk vs 901
  856      vs 609
  503      vs 602
  909      vs  99
  910      vs  26
```

Pairings come from seeding (best vs worst), and the top remaining seed takes the
bye each odd round. Reorder the `seed` values in `server/src/bears.js` to change
who plays whom — seed 1 gets the first bye.

---

## Before the party: verify the bios

`server/src/bears.js` has a `verified` flag on each bear. Five bears
(**26, 99, 602, 609, 901**) are marked `verified: false` — their real
identification details were not available when the file was written, so their
copy is deliberately generic comedy that asserts no specific facts.

Open [explore.org's Meet the Bears](https://explore.org/meet-the-bears) and
rewrite those `bio` strings with real, paraphrased details before you put this
on a TV. The `verified: true` bears reference widely documented details but
deserve a skim too.

Bios are short paraphrases written for laughs — nothing is copied from the
source page.

---

## Screens

| URL | Who | What |
|---|---|---|
| `/` or `/vote` | guests | Join, then one matchup at a time with big tap targets |
| `/tv` | the TV | Full bracket, live tallies, turnout, QR code to join |
| `/admin` | host only | Open/close rounds, break ties, reveal champion, reset |

The QR code on `/tv` points at the voting URL, so guests just scan it.

---

## Quick start (one machine, both halves)

```bash
# 1. Backend
cd server
cp .env.example .env          # edit ADMIN_TOKEN at minimum
npm install
npm start                     # reads .env; http://localhost:8080

# 2. Frontend, in a second terminal
cd web
npm install
npm run dev                   # http://localhost:5173, reachable from phones
```

The dev server proxies `/api` to the backend on :8080, so both halves share one
origin and no `VITE_API_BASE_URL` is needed locally -- the app works under
whatever address you open it with (`localhost`, the machine's name, a LAN IP).
Point it somewhere else with `VITE_DEV_API_TARGET=http://other-host:8080`.

Vite only answers to hostnames it knows: `localhost`, IP addresses, and this
machine's own name (plus `.lan`/`.local`). For anything else -- a tunnel domain,
say -- list it in `VITE_ALLOWED_HOSTS=a.example.com,b.example.com`.

Open `/tv` on the TV, `/admin` on your phone, and let guests scan the QR code.
Set `VOTE_URL` in `server/.env` to the address guests should actually reach
(`http://your-machine:5173/vote`), since that is what the QR code encodes.

### Docker Compose (self-hosted backend)

```bash
cp server/.env.example .env   # edit ADMIN_TOKEN
docker compose up -d --build  # API on :8080, SQLite in the bear-data volume
```

To serve the frontend from the same box instead of Vercel:

```bash
docker compose --profile local-web up -d --build   # web on :8081
```

The bundled nginx proxies `/api/` to the API container, so
`VITE_API_BASE_URL` can stay blank (same-origin, no CORS).

---

## Deploying: Vercel frontend + self-hosted backend

**Backend** — run `docker compose up -d` on your box and expose it over HTTPS.
A browser on `https://` cannot call a plain `http://` API, so the API needs TLS:
a Cloudflare Tunnel, Tailscale Funnel, or a reverse proxy with a certificate all
work. Then set:

```
ADMIN_TOKEN=something-only-you-know
CORS_ORIGINS=https://your-app.vercel.app
TRUST_PROXY=1
```

`TRUST_PROXY=1` tells the API to believe the `X-Forwarded-For` header, which is
what the per-IP rate limiter buckets on. Set it only when a proxy you control is
actually in front -- otherwise any client can forge the header and skip the
limiter. Leave it off when the API is reachable directly.

**Frontend** — import `web/` in Vercel (root directory `web`). `vercel.json`
already sets the build command, output directory, and the SPA rewrite that keeps
`/tv` and `/admin` working on refresh. Set one environment variable:

```
VITE_API_BASE_URL=https://bears.your-domain.com
```

Vite inlines env vars at build time, so **redeploy after changing it** — editing
it in the dashboard alone does nothing.

### Party-night fallback

If the tunnel misbehaves, run everything on the local network instead: start the
backend on your laptop, run `npm run dev -- --host` in `web/`, set
`VOTE_URL=http://<your-lan-ip>:5173/vote` on the backend so the TV's QR code
points somewhere phones can actually reach, and have guests join over wifi. No
internet required.

---

## Configuration

All backend config is environment variables (`server/.env.example`):

| Variable | Default | Notes |
|---|---|---|
| `ADMIN_TOKEN` | — | **Required.** Unlocks `/admin`. Server refuses to boot without it. Min 6 chars. |
| `PARTY_PIN` | *(blank)* | If set, guests must type this password to join. Blank = anyone with the link. |
| `PORT` / `HOST` | `8080` / `0.0.0.0` | |
| `DATABASE_PATH` | `./data/bears.sqlite` | Put it on a mounted volume so a restart does not lose votes. |
| `CORS_ORIGINS` | `*` | Comma-separated. Set to your Vercel URL in production. |
| `VOTE_URL` | *(blank)* | Overrides the URL in the TV's QR code. Needed when the TV's own address is not the one guests can reach. |

Frontend (`web/.env.example`): `VITE_API_BASE_URL`, blank meaning same-origin.

---

## Run of show

1. **Before guests arrive** — start the backend, open `/tv` on the TV and
   `/admin` on your phone, and enter the host token once.
2. **As guests arrive** — they scan the QR code, enter a name, and optionally
   set a 4–8 digit PIN to lock their name against friends voting as them. The
   host console shows the roster filling up.
3. **Each round** — hit **Open voting**. The TV switches to live tallies and
   shows `N/M judges finished`; the console tells you when it is safe to close.
4. **Closing** — hit **Close voting & reveal**. Losers are eliminated, and the
   next round is built and seeded automatically.
5. **Ties** — a tied matchup (including 0–0) blocks the advance and appears in a
   **Tie-break needed** panel. Pick a winner, or hit 🪙 **Coin flip** and let
   the room boo. The bracket advances on its own once the last tie is settled.
6. **The finish** — after the final round the TV holds on "A champion has been
   decided…" so you can build suspense. Hit 🏆 **Reveal champion** for the
   confetti.
7. **If it goes sideways** — **Reset bracket** wipes all votes and rebuilds from
   all eleven bears, keeping the judges. **Reset + clear judges** also makes
   everyone rejoin.

---

## How it works

- **No real-time transport.** Every screen polls `GET /api/state` every 2s and
  gets the whole world in one payload. Plain polling survives every tunnel,
  proxy and flaky house-wifi setup that breaks SSE and websockets, and a couple
  of seconds of lag is invisible at a party. Polling pauses while a tab is
  hidden, so a phone in a pocket stops hammering the server.
- **Guests are accounts, not devices.** A guest is a display name plus an
  optional self-chosen PIN (scrypt-hashed). Joining returns an opaque token the
  phone keeps in `localStorage`, so a refresh does not cost anyone their votes.
  Because votes are keyed to the guest, the host gets a real turnout count.
- **One vote per matchup** is enforced by a `UNIQUE (matchup_id, guest_id)`
  constraint, not just client-side state.
- **Byes are resolved at build time** — a bye matchup is stored with its winner
  already set, so no round ever waits on a vote nobody can cast.
- **Ballots stay secret.** The TV shows turnout and tallies, never who picked
  what.

### Layout

```
server/            Express 5 + better-sqlite3, plain ESM, no build step
  src/bracket.js   Pure pairing/seeding logic (unit tested)
  src/tournament.js Every read and mutation of bracket state
  src/guests.js    Guest accounts, PIN hashing, roster
  src/routes/      public.js (guests) + admin.js (host)
web/               React + TypeScript + Vite
  src/screens/     VoteScreen, TvScreen, AdminScreen, ChampionReveal, JoinForm
  src/lib/         Bracket helpers shared by the screens
  src/components/  BearAvatar (generated SVG), VoteBar, Confetti, Disclosure
```

### Bear art: illustrations now, real photos whenever you want

Out of the box every bear is a generated chunky SVG face — no hotlinking, no
licensing questions, and they scale crisply from a phone row to a full-screen
champion reveal.

Real photos are a two-line change per bear:

1. Save the image in `web/public/bears/`, e.g. `128-grazer.jpg`
2. Set `photoUrl` on that bear in `server/src/bears.js`:

   ```js
   photoUrl: '/bears/128-grazer.jpg',
   photoFocus: '50% 30%',   // optional, see below
   ```

3. Restart the server.

Details that make this painless:

- **Edits take effect on restart.** `bears.js` is the source of truth for how a
  bear presents (photo, bio, title, colours, seed) and re-syncs into SQLite on
  every boot. Bracket state is never touched, so a restart mid-party will not
  resurrect an eliminated bear.
- **Mix freely.** Any bear without a `photoUrl` keeps its illustration, and both
  styles share the same chunky round frame, so a partial photo set still looks
  deliberate.
- **Broken paths degrade quietly.** A typo or missing file falls back to the
  illustration instead of putting a broken-image icon on the TV. This matters
  more than it sounds: the SPA rewrite serves `index.html` for unknown paths, so
  a missing photo comes back as HTTP 200, not a 404.
- **Framing.** Photos are cropped to a circle with `object-fit: cover`. Bear
  photos are usually landscape, so a centred crop can cut the head off —
  `photoFocus` takes a CSS `object-position` (`'50% 30%'` = centred across,
  biased toward the top) to nudge it per bear.
- A full `https://…` URL works in `photoUrl` too, if you would rather host the
  images elsewhere. Don't hotlink explore.org; serve your own copies.

See [`web/public/bears/README.md`](web/public/bears/README.md) for the same
instructions next to the folder you'll be dropping files into.

---

## Tests

```bash
cd server && npm test      # bracket pairing, byes, seeding, tie handling
cd web && npm run build    # typecheck + production build
```

The bracket tests walk a full 11-bear tournament to prove byes never strand a
bear and the field collapses 11 → 6 → 3 → 2 → 1.

---

## Credit and disclosure

Bear photos and bios adapted from explore.org's Fat Bear Week —
[Meet the Bears](https://explore.org/meet-the-bears), presented by Katmai
National Park & Preserve / Katmai Conservancy.

This app was built with AI (Claude) for a private party — not affiliated with or
endorsed by the National Park Service or explore.org. Every screen carries this
notice as a dismissible banner that returns on reload.
