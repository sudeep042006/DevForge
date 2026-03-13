from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import joblib
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables (for Gemini API Key)
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini
# Ensure you put GEMINI_API_KEY in AIML/.env
gemini_api_key = os.getenv("GEMINI_API_KEY")
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)
else:
    print("Warning: GEMINI_API_KEY not found in environment!")

# Attempt to load the trained model if the user has added it
MODEL_PATH = "model.pkl"
try:
    # First try joblib, as it is often preferred for scikit-learn models
    try:
        model = joblib.load(MODEL_PATH)
        print("✅ Successfully loaded model using joblib.")
    except Exception:
        # Fallback to pickle
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        print("✅ Successfully loaded model using pickle.")
except Exception as e:
    print(f"⚠️ Warning: Could not load trained model at {MODEL_PATH}. Using mock predictions until the file is created.")
    model = None

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "Flask API running", "model_loaded": model is not None})

@app.route('/analyze_code', methods=['POST'])
def analyze_code():
    data = request.json
    if not data or 'codeSnippet' not in data:
        return jsonify({"error": "Missing 'codeSnippet' in request body"}), 400
    
    code = data['codeSnippet']
    
    # --- Step 1: Compute Risk Score using ML Model ---
    risk_score = 0.0
    if model is not None:
        try:
            # Note: We assume the model expects code length or some extracted features.
            # You will need to implement the exact feature extraction logic used in your Colab training here.
            # E.g., features = extract_features(code)
            # prediction_proba = model.predict_proba([features])[0][1]
            # Here we mock the result for now since we don't know the exact model inputs.
            # REMOVE THIS MOCK AND CALL YOUR ACTUAL predict() WHEN READY.
            risk_score = 75.5 
        except Exception as e:
            print(f"Error during prediction: {e}")
            risk_score = 50.0 # fallback
    else:
        # Mock prediction if no model file
        risk_score = min(max(len(code) * 0.1, 15.0), 98.0) # completely arbitrary mock logic
    
    # --- Step 2: Get specific bugs + fixes using LLM ---
    detected_bugs = []
    ai_suggested_fixes = []
    
    if gemini_api_key:
        try:
            prompt = f"""
            Analyze the following code for bugs, performance issues, and security vulnerabilities.
            Return a JSON object strictly following this structure:
            {{
                "bugs": [
                    {{"bugType": "Security/Performance/Logical", "description": "short description", "lineNumbers": [1, 2]}}
                ],
                "fixes": [
                    {{"originalCode": "bad code snippet", "fixedCode": "good code snippet", "explanation": "why this fixes it"}}
                ]
            }}
            
            Code to analyze:
            ```
            {code}
            ```
            """
            genai_model = genai.GenerativeModel('gemini-1.5-pro')
            response = genai_model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Clean up JSON formatting from LLM if it returned markdown wraps
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            import json
            llm_results = json.loads(response_text)
            detected_bugs = llm_results.get("bugs", [])
            ai_suggested_fixes = llm_results.get("fixes", [])
            
        except Exception as e:
            print(f"Error calling LLM: {e}")
            detected_bugs = [{"bugType": "Runtime", "description": "Failed to run LLM analysis", "lineNumbers": []}]
    else:
        detected_bugs = [{"bugType": "Setup", "description": "No Gemini API key configured in Flask", "lineNumbers": []}]

    # Return unified response to Node.js
    return jsonify({
        "riskScore": round(risk_score, 2),
        "detectedBugs": detected_bugs,
        "aiSuggestedFixes": ai_suggested_fixes
    })

if __name__ == '__main__':
    # Run server on port 8000
    app.run(host='0.0.0.0', port=8000, debug=True)
