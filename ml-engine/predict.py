import sys
from ultralytics import YOLO
import cv2

def run_inference(image_path):
    # Path to the model you just trained. 
    # If you haven't trained yet, it will fail to load.
    model_path = 'runs/detect/prophydent_model_v1/weights/best.pt'
    
    try:
        # Load the custom trained ProphyDent model
        model = YOLO(model_path)
    except Exception as e:
        print(f"❌ Could not load model at {model_path}. Did you run train.py first?")
        return

    print(f"🔍 Analyzing scan: {image_path}...")
    
    # Run prediction on the image
    results = model.predict(source=image_path, conf=0.25, save=True)
    
    # The results object contains bounding boxes, confidence scores, and class IDs
    for r in results:
        boxes = r.boxes
        for box in boxes:
            # Extract data
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            class_name = model.names[cls_id]
            
            print(f"Detected: {class_name} with {conf*100:.1f}% confidence")
            
    print("✅ Inference complete. Check the 'runs/detect/predict' folder for the visual output.")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python predict.py path/to/dental_xray.jpg")
    else:
        run_inference(sys.argv[1])
