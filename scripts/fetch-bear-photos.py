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

On reveal day the filenames change. Open https://explore.org/meet-the-bears,
copy the media.explore.org image URLs out of the page source, and update PHOTOS
below -- the keys must match the bear `id` values in server/src/bears.js.

Requires Pillow (pip install Pillow). The images stay out of git on purpose:
they are explore.org's, fine to show on your own TV, not ours to redistribute.
"""

import pathlib
import sys
import urllib.request

# 2025 field, read off https://explore.org/meet-the-bears on 2026-09-16.
PHOTOS = {
    "128-grazer": "https://media.explore.org/documents/128grazer-1758560774361.png",
    "32-chunk": "https://media.explore.org/documents/32chunk-1758560671158.png",
    "856": "https://media.explore.org/documents/856-1758562333630.png",
    "503": "https://media.explore.org/documents/503-1758560839893.png",
    "909": "https://media.explore.org/documents/909-1758562402990.png",
    "910": "https://media.explore.org/documents/910-1758562455268.png",
    "26": "https://media.explore.org/documents/26-1758557305581.png",
    "99": "https://media.explore.org/documents/99-1758560720167.png",
    "602": "https://media.explore.org/documents/602-1758562266438.png",
    "609": "https://media.explore.org/documents/609-1758737454490.png",
    "901": "https://media.explore.org/documents/901-1758562371329.png",
}

# Fractions of the card, not pixels: the cards are all ~991x390 but not exactly,
# and next year's template may be a different size again.
PANEL = (0.545, 0.07, 0.972, 0.76)  # left, top, right, bottom of the September half
SIZE = 512

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
        offset = (panel_w - side) // 2
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
