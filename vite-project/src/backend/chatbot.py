import requests
import json
import time
from flask import Flask, request, jsonify
from flask_cors import CORS

# Flask app for chatbot
app = Flask(__name__)
CORS(app)

# Azure OpenAI credentials and endpoint
subscription_key = "a9b7d8df1efa453fb8fedd8a2cfe8a08"
endpoint = "https://visual-ai-cam-chatbot.openai.azure.com/"
deployment_name = "gpt-35-turbo"

# Function to make a call to the Azure OpenAI API with refined prompt and proper retry logic
def generate_text(prompt, retries=5, backoff_factor=5):
    url = f"{endpoint}openai/deployments/{deployment_name}/completions?api-version=2022-12-01"
    
    headers = {
        "Content-Type": "application/json",
        "api-key": subscription_key,
    }
    
    data = {
        "prompt": prompt,
        "max_tokens": 500,  # Keep the responses concise
        "temperature": 0.7,  # Lower temperature for more focused responses
    }
    
    for attempt in range(retries):
        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            result = response.json()
            print("OpenAI full response:", json.dumps(result, indent=2))  # Log full response for debugging
            
            # Clean the generated text by removing unwanted tokens like <|im_end|> and unwanted system messages
            generated_text = result['choices'][0]['text'] if result['choices'] else None
            if generated_text:
                cleaned_text = clean_generated_text(generated_text)
                return cleaned_text.strip()  # Return cleaned, trimmed response
            
        except requests.exceptions.HTTPError as http_err:
            if response.status_code == 429:  # Rate limit hit
                wait_time = backoff_factor * (1.5 ** attempt)  # Slower exponential backoff
                print(f"Rate limit hit. Retrying in {wait_time:.2f} seconds...")
                time.sleep(wait_time)
            else:
                print(f"HTTP error occurred: {http_err}")
                return None
        
        except Exception as err:
            print(f"Other error occurred: {err}")
            return None
    
    return "Error: Unable to process request due to rate limits."

# Recursive function to filter unwanted sentences
def filter_sentence_by_words(sentences, words_to_remove):
    if not sentences:
        return ""

    first_sentence = sentences[0]
    if any(word in first_sentence.lower() for word in words_to_remove):
        # If the first sentence contains an unwanted word, skip it
        return filter_sentence_by_words(sentences[1:], words_to_remove)
    else:
        # Otherwise, keep the first sentence and process the rest
        return first_sentence + ". " + filter_sentence_by_words(sentences[1:], words_to_remove)

# Function to clean generated text
def clean_generated_text(text):
    # Split the text into sentences
    sentences = text.split(". ")

    # Define unwanted words, typically system instruction-related
    words_to_remove = ["rude", "critical", "negative", "aggressive", "promoting", "unhelpful", "spamming"]

    # Apply the recursive filter function to remove those sentences
    filtered_text = filter_sentence_by_words(sentences, words_to_remove)

    # Remove unwanted tokens like <|im_end|>
    cleaned_text = filtered_text.replace("<|im_end|>", "").strip()

    return cleaned_text  # Return the cleaned text

# Function to generate a task-oriented response based on image analysis data
def generate_response_from_analysis(analysis_data):
    caption = analysis_data.get("caption", "No caption provided")
    tags = analysis_data.get("tags", [])
    ocr_text = analysis_data.get("ocr_text", "No text detected")

    # Refined task-oriented prompt encouraging problem-solving ideas
    prompt = (
        f"The image analysis shows the following:\n"
        f"- Caption: {caption}\n"
        f"- Tags: {', '.join(tags)}\n"
        f"- Text detected: {ocr_text}\n\n"
        f"Please provide useful, constructive, and concise insights or suggestions about what the image may represent."
    )
    
    # Generate a response from OpenAI
    response = generate_text(prompt)
    
    return response

# Flask route to accept image analysis results and generate text
@app.route('/generate_text', methods=['POST'])
def generate_text_route():
    analysis_data = request.json
    if not analysis_data:
        return jsonify({"error": "No analysis data provided"}), 400

    # Generate a response based on the analysis data
    response_text = generate_response_from_analysis(analysis_data)
    if response_text:
        print(f"Generated response: {response_text}")
        return jsonify({"generated_text": response_text})  # Send correct key to frontend
    else:
        return jsonify({"error": "Failed to generate text"}), 500

# Run Flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
