import os
from ultralytics import YOLO

def main():
    print("🦷 Starting ProphyDent AI Training Pipeline...")
    
    # 1. Load a pre-trained base model
    # YOLOv8n is the 'nano' version, great for fast training and prototyping.
    # For production accuracy, you might upgrade to 'yolov8m.pt' or 'yolov8l.pt'.
    model = YOLO('yolov8n.pt') 

    # 2. Check if dataset configuration exists (Roboflow creates data.yaml)
    config_path = 'dataset/data.yaml'
    if not os.path.exists(config_path):
        print(f"❌ Error: Could not find {config_path}")
        return

    # 3. Train the model
    # We pass the data configuration, set epochs (how many times it sees the data),
    # and imgsz (image resolution for the neural network).
    print("🚀 Initiating training loop...")
    results = model.train(
        data=config_path,
        epochs=50,       # Start with 50 epochs. Increase to 100-300 for final production model.
        imgsz=640,       # Standard resolution for YOLO
        batch=16,        # Number of images processed at once (lower if out of memory)
        name='prophydent_model_v1', # Folder name where results are saved
        device='cpu'     # Change to '0' to use NVIDIA GPU if available for 10x faster training
    )

    print("✅ Training complete! The best model weights are saved in runs/detect/prophydent_model_v1/weights/best.pt")

if __name__ == '__main__':
    main()
