# ProphyDent AI Backend Engine 🦷

Welcome to the backend repository for the **ProphyDent AI** mobile application. 

This repository contains the intelligent core of the ProphyDent platform. It utilizes advanced computer vision (YOLOv8) to detect dental cavities in clinical photographs and leverages Large Language Models (Google Gemini) to generate professional, diagnostic-level clinical reports and patient-friendly summaries.

## 🚀 Key Features

* **Computer Vision Diagnostics**: Simultaneously runs 5 customized YOLOv8 models to aggressively detect and map dental cavities and caries.
* **Generative AI Reports**: Integrates with Google's `gemini-2.5-flash` multimodal AI to generate intelligent clinical treatment plans based on visual data.
* **Dual Reporting Modes**: Automatically tailors the generated medical reports based on whether the intended audience is a **Doctor** (professional clinical terminology) or a **Patient** (friendly, accessible language).
* **Native Android Support**: Exposes a seamless REST API (Flask) specifically configured to communicate securely with native Capacitor Android applications.

## 🛠️ Technology Stack

* **Framework**: Python Flask
* **Computer Vision**: Ultralytics YOLOv8, PyTorch, OpenCV
* **Generative AI**: Google Generative AI SDK (Gemini)
* **Image Processing**: Pillow, Base64
* **Production Deployment**: Gunicorn

## 📦 Deployment on Render

This engine is pre-configured to be deployed seamlessly on **Render.com** as a Web Service.

### Requirements:
To deploy this successfully, ensure you have the following Environment Variables set up in your Render dashboard:

| Key | Value | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `AIzaSy...` | Your Google AI Studio API Key for report generation. |

### Render Build & Start Commands:
* **Build Command**: `pip install -r requirements.txt`
* **Start Command**: `gunicorn server:app`

---
*Built for the future of precision dental care.*
