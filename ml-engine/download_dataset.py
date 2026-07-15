from roboflow import Roboflow
import os
import sys

def download_dental_data():
    print("Initializing ProphyDent Dataset Downloader...")
    print("We are going to download an open-source Dental Caries dataset from Roboflow Universe.\n")
    
    if len(sys.argv) > 1:
        api_key = sys.argv[1]
    else:
        api_key = input("Enter your Roboflow API Key: ").strip()
    
    if not api_key:
        print("Error: You must provide an API key to download the dataset.")
        return

    try:
        rf = Roboflow(api_key=api_key)
        # Pointing to a popular open-source dental caries dataset on Roboflow Universe
        # Format is yoloV8 for seamless integration with our train.py script
        project = rf.workspace("dental-caries-ywg6c").project("dental-caries-k6zz1")
        version = project.version(1)
        
        print("Downloading dataset to /dataset folder...")
        dataset = version.download("yolov8", location=os.path.join(os.getcwd(), "dataset"))
        
        print("\nDataset successfully downloaded!")
        print("You can now run 'python train.py' to begin training your model.")
        
    except Exception as e:
        print(f"\nError downloading dataset: {e}")
        print("Please ensure your API key is correct and you have internet access.")

if __name__ == "__main__":
    download_dental_data()
