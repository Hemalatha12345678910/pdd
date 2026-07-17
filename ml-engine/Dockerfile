FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and AI libraries
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all the AI models and server code
COPY . .

# Hugging Face Spaces requires the app to listen on port 7860
EXPOSE 7860

# Start the Flask app using Gunicorn on the port specified by the environment variable
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-7860} --timeout 120 server:app"]
