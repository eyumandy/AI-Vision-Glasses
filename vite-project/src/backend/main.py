from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import threading
import requests
import json

app = Flask(__name__)
CORS(app)

# Global variable to store the latest frame
latest_frame = None
frame_lock = threading.Lock()

# Azure API credentials
subscription_key = "36d060fb27504f098b3c6916f392afb5"
endpoint = "https://visual-ai-cam.cognitiveservices.azure.com/"
vision_base_url = endpoint + "vision/v3.1/analyze"

# Function to call Azure's Computer Vision API
def analyze_image_with_azure(image_data):
    headers = {
        'Ocp-Apim-Subscription-Key': subscription_key,
        'Content-Type': 'application/octet-stream'
    }
    params = {
        'visualFeatures': 'Categories,Description,Color',
    }

    try:
        response = requests.post(vision_base_url, headers=headers, params=params, data=image_data)
        response.raise_for_status()  # Raise exception for HTTP errors

        # Check content-type to ensure the response is JSON
        if 'application/json' in response.headers.get('Content-Type'):
            analysis = response.json()
            print(f"Azure API Response: {json.dumps(analysis, indent=2)}")  # Log full Azure response
            return analysis
        else:
            print(f"Unexpected content-type received: {response.headers.get('Content-Type')}")
            return {'error': 'Unexpected content-type received from Azure'}

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")  # Log HTTP errors
        return {'error': f'HTTP error: {str(http_err)}'}
    except Exception as e:
        print(f"Error calling Azure API: {e}")  # Log general exceptions
        return {'error': f'Error calling Azure API: {str(e)}'}

# Route to receive and store image data
@app.route('/upload', methods=['POST'])
def upload():
    global latest_frame
    if request.method == 'POST':
        try:
            with frame_lock:
                latest_frame = request.data
            print("Image uploaded successfully")  # Log image upload success
            return 'Image received', 200
        except Exception as e:
            print(f"Error during image upload: {e}")  # Log errors during upload
            return jsonify({'error': f'Error during upload: {str(e)}'}), 500
    else:
        return 'Invalid request method', 400

# Route to serve video feed
@app.route('/video_feed')
def video_feed():
    def generate():
        while True:
            if latest_frame:
                with frame_lock:
                    frame = latest_frame
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

# Route to return the latest snapshot
@app.route('/snapshot')
def snapshot():
    if latest_frame:
        return Response(latest_frame, mimetype='image/jpeg')
    else:
        print("No image available for snapshot")  # Log no image found
        return 'No image available', 404

# Route to analyze the latest uploaded image
@app.route('/analyze', methods=['POST'])
def analyze():
    if latest_frame:
        try:
            print("Analyzing the latest image...")  # Log analysis start
            analysis = analyze_image_with_azure(latest_frame)
            if 'error' in analysis:
                print(f"Error during image analysis: {analysis['error']}")  # Log Azure analysis errors
            else:
                print("Image analysis successful")  # Log success
            return jsonify(analysis)
        except Exception as e:
            print(f"Error during analysis: {e}")  # Log general analysis errors
            return jsonify({'error': f'Error during analysis: {str(e)}'}), 500
    else:
        print("No image available for analysis")  # Log no image available for analysis
        return jsonify({'error': 'No image available for analysis'}), 404

if __name__ == '__main__':
    # Run the app on all available network interfaces (0.0.0.0) and port 5000
    app.run(host='0.0.0.0', port=5000)
