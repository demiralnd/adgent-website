#!/usr/bin/env python3
"""Regenerate responsive blog WebPs after rendering OG PNGs.

    python3 website-v2/assets/og/_thumbnails.py

Requires Pillow. Source: _cards.json article entries and their rendered PNGs.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
WIDTHS = (320, 640, 1200)


def main():
    cards = json.loads((ROOT / "_cards.json").read_text())
    destination = ROOT.parent / "blog"
    destination.mkdir(exist_ok=True)
    for slug, card in cards.items():
        if card["kind"] != "article":
            continue
        with Image.open(ROOT / f"{slug}.png") as source:
            image = source.convert("RGB")
            for width in WIDTHS:
                height = round(image.height * width / image.width)
                image.resize((width, height), Image.Resampling.LANCZOS).save(
                    destination / f"{slug}-{width}.webp",
                    "WEBP", quality=82, method=6,
                )


if __name__ == "__main__":
    main()
