/**
 * The 2025 Fat Bear Week contestant field.
 *
 * Bears and numbers are the eleven adults listed on explore.org's
 * "Meet the Bears" page for Fat Bear Week 2025. Eleven is an odd field, so the
 * bracket hands out byes to the top remaining seed each round (see bracket.js).
 *
 * ---------------------------------------------------------------------------
 * BEFORE THE PARTY: verify these bios
 * ---------------------------------------------------------------------------
 * Bios are short, paraphrased, joke-forward summaries -- nothing is copied from
 * the source page. Bears marked `verified: false` below are ones whose real
 * identification details were not available when this file was written, so
 * their copy is deliberately generic comedy that asserts no specific facts.
 * Open https://explore.org/meet-the-bears and rewrite those `bio` strings with
 * real (paraphrased!) details before you put this on a TV. The `verified: true`
 * bears reference widely documented details and should still get a skim.
 *
 * Seeding is by rough notoriety, which decides who gets byes. Reorder the
 * `seed` values however you like -- seed 1 gets the first bye.
 *
 * ---------------------------------------------------------------------------
 * REAL PHOTOS
 * ---------------------------------------------------------------------------
 * Every bear ships with `photoUrl: null` and falls back to a generated SVG
 * face. To use a real photo:
 *
 *   1. Save the image as `web/public/bears/<whatever>.jpg`
 *   2. Set `photoUrl: '/bears/<whatever>.jpg'` on that bear below
 *   3. Restart the server
 *
 * A full URL works too. Photos are cropped to a circle, so if the crop cuts
 * off a head, set `photoFocus` to a CSS object-position such as '50% 30%'
 * (left/right, then up/down) to nudge the framing.
 *
 * Bears can be mixed freely -- any bear without a photo keeps its illustrated
 * face, and a photo that fails to load falls back to the illustration rather
 * than showing a broken image on the TV.
 *
 * This file is the source of truth for how a bear presents, and the server
 * re-syncs it into the database on every boot, so edits here take effect on
 * restart even if the bracket is already underway. See web/public/bears/README.md.
 * ---------------------------------------------------------------------------
 */

export const BEARS = [
  {
    id: '128-grazer',
    number: '128',
    name: 'Grazer',
    title: 'Two-Time Chonk Laureate',
    bio: "Back-to-back Fat Bear Week champion and full-time overprotective mother. Long straight muzzle, zero tolerance for nonsense, and a documented willingness to run off males twice her size. Arrives at the falls like she owns the lease.",
    color: '#C98B3C',
    accent: '#F2CF8E',
    photoUrl: null,
    photoFocus: null,
    seed: 1,
    verified: true,
  },
  {
    id: '32-chunk',
    number: '32',
    name: 'Chunk',
    title: 'Certified Unit',
    bio: "A blocky, broad-headed heavyweight with a droopy right jaw and a face full of old arguments he won. Former champion, current vibe: a filing cabinet that learned to fish. The name is not a nickname, it is a job description.",
    color: '#553320',
    accent: '#8A6240',
    photoUrl: null,
    photoFocus: null,
    seed: 2,
    verified: true,
  },
  {
    id: '856',
    number: '856',
    name: null,
    title: 'Retired Middle Management',
    bio: "Held the top spot in the Brooks River hierarchy for years and has the scars to prove the paperwork. Older now, saggier now, still commands the best fishing real estate by simply standing in it. Seniority is a body type.",
    color: '#6E5B4A',
    accent: '#A79383',
    photoUrl: null,
    photoFocus: null,
    seed: 3,
    verified: true,
  },
  {
    id: '503',
    number: '503',
    name: null,
    title: 'Adopted, Thriving',
    bio: "Famously taken in and raised by another bear's family as a cub, and has spent every year since repaying that kindness by eating an unreasonable number of salmon. Pale ears, sweet face, terrifying volume.",
    color: '#B06B3A',
    accent: '#E6B283',
    photoUrl: null,
    photoFocus: null,
    seed: 4,
    verified: true,
  },
  {
    id: '909',
    number: '909',
    name: null,
    title: 'Sister Act, Part One',
    bio: "One half of a well-known pair of littermate sisters who grew up fishing the same stretch of river. Rounds out beautifully every autumn and knows exactly which rock the salmon are hiding behind.",
    color: '#CB9D5C',
    accent: '#F2D6A4',
    photoUrl: null,
    photoFocus: null,
    seed: 5,
    verified: true,
  },
  {
    id: '910',
    number: '910',
    name: null,
    title: 'Sister Act, Part Two',
    bio: "The other littermate sister. Same river, same rock, same commitment to becoming structurally spherical before the snow lands. Sibling rivalry, but measured in circumference.",
    color: '#A5553B',
    accent: '#D89272',
    photoUrl: null,
    photoFocus: null,
    seed: 6,
    verified: true,
  },
  {
    id: '26',
    number: '26',
    name: null,
    title: 'No Cardio Enthusiast',
    bio: "This bear really said no cardio. Shows up, occupies a spot, expands. Has never once been seen doing anything briskly and the results speak for themselves.",
    color: '#45301F',
    accent: '#77573A',
    photoUrl: null,
    photoFocus: null,
    seed: 7,
    verified: false,
  },
  {
    id: '99',
    number: '99',
    name: null,
    title: 'Absolute Round Boy',
    bio: "Came into the season shaped like a normal bear and is leaving it shaped like a beanbag chair with opinions. Every photo is somehow wider than the last one. Nobody has asked questions and nobody will.",
    color: '#D3AA72',
    accent: '#F7E0B6',
    photoUrl: null,
    photoFocus: null,
    seed: 8,
    verified: false,
  },
  {
    id: '602',
    number: '602',
    name: null,
    title: 'Local Fridge',
    bio: "Roughly the dimensions of a chest freezer and approximately as easy to move. Stands in the current with the serene confidence of something that has already eaten enough and plans to keep going anyway.",
    color: '#7B6B3C',
    accent: '#B9A66E',
    photoUrl: null,
    photoFocus: null,
    seed: 9,
    verified: false,
  },
  {
    id: '609',
    number: '609',
    name: null,
    title: 'Sentient Sourdough',
    bio: "Appears to be slowly rising. Started the summer as a bear, currently reads as dough that has been left somewhere warm. Proofing beautifully ahead of the big sleep.",
    color: '#9B6559',
    accent: '#CF9E93',
    photoUrl: null,
    photoFocus: null,
    seed: 10,
    verified: false,
  },
  {
    id: '901',
    number: '901',
    name: null,
    title: 'Pillow With Claws',
    bio: "Deceptively soft-looking from every angle, which is the whole strategy. Has achieved a silhouette with no detectable corners and would like that acknowledged by the judges.",
    color: '#8A6444',
    accent: '#BD9670',
    photoUrl: null,
    photoFocus: null,
    seed: 11,
    verified: false,
  },
]

/** Human-facing label: "128 Grazer" or just "856". */
export function displayName(bear) {
  return bear.name ? `${bear.number} ${bear.name}` : bear.number
}
