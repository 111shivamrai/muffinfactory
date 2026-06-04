from PIL import Image

img = Image.open('/Users/shivamrai/.gemini/antigravity/brain/bebd7e78-5226-4426-bcf5-36558a9d0a39/media__1780398618560.jpg')
width, height = img.size
print(f"Image size: {width}x{height}")
