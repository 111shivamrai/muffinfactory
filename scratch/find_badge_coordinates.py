import sys
import tkinter as tk

def main():
    try:
        root = tk.Tk()
        root.withdraw() # Hide main window
        
        img_path = '/Users/shivamrai/Downloads/antigravity/silly-hubble/public/factory_floor_cartoon.png'
        photo = tk.PhotoImage(file=img_path)
        width = photo.width()
        height = photo.height()
        print(f"Loaded image size: {width}x{height}")
        
        # We want to find the horizontal coordinates where there are green pixels.
        # Let's define "green" as: g > r + 30 and g > b + 30 (or similar).
        # Let's scan pixels and print coordinates of green areas.
        green_pixels = []
        for y in range(height):
            for x in range(width):
                # getpixel returns a string of r g b values on older tkinter, or tuple on newer.
                px = photo.get(x, y)
                if isinstance(px, str):
                    # parse space-separated string
                    r, g, b = map(int, px.split())
                else:
                    r, g, b = px[:3]
                
                # Check for green color: #4caf50 is roughly (76, 175, 80)
                # Let's find green color where green is dominant and not too dark/light
                if g > 120 and g > r + 40 and g > b + 40:
                    green_pixels.append((x, y, r, g, b))
                    
        print(f"Found {len(green_pixels)} green pixels.")
        
        # Let's group them by x-coordinate to find the centers of the 4 badges
        if len(green_pixels) > 0:
            # Simple clustering: group pixels that are within 50px of each other horizontally
            groups = []
            for px in sorted(green_pixels, key=lambda p: p[0]):
                x, y = px[0], px[1]
                added = False
                for g in groups:
                    # if close to group average x
                    avg_x = sum(p[0] for p in g) / len(g)
                    if abs(x - avg_x) < 60:
                        g.append((x, y))
                        added = True
                        break
                if not added:
                    groups.append([(x, y)])
                    
            print(f"Found {len(groups)} distinct green areas:")
            for idx, g in enumerate(groups):
                min_x = min(p[0] for p in g)
                max_x = max(p[0] for p in g)
                min_y = min(p[1] for p in g)
                max_y = max(p[1] for p in g)
                center_x = (min_x + max_x) / 2
                center_y = (min_y + max_y) / 2
                pct_x = (center_x / width) * 100
                pct_y = (center_y / height) * 100
                print(f"Area {idx+1}: x={center_x:.1f} ({pct_x:.1f}%), y={center_y:.1f} ({pct_y:.1f}%) [Bounds: x({min_x}-{max_x}), y({min_y}-{max_y})]")
        
    except Exception as e:
        print("Error analyzing image:", e)

if __name__ == '__main__':
    main()
