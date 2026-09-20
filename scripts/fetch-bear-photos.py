#!/usr/bin/env python3
"""
Pull the contestant photos off explore.org's "Meet the Bears" page and crop them
into web/public/bears/: a square portrait per bear for the avatars, plus the
full before/after card for the TV's between-rounds slideshow.

explore.org publishes one wide before/after card per bear (a June photo beside a
September photo, with a name badge across the bottom). Avatars want a single
square portrait, so this keeps the September half -- the fat one, which is the
whole point -- and trims the badge. The untouched card is kept as
<id>-card.jpg, because June-next-to-September is the best thing on the page.

Usage:
    python3 scripts/fetch-bear-photos.py

Each year the filenames change. Open https://explore.org/meet-the-bears, copy
the media.explore.org image URLs out of the page source, and update PHOTOS
below -- the keys must match the bear `id` values in server/src/bears.js.

Requires Pillow (pip install Pillow). The images it writes are committed, so
the Vercel build has them -- see web/public/bears/README.md for why.
"""

import pathlib
import sys
import urllib.request

# 2026 field, read off https://explore.org/meet-the-bears on 2026-09-19
# (the day after the bracket reveal). Keys match the bear `id` values in
# server/src/bears.js.
PHOTOS = {
    # Bear families
    "132": "https://media.explore.org/documents/132-1789686411010.png",
    "284": "https://media.explore.org/documents/284-1789686614929.png",
    "610": "https://media.explore.org/documents/610-1789686723717.png",
    "806": "https://media.explore.org/documents/806-1789686829763.png",
    "901": "https://media.explore.org/documents/901-1789686889751.png",
    # Subadults
    "620": "https://media.explore.org/documents/620-1789687020588.png",
    "694": "https://media.explore.org/documents/694-1789687138773.png",
    # Single adult females
    "131": "https://media.explore.org/documents/131-1789687240406.png",
    "428-studious": "https://media.explore.org/documents/428-1789687557287.png",
    "909": "https://media.explore.org/documents/909-1789687619265.png",
    "910": "https://media.explore.org/documents/910-1789687672263.png",
    # Adult males
    "32-chunk": "https://media.explore.org/documents/32-fixed-1789767001431.png",
    "89-backpack": "https://media.explore.org/documents/89-1789765144853.png",
    "151-walker": "https://media.explore.org/documents/151-1789687872006.png",
    "164-bucky": "https://media.explore.org/documents/164-1789687958898.png",
    "903-gully": "https://media.explore.org/documents/903-1789688011223.png",
}

# Fractions of the card, not pixels: the 2026 cards are all ~2800x1160 but not
# exactly, and next year's template may be a different size and layout again.
# Measured against the 2026 template, whose September panel sits inside a
# pixel-art frame with a name badge overlapping its bottom edge -- the bottom
# bound stops short of the badge.
PANEL = (0.567, 0.20, 0.957, 0.785)  # left, top, right, bottom of the September half
SIZE = 512

# The panel is wider than it is tall, so the square portrait drops some of its
# width. Where the bear's head is not near the middle, name a horizontal centre
# as a fraction of the panel (0 = left edge, 1 = right edge) to keep the face.
FOCUS = {
    # Bears looking right; their heads sit near the right edge of the panel.
    "284": 0.70,
    "610": 0.70,
    "806": 0.70,
    "620": 0.70,
    "694": 0.70,
    "428-studious": 0.70,
    "909": 0.70,
    "32-chunk": 0.70,
    "89-backpack": 0.70,
    "151-walker": 0.70,
    # Bears looking left.
    "132": 0.35,
    "901": 0.32,
    "131": 0.30,
    "164-bucky": 0.30,
    "903-gully": 0.30,
    # 910 faces the camera from the middle and needs no nudge.
}

OUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "web" / "public" / "bears"


def main() -> int:
    try:
        from PIL import Image
    except ImportError:
        print("Pillow is required: pip install Pillow", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for bear_id, url in PHOTOS.items():
        card_path = OUT_DIR / f".{bear_id}.card.png"
        try:
            urllib.request.urlretrieve(url, card_path)
            card = Image.open(card_path).convert("RGB")
        except Exception as err:  # noqa: BLE001 -- one bad URL should not stop the rest
            print(f"  {bear_id}: FAILED ({err})", file=sys.stderr)
            continue

        width, height = card.size
        left, top, right, bottom = PANEL
        panel = card.crop(
            (int(width * left), int(height * top), int(width * right), int(height * bottom))
        )

        panel_w, panel_h = panel.size
        side = min(panel_w, panel_h)
        centre = FOCUS.get(bear_id, 0.5) * panel_w
        offset = max(0, min(panel_w - side, int(centre - side / 2)))
        square = panel.crop((offset, 0, offset + side, side)).resize(
            (SIZE, SIZE), Image.LANCZOS
        )
        square.save(OUT_DIR / f"{bear_id}.jpg", quality=90)
        card.save(OUT_DIR / f"{bear_id}-card.jpg", quality=88)
        card_path.unlink(missing_ok=True)
        print(f"  {bear_id}: {card.size} -> {SIZE}x{SIZE} portrait + card")

    print(f"\nWrote {len(PHOTOS)} photos to {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
