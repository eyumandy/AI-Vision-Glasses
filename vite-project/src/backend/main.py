import requests
import json
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import threading

app = Flask(__name__)
CORS(app)

# Global variable to store the latest frame
latest_frame = None
frame_lock = threading.Lock()

# Azure API credentials
subscription_key = "36d060fb27504f098b3c6916f392afb5"
vision_base_url = "https://visual-ai-cam.cognitiveservices.azure.com/computervision/imageanalysis:analyze"

# Function to call Azure's Image Analysis 4.0 API with OCR
def analyze_image_with_azure(image_data, features):
    headers = {
        'Ocp-Apim-Subscription-Key': subscription_key,
        'Content-Type': 'application/octet-stream'
    }

    params = {
        'api-version': '2023-02-01-preview',
        'features': ','.join(features),
        'language': 'en',
        'genderNeutralCaption': 'true'
    }

    try:
        # Analyze the image using Azure's Image Analysis 4.0 API
        response = requests.post(
            vision_base_url,
            headers=headers,
            params=params,
            data=image_data
        )
        print(f"Request sent to Azure API: {response.url}")
        print(f"Request headers: {response.request.headers}")
        print(f"Request body size: {len(image_data)} bytes")

        # Check for HTTP errors
        response.raise_for_status()

        # Parse the response
        analysis = response.json()

        # Log the full Azure response
        print(f"Azure Image Analysis API Response: {json.dumps(analysis, indent=2)}")

        # Check for specific error messages in the response
        if 'error' in analysis:
            error_message = analysis['error'].get('message', 'Unknown error')
            print(f"Error in Azure response: {error_message}")
            return {'error': f"Azure API error: {error_message}"}

        # Process and extract relevant details from the response
        processed_data = process_analysis(analysis)
        return processed_data

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        print(f"Response content: {response.content.decode('utf-8')}")
        return {'error': f'HTTP error: {str(http_err)}'}
    except requests.exceptions.RequestException as req_err:
        print(f"Request error occurred: {req_err}")
        return {'error': f'Request error: {str(req_err)}'}
    except json.decoder.JSONDecodeError:
        print("Error decoding JSON response.")
        return {'error': 'Invalid JSON response from Azure.'}
    except Exception as e:
        print(f"Error calling Azure Image Analysis API: {e}")
        return {'error': f'Error calling Azure Image Analysis API: {str(e)}'}

# Helper function to process the results from Azure Image Analysis 4.0 API
def process_analysis(analysis):
    result = {}

    # Extract caption
    caption_result = analysis.get('captionResult', {})
    result['caption'] = caption_result.get('text', "No caption detected")

    # Extract tags
    tags_result = analysis.get('tagsResult', {})
    result['tags'] = [tag['name'] for tag in tags_result.get('values', [])] if tags_result.get('values') else "No tags detected"

    # Extract OCR text from readResult
    read_result = analysis.get('readResult', {})
    detected_text = []
    if 'content' in read_result:
        detected_text.append(read_result['content'])
    result['ocr_text'] = ' '.join(detected_text) if detected_text else "No text detected"

    return result

# Fallback function to analyze with simpler features
def analyze_image_with_fallback(image_data):
    # Try full analysis first, but remove objects detection
    features = ["caption", "tags", "read"]  # Full set of features without objects
    print("Attempting full analysis...")
    result = analyze_image_with_azure(image_data, features)

    if 'error' in result:
        print("Full analysis failed. Attempting simpler analysis...")
        # Fallback to basic analysis if full analysis fails
        basic_features = ["caption", "tags"]  # Simpler set of features
        result = analyze_image_with_azure(image_data, basic_features)

    return result

# Function to send the analysis result to the chatbot API
def send_analysis_to_chatbot(analysis_data):
    chatbot_url = "http://localhost:5001/generate_text"
    
    try:
        response = requests.post(chatbot_url, json=analysis_data)
        response.raise_for_status()  # Check for HTTP errors
        
        chatbot_response = response.json()
        if 'generated_text' in chatbot_response:
            print(f"Chatbot Response: {chatbot_response['generated_text']}")
        else:
            print(f"Chatbot Error: {chatbot_response.get('error', 'Unknown error')}")
    
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
    except Exception as err:
        print(f"Other error occurred: {err}")

# Route to receive and store image data
@app.route('/upload', methods=['POST'])
def upload():
    global latest_frame
    if request.method == 'POST':
        try:
            with frame_lock:
                latest_frame = request.data
            print("Image uploaded successfully")
            return 'Image received', 200
        except Exception as e:
            print(f"Error during image upload: {e}")
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
        print("No image available for snapshot")
        return 'No image available', 404

# Route to analyze the latest uploaded image with fallback
@app.route('/analyze', methods=['POST'])
def analyze():
    if latest_frame:
        try:
            print("Analyzing the latest image with fallback...")
            analysis = analyze_image_with_fallback(latest_frame)  # Send raw image to Azure

            if 'error' in analysis:
                print(f"Error during image analysis: {analysis['error']}")
                return jsonify({'error': analysis['error']}), 500
            else:
                print("Image analysis successful")
                send_analysis_to_chatbot(analysis)  # Send analysis result to chatbot
                return jsonify(analysis)
        except Exception as e:
            print(f"Error during analysis: {e}")
            return jsonify({'error': f'Error during analysis: {str(e)}'}), 500
    else:
        print("No image available for analysis")
        return jsonify({'error': 'No image available for analysis'}), 404

if __name__ == '__main__':
    # Run the app on all available network interfaces (0.0.0.0) and port 5000
    app.run(host='0.0.0.0', port=5000)
