from PIL import Image, ImageDraw

def remove_text_from_logo():
    # The image the user uploaded containing the text
    img_path = r"C:\Users\dines\.gemini\antigravity\brain\c381f0ed-e78b-47b0-ac6e-212ccb7b15c2\media__1779910654650.png"
    
    img = Image.open(img_path)
    width, height = img.size
    
    # We will just paint over the bottom area where the text is.
    # The background is a solid dark blue. We can sample a pixel from the bottom left edge.
    bg_color = img.getpixel((10, height - 10))
    
    draw = ImageDraw.Draw(img)
    
    # The text is roughly in the bottom 20% of the image, inside the circle
    # We will draw a rectangle covering the text area
    # Or even better, we can crop the image into a perfect circle, but the text is inside the circle.
    # Let's paint a block over the bottom 18% of the image (excluding the borders if needed).
    
    # A safer way to keep it perfectly clean: The text is below the main graphic.
    text_y_start = int(height * 0.81)
    
    draw.rectangle([0, text_y_start, width, height], fill=bg_color)
    
    out_path = r"C:\Users\dines\Downloads\project 5\public\logo.png"
    img.save(out_path)
    print(f"Saved cleaned logo to {out_path}")

if __name__ == "__main__":
    remove_text_from_logo()
