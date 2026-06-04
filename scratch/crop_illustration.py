import os
from PIL import Image

def main():
    mockup_path = '/Users/shivamrai/.gemini/antigravity/brain/bebd7e78-5226-4426-bcf5-36558a9d0a39/media__1780299915282.png'
    if not os.path.exists(mockup_path):
        print(f"Error: {mockup_path} does not exist.")
        return

    img = Image.open(mockup_path)
    width, height = img.size
    print(f"Mockup size: {width}x{height}")

    # Let's find the card coordinates for the FACTORY FLOOR illustration
    # In the mockup screenshot (1024x665), let's look for the dark brown border of the illustration box.
    # The border color is typically #4a2c11 (74, 44, 17).
    # Let's scan pixels to find the bounding box of the cartoon.
    # We know the right column is roughly from x=320 to x=1010.
    # The factory floor illustration is in the upper part of the right column, below the blue card header.
    # Let's search in x from 320 to 1010, and y from 70 to 500.
    
    border_color = (74, 44, 17)
    
    # We want to find the border box of the canvas.
    # Let's look for horizontal lines of border_color.
    border_pixels = []
    for y in range(70, 500):
        row_hits = 0
        for x in range(320, 1000):
            r, g, b = img.getpixel((x, y))[:3]
            # Allow slight tolerance
            if abs(r - 74) <= 5 and abs(g - 44) <= 5 and abs(b - 17) <= 5:
                row_hits += 1
        if row_hits > 300: # Found a horizontal line!
            border_pixels.append(y)

    print("Found horizontal border lines at y-coordinates:", border_pixels)
    
    # Let's find the vertical lines
    border_cols = []
    for x in range(320, 1000):
        col_hits = 0
        for y in range(100, 450):
            r, g, b = img.getpixel((x, y))[:3]
            if abs(r - 74) <= 5 and abs(g - 44) <= 5 and abs(b - 17) <= 5:
                col_hits += 1
        if col_hits > 150: # Found a vertical line!
            border_cols.append(x)
            
    print("Found vertical border lines at x-coordinates:", border_cols)
    
    if len(border_pixels) >= 2 and len(border_cols) >= 2:
        top_y = min(border_pixels)
        bottom_y = max(border_pixels)
        left_x = min(border_cols)
        right_x = max(border_cols)
        
        print(f"Detected bounding box: x1={left_x}, y1={top_y}, x2={right_x}, y2={bottom_y}")
        print(f"Dimensions: {right_x - left_x} x {bottom_y - top_y}")
        
        # Crop the image (exclude the 3px border itself to get clean illustration)
        cropped_img = img.crop((left_x + 3, top_y + 3, right_x - 3, bottom_y - 3))
        
        # Save to public directory
        output_path = '/Users/shivamrai/Downloads/antigravity/silly-hubble/public/factory_floor_cartoon.png'
        cropped_img.save(output_path)
        print(f"Successfully saved cropped illustration to {output_path}")
        print(f"New image size: {cropped_img.size}")
    else:
        print("Could not reliably detect bounding box automatically.")

if __name__ == '__main__':
    main()
