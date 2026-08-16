#!/usr/bin/env python3
"""Key generated prop JPEGs to transparent PNGs using sampled plate color."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


def sample_plate(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    patches = [
        rgb[0:16, 0:16],
        rgb[0:16, w - 16 : w],
        rgb[h - 16 : h, 0:16],
        rgb[h - 16 : h, w - 16 : w],
    ]
    return np.mean(np.concatenate([p.reshape(-1, 3) for p in patches], axis=0), axis=0)


def chroma(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGBA")
    arr = np.asarray(im).astype(np.float32)
    rgb = arr[:, :, :3]
    plate = sample_plate(rgb)
    dist = np.sqrt(((rgb - plate) ** 2).sum(axis=2))
    # Soft edge around the sampled plate
    alpha = np.clip((dist - 28.0) * (255.0 / 36.0), 0, 255)
    # Also drop classic magenta / hot pink plates
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    hot_pink = (r > 185) & (b > 120) & (g < 90) & (b > g + 50)
    alpha = np.where(hot_pink, np.minimum(alpha, 8.0), alpha)

    out = arr.copy()
    out[:, :, 3] = alpha
    rgba = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")

    bbox = rgba.getbbox()
    if not bbox:
        raise SystemExit(f"empty after chroma: {src}")
    pad = 6
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(rgba.width, x1 + pad)
    y1 = min(rgba.height, y1 + pad)
    rgba = rgba.crop((x0, y0, x1, y1))

    dest.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(dest)
    print(f"{src.name} plate={tuple(int(c) for c in plate)} -> {dest.name} {rgba.size} alpha={rgba.getextrema()[3]}")


if __name__ == "__main__":
    root = Path("/workspace/artifacts/imagine_images")
    jobs = [
        (root / "d9eb2d39-bae7-429e-a26f-35bfe8bb64ca.jpg", Path("/workspace/public/game/sprites/platform-moss.png")),
        (root / "c7209e22-6d24-4ff6-b243-8e83385f65ff.jpg", Path("/workspace/public/game/sprites/platform-raft.png")),
        (root / "07147859-ea71-497f-898f-d877797578d5.jpg", Path("/workspace/public/game/sprites/spikes.png")),
        (root / "9c242f56-4a3f-40c8-bffd-4d1c5d8e0575.jpg", Path("/workspace/public/game/sprites/platform-ground.png")),
    ]
    for src, dest in jobs:
        chroma(src, dest)
