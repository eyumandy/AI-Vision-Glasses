import requests
import json
from flask import Flask, request, jsonify

# Flask app for chatbot
app = Flask(__name__)

# Azure OpenAI credentials and endpoint
subscription_key = "a9b7d8df1efa453fb8fedd8a2cfe8a08"
endpoint = "https://visual-ai-cam-chatbot.openai.azure.com/"
deployment_name = "gpt-35-turbo"

# Function to make a call to the Azure OpenAI API
def generate_text(prompt):
    url = f"{endpoint}openai/deployments/{deployment_name}/completions?api-version=2022-12-01"
    
    headers = {
        "Content-Type": "application/json",
        "api-key": subscription_key,
    }
    
    data = {
        "prompt": prompt,
        "max_tokens": 200,  # Increase token limit to allow for larger responses
        "temperature": 0.7,  # Adjust temperature to balance creativity
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        print("OpenAI full response:", json.dumps(result, indent=2))  # Log the full response for debugging
        return result['choices'][0]['text'] if result['choices'] else None
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return None
    except Exception as err:
        print(f"Other error occurred: {err}")
        return None

# Function to generate a descriptive response based on image analysis data
def generate_response_from_analysis(analysis_data):
    caption = analysis_data.get("caption", "No caption provided")
    tags = analysis_data.get("tags", [])
    ocr_text = analysis_data.get("ocr_text", "No text detected")
    
    # Construct a prompt based on image analysis
    prompt = f"Here is the result of the image analysis. Caption: {caption}. Tags: {', '.join(tags)}. Text detected: {ocr_text}. Provide a summary or a creative description."
    
    # Generate a response from OpenAI
    response = generate_text(prompt)
    return response

# Flask route to accept image analysis results and generate text
# Flask route to accept image analysis results and generate text
@app.route('/generate_text', methods=['POST'])
def generate_text_route():
    analysis_data = request.json
    if not analysis_data:
        return jsonify({"error": "No analysis data provided"}), 400

    # Generate a response based on the analysis data
    response_text = generate_response_from_analysis(analysis_data)
    if response_text:
        print(f"Generated response: {response_text}")  # Debugging
        return jsonify({"generated_text": response_text})  # Send correct key to frontend
    else:
        return jsonify({"error": "Failed to generate text"}), 500


# Run Flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)


