from PIL import Image, ImageDraw

def create_circular_logo():
    # Load original uploaded image
    img_path = r"C:\Users\dines\.gemini\antigravity\brain\c381f0ed-e78b-47b0-ac6e-212ccb7b15c2\media__1779910654650.png"
    img = Image.open(img_path).convert("RGBA")
    width, height = img.size
    
    # 1. Paint over the text at the bottom with the dark blue background color
    bg_color = img.getpixel((10, height // 2)) # sample from the middle left to get the dark blue
    
    draw = ImageDraw.Draw(img)
    text_y_start = int(height * 0.81)
    # Paint the bottom part
    draw.rectangle([0, text_y_start, width, height], fill=bg_color)
    
    # 2. Create a circular mask
    mask = Image.new("L", (width, height), 0)
    mask_draw = ImageDraw.Draw(mask)
    # The circle touches the edges of the image
    mask_draw.ellipse((0, 0, width, height), fill=255)
    
    # 3. Apply the mask to make corners transparent
    # Create a transparent image
    final_img = Image.new("RGBA", (width, height), (0,0,0,0))
    final_img.paste(img, (0,0), mask=mask)
    
    # Save the final image
    out_path = r"C:\Users\dines\Downloads\project 5\public\logo.png"
    final_img.save(out_path)
    print("Logo successfully cropped to a perfect circle and saved!")

if __name__ == "__main__":
    create_circular_logo()
