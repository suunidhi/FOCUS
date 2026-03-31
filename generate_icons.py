# generate_icons.py  — run once to create PNG icons from the base image
# Requires Pillow: pip install Pillow

from PIL import Image
import os

SRC = os.path.join(os.path.dirname(__file__), "icons", "icon_source.png")
SIZES = [16, 32, 48, 128]

def main():
    # If source doesn't exist, create a simple colored square
    if not os.path.exists(SRC):
        print("Source image not found, creating default icons...")
        create_default_icons()
        return

    img = Image.open(SRC).convert("RGBA")
    for size in SIZES:
        out = img.resize((size, size), Image.LANCZOS)
        out_path = os.path.join(os.path.dirname(__file__), "icons", f"icon{size}.png")
        out.save(out_path, "PNG")
        print(f"✅  Created {out_path}")

def create_default_icons():
    """Create simple programmatic icons using Pillow."""
    from PIL import ImageDraw, ImageFont
    import math

    for size in SIZES:
        img = Image.new("RGBA", (size, size), (10, 10, 18, 255))
        draw = ImageDraw.Draw(img)

        # Outer glow circle
        margin = size * 0.08
        draw.ellipse(
            [margin, margin, size - margin, size - margin],
            fill=(0, 200, 150, 30),
            outline=(0, 200, 150, 180),
            width=max(1, size // 20)
        )

        # Inner brain-ish shape: just a brain emoji or circle with dot
        cx, cy = size / 2, size / 2
        r = size * 0.2
        draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(0, 200, 150, 255)
        )

        out_path = os.path.join(os.path.dirname(__file__), "icons", f"icon{size}.png")
        img.save(out_path, "PNG")
        print(f"✅  Created {out_path}")

if __name__ == "__main__":
    os.makedirs(os.path.join(os.path.dirname(__file__), "icons"), exist_ok=True)
    main()
