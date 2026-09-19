/**
 * The Fat Bear Week contestant field.
 *
 * ---------------------------------------------------------------------------
 * 2026 FIELD -- THE REAL ONE
 * ---------------------------------------------------------------------------
 * Katmai and explore.org revealed the 2026 field and bracket on Friday
 * 18 September 2026. These are those sixteen bears, read off
 * https://explore.org/meet-the-bears on 2026-09-19. Official voting runs
 * 22-29 September, 12-9pm Eastern daily; this app is the party's own bracket
 * and keeps its own clock.
 *
 * Bigger field than last year: 16 bears, up from 12, and Fat Bear Week Junior
 * is gone -- cubs compete inside their mother's family unit instead. Five of
 * the sixteen entries are families.
 *
 * ---------------------------------------------------------------------------
 * SEEDS ENCODE THE OFFICIAL FIRST-ROUND MATCHUPS
 * ---------------------------------------------------------------------------
 * pairBySeed() pairs best against worst: in a field of 16 that is seed 1 v 16,
 * 2 v 15, 3 v 14 and so on (see bracket.js). So the seeds below are NOT a
 * power ranking -- they are chosen so that round one reproduces the real
 * bracket exactly:
 *
 *    1 v 16   132 family      v  284 family
 *    2 v 15   806 family      v  901 family
 *    3 v 14   909             v  428 Studious
 *    4 v 13   131             v  910
 *    5 v 12   620             v  694
 *    6 v 11   610 family      v  89 Backpack
 *    7 v 10   32 Chunk        v  164 Bucky
 *    8 v  9   151 Walker      v  903 Gully
 *
 * Later rounds re-pair by these same seeds, which the real bracket does not,
 * so from round two on this is the party's bracket rather than Katmai's. If
 * you would rather follow the official bracket exactly, reseed the survivors
 * between rounds. Renumbering any seed changes who plays whom -- keep the
 * pairs adding to 17 if you reorder the matchups.
 *
 * A field of any size works; odd fields hand the top seed a bye each round.
 *
 * ---------------------------------------------------------------------------
 * BIOS
 * ---------------------------------------------------------------------------
 * Every bio below is paraphrased from that bear's real 2026 explore.org
 * biography -- nothing is copied, and the jokes are layered on top of true
 * details rather than invented. `verified: true` means the identification and
 * life history here came off the live page.
 *
 * Two notes for whoever reads these out loud: 909 lost both cubs this summer,
 * and the second was killed by 806, who is also in this bracket. Both bios say
 * so, gently. Skip them if the room is not up for it.
 *
 * ---------------------------------------------------------------------------
 * PHOTOS
 * ---------------------------------------------------------------------------
 * `photoUrl` is a square portrait for the avatar; `cardUrl` is explore.org's
 * full June-beside-September card, used by the between-rounds slideshow. Both
 * are written by scripts/fetch-bear-photos.py, whose PHOTOS keys must match
 * the `id` values below. They are gitignored on purpose: explore.org's images,
 * fine on your own TV, not ours to redistribute.
 *
 * Photos are cropped to a circle; if a crop cuts off a head, set `photoFocus`
 * to a CSS object-position such as '50% 30%'. Any bear without a photo falls
 * back to a generated SVG face, as does a photo that fails to load.
 *
 * This file is the source of truth for how a bear presents, and the server
 * re-syncs it into the database on every boot, so edits here take effect on
 * restart even if the bracket is already underway. See web/public/bears/README.md.
 * ---------------------------------------------------------------------------
 */

/**
 * Every bear links here. explore.org keeps the whole field on one page rather
 * than giving each bear its own URL -- re-checked on 2026-09-19 against the
 * revealed field: still one page, still no per-bear paths or anchors, and the
 * site returns HTTP 200 with the same shell for any path you invent under
 * /meet-the-bears/, so a per-bear deep link would look real and go nowhere.
 * If that ever changes, override `profileUrl` per bear.
 */
export const EXPLORE_MEET_THE_BEARS = 'https://explore.org/meet-the-bears'

export const BEARS = [
  /* ---- Bear families ---------------------------------------------------- */
  {
    id: '132',
    number: '132',
    name: null,
    title: 'Chevron Forehead, Three Cubs',
    bio: "Large, grizzled, and wearing an inverted V on her forehead like a rank insignia. First identified in 2009, now one of the most experienced mothers on the river -- and she proved it in July, when a cub wandered off alone for days and she found him again. Fourth known litter, first Fat Bear Week. Believed to be 806's mother, which makes this bracket awkward.",
    color: '#8B5E3C',
    accent: '#C08F63',
    photoUrl: '/bears/132.jpg',
    photoFocus: null,
    cardUrl: '/bears/132-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 1,
    verified: true,
  },
  {
    id: '284',
    number: '284',
    name: 'Electra',
    title: 'Fourth-Generation Chonk',
    bio: "Born 2008, raised on this river by 708 Amelia, who was raised here by 438 Reggie. Bold as a cub, still bold in her late teens, and entirely willing to tell a bear -- or a person -- to back up off her cubs. Prominent shoulder hump, blond-tipped ears, and a family tree with more Brooks River tenure than most rangers.",
    color: '#7A5233',
    accent: '#B98A5E',
    photoUrl: '/bears/284.jpg',
    photoFocus: null,
    cardUrl: '/bears/284-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 16,
    verified: true,
  },
  {
    id: '610',
    number: '610',
    name: null,
    title: 'Small Bear, Large Resume',
    bio: "Turned up alone in 2015 so small the rangers assumed she was a yearling, carrying a healing wound above her hips that she has worn as a scar ever since. Eleven years later she has arrived with her first known litter and kept both cubs alive all summer, which first-time mothers here frequently do not. A small bear with a disproportionately large refusal to lose.",
    color: '#A0714A',
    accent: '#D0A277',
    photoUrl: '/bears/610.jpg',
    photoFocus: null,
    cardUrl: '/bears/610-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 6,
    verified: true,
  },
  {
    id: '806',
    number: '806',
    name: null,
    title: 'Blended Family, Blunt Instincts',
    bio: "Round blond-tipped ears, an early-summer mane, and the strangest household at Brooks River: one spring cub of her own plus Biggie, a 2.5-year-old who left 128 Grazer in the spring and adopted herself into this family. Also, in July, she killed and ate 909's spring cub. Devoted and ferocious are not opposites in a bear. First Fat Bear Week.",
    color: '#946A45',
    accent: '#C99C70',
    photoUrl: '/bears/806.jpg',
    photoFocus: null,
    cardUrl: '/bears/806-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 2,
    verified: true,
  },
  {
    id: '901',
    number: '901',
    name: null,
    title: 'Triangle Ears, Golden Hour',
    bio: "Daughter of 284, first identified as a subadult in 2018, and now impossible to miss anywhere near the river mouth, the campground, or the visitor center. Gets fat faster and more reliably than almost anyone in the field. Lost one of two cubs in June and kept going; the surviving cub is one of the biggest at the river this year.",
    color: '#B4894F',
    accent: '#E0B87C',
    photoUrl: '/bears/901.jpg',
    photoFocus: null,
    cardUrl: '/bears/901-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 15,
    verified: true,
  },

  /* ---- Subadults -------------------------------------------------------- */
  {
    id: '620',
    number: '620',
    name: null,
    title: 'Raised By Committee',
    bio: "Long tail, light brown fur, and an upbringing almost nobody gets: in 2022 her mother 910 and her aunt 909 merged households, so she spent a summer fishing and playing as part of a two-mother co-op, then gained an adopted cousin the next year. On her own since spring 2025 and on the cusp of adulthood, with a Rolodex of relatives who fish the same water.",
    color: '#C79A5E',
    accent: '#E8C48E',
    photoUrl: '/bears/620.jpg',
    photoFocus: null,
    cardUrl: '/bears/620-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 5,
    verified: true,
  },
  {
    id: '694',
    number: '694',
    name: null,
    title: 'Youngest Bear In The Field',
    bio: "Born 2022, independent since 2025, round ears set high, and a faint natal collar still visible at his neck. Has worked out that the falls are where the salmon are but is still far too small to hold a spot there, so he works the riffles below. Maximum socializer -- though he has been known to cut a play session short because a specific salmon caught his eye.",
    color: '#8E6A4A',
    accent: '#BE9970',
    photoUrl: '/bears/694.jpg',
    photoFocus: null,
    cardUrl: '/bears/694-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 12,
    verified: true,
  },

  /* ---- Single adult females --------------------------------------------- */
  {
    id: '131',
    number: '131',
    name: null,
    title: 'Career Best Silhouette',
    bio: "Born 2018, independent since 2020, identifiable by blond ears, dark eye rings, and a short muzzle. Did all the normal subadult things -- explored, found playmates, got good at fishing -- and has gotten visibly larger every year since. This September she is proportionally the fattest she has ever been, which is both a compliment and possibly a pregnancy forecast.",
    color: '#BE9A63',
    accent: '#E5C694',
    photoUrl: '/bears/131.jpg',
    photoFocus: null,
    cardUrl: '/bears/131-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 4,
    verified: true,
  },
  {
    id: '428-studious',
    number: '428',
    name: 'Studious',
    title: 'Legacy Admission, Earned Grades',
    bio: "Daughter of two-time champion 128 Grazer, born 2020, independent since 2023. Got her nickname from bearcam viewers for the intense concentration she showed as a cub fishing the lip of Brooks Falls beside her mother -- a spot most young bears are simply shoved out of. The apprenticeship is over and she still fishes the lip whenever there is room for her.",
    color: '#C9A46B',
    accent: '#EBD1A0',
    photoUrl: '/bears/428-studious.jpg',
    photoFocus: null,
    cardUrl: '/bears/428-studious-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 14,
    verified: true,
  },
  {
    id: '909',
    number: '909',
    name: null,
    title: 'Resilience, Measured In Fat',
    bio: "Born 2018, daughter of former champion 409 Beadnose, sister to 910. Arrived in June with two spring cubs; one vanished before the salmon did, and the other was killed by 806 in late July while 909 fished the river mouth. She spent the rest of the summer fishing with real determination anyway, and it shows -- wide-set blond ears above a genuinely enormous amount of stored fat.",
    color: '#9C7B52',
    accent: '#CBA87A',
    photoUrl: '/bears/909.jpg',
    photoFocus: null,
    cardUrl: '/bears/909-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 3,
    verified: true,
  },
  {
    id: '910',
    number: '910',
    name: null,
    title: 'The Head-Lift Lady',
    bio: "Born 2018, daughter of former champion 409 Beadnose, sister to 909, and the other half of the 2022 two-family co-op. Adopted her niece 609 alongside her own cub 620, then separated from the lot in spring 2025 and has been fishing purely for herself ever since. Recognizable on the lip of the falls by a peculiar repeated head lift she does nowhere else on the river.",
    color: '#6F5039',
    accent: '#A67F5D',
    photoUrl: '/bears/910.jpg',
    photoFocus: null,
    cardUrl: '/bears/910-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 13,
    verified: true,
  },

  /* ---- Adult males ------------------------------------------------------ */
  {
    id: '32-chunk',
    number: '32',
    name: 'Chunk',
    title: 'Defending Champion',
    bio: "Identified in 2007 as a 2.5-year-old who already looked chunky, and he has spent nineteen years growing into the name. Broke his jaw in a fight in June 2025 -- a canine still protrudes from it -- and won the whole thing anyway. Skipped most of this summer at Brooks River entirely, then reappeared in September with a belly hanging low enough to answer any question about where he had been.",
    color: '#5F4632',
    accent: '#967050',
    photoUrl: '/bears/32-chunk.jpg',
    photoFocus: null,
    cardUrl: '/bears/32-chunk-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 7,
    verified: true,
  },
  {
    id: '89-backpack',
    number: '89',
    name: 'Backpack',
    title: 'Quiet Strength Enjoyer',
    bio: "Son of former champion Holly, brought to the river in 2006, and named for riding on his mother's back while she swam. Came back in 2007 with a leg so badly hurt that people openly doubted he would make it; he healed and separated from her in 2008. Remarkably few scars for a male his size, because he gets the good fishing spots without picking fights about it.",
    color: '#A47B52',
    accent: '#D4AC81',
    photoUrl: '/bears/89-backpack.jpg',
    photoFocus: null,
    cardUrl: '/bears/89-backpack-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 11,
    verified: true,
  },
  {
    id: '151-walker',
    number: '151',
    name: 'Walker',
    title: 'Pear-Shaped And Newly Grumpy',
    bio: "Dark brown, long muzzle, big round ears, and a body shape best described as pear. Spent his youth as the river's most enthusiastic instigator of play; in 2026 he would rather challenge you than play with you. Size and experience still win him most of those arguments, but 164 Bucky and 903 Gully are both coming for his spot and one of them already has it.",
    color: '#4E3A2A',
    accent: '#836249',
    photoUrl: '/bears/151-walker.jpg',
    photoFocus: null,
    cardUrl: '/bears/151-walker-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 8,
    verified: true,
  },
  {
    id: '164-bucky',
    number: '164',
    name: 'Bucky',
    title: 'Inventor Of A Fishing Spot',
    bio: "Independent since 2019 and, at an estimated nine years old, not close to his peak -- males here top out between twelve and twenty. Discovered that standing at the edge of the deepest plunge pool right under the cascade lets him take salmon welling up, jumping past, and falling from above, a spot no other bear has ever bothered to work consistently. Grew fast on it, and got pushy about it.",
    color: '#8A6338',
    accent: '#C09263',
    photoUrl: '/bears/164-bucky.jpg',
    photoFocus: null,
    cardUrl: '/bears/164-bucky-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 10,
    verified: true,
  },
  {
    id: '903-gully',
    number: '903',
    name: 'Gully',
    title: 'The Bird Guy',
    bio: "Born 2016, believed to be 128 Grazer's son, which meant an infancy spent at the busiest and most dangerous fishing spots on the river. In 2020, during one of the largest salmon runs ever recorded here, he decided that gulls were also food and began charging flocks to catch them. He no longer needs to. He now outranks bears years older than him, 151 Walker included.",
    color: '#6B563F',
    accent: '#A18A6D',
    photoUrl: '/bears/903-gully.jpg',
    photoFocus: null,
    cardUrl: '/bears/903-gully-card.jpg',
    profileUrl: EXPLORE_MEET_THE_BEARS,
    seed: 9,
    verified: true,
  },
]

/** Human-facing label: "128 Grazer" or just "856". */
export function displayName(bear) {
  return bear.name ? `${bear.number} ${bear.name}` : bear.number
}
