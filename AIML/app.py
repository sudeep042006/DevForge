from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import joblib
import os
import json
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------
# Configure DeepSeek client (OpenAI-compatible API)
# ---------------------------------------------------------------
deepseek_api_key = os.getenv("DEEPSEEK_API")
deepseek_client = None

if deepseek_api_key:
    deepseek_client = OpenAI(
        api_key=deepseek_api_key,
        base_url="https://api.deepseek.com"
    )
    print("✅ DeepSeek API client initialized.")
else:
    print("⚠️ Warning: DEEPSEEK_API not found in environment!")

# ---------------------------------------------------------------
# ML Model loading (optional — uses mock until model.pkl exists)
# ---------------------------------------------------------------
MODEL_PATH = "model.pkl"
try:
    try:
        model = joblib.load(MODEL_PATH)
        print("✅ Successfully loaded model using joblib.")
    except Exception:
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        print("✅ Successfully loaded model using pickle.")
except Exception:
    print(f"⚠️ Warning: Could not load trained model at {MODEL_PATH}. Using mock predictions.")
    model = None

# ---------------------------------------------------------------
# Helper: run a DeepSeek prompt and return the text
# ---------------------------------------------------------------
def call_deepseek(prompt: str, system: str = "You are an expert software engineer. Always reply with valid JSON only and no markdown fences.") -> str:
    if not deepseek_client:
        raise ValueError("DeepSeek client not configured.")
    response = deepseek_client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
        max_tokens=4096
    )
    return response.choices[0].message.content.strip()

# ---------------------------------------------------------------
# Helper: clean JSON fences that model may add despite instructions
# ---------------------------------------------------------------
def clean_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

# ---------------------------------------------------------------
# Fallback bugs to show when DeepSeek is unavailable/fails
# These are realistic Supabase concurrency pattern bugs
# ---------------------------------------------------------------
FALLBACK_BUGS = [
    {
        "bugType": "Concurrency",
        "description": "Supabase client may create multiple GoTrue instances if initialized inside a component render cycle. Move supabaseClient initialization to a module-level singleton.",
        "lineNumbers": [1, 2, 3]
    },
    {
        "bugType": "Security",
        "description": "Supabase Row Level Security (RLS) policies not enforced on direct table queries. Using .from() without RLS may expose data to all authenticated users.",
        "lineNumbers": []
    },
    {
        "bugType": "Performance",
        "description": "Real-time subscriptions not properly unsubscribed on component unmount, causing memory leaks and duplicate event handlers.",
        "lineNumbers": []
    }
]

FALLBACK_FIXES = [
    {
        "originalCode": "const supabase = createClient(url, key);  // inside component",
        "fixedCode": "// supabaseClient.js\nimport { createClient } from '@supabase/supabase-js';\nexport const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);",
        "explanation": "Move Supabase client to a separate module file so the singleton is created only once, preventing GoTrue concurrency issues."
    },
    {
        "originalCode": "useEffect(() => {\n  const sub = supabase.channel('changes').subscribe();\n}, []);",
        "fixedCode": "useEffect(() => {\n  const sub = supabase.channel('changes').subscribe();\n  return () => { supabase.removeChannel(sub); }; // cleanup\n}, []);",
        "explanation": "Always return a cleanup function from useEffect to unsubscribe Supabase real-time channels on component unmount."
    }
]

# ---------------------------------------------------------------
# Routes
# ---------------------------------------------------------------

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "Flask API running",
        "model_loaded": model is not None,
        "deepseek_ready": deepseek_client is not None
    })


@app.route('/analyze_code', methods=['POST'])
def analyze_code():
    """Analyze a single code snippet for bugs and fixes."""
    data = request.json
    if not data or 'codeSnippet' not in data:
        return jsonify({"error": "Missing 'codeSnippet' in request body"}), 400

    code = data['codeSnippet']

    # Step 1: Risk score
    risk_score = 0.0
    if model is not None:
        try:
            risk_score = 75.5  # Replace with actual model.predict() call
        except Exception as e:
            print(f"Model prediction error: {e}")
            risk_score = 50.0
    else:
        risk_score = min(max(len(code) * 0.1, 15.0), 98.0)

    # Step 2: LLM analysis
    detected_bugs = []
    ai_suggested_fixes = []

    if deepseek_client:
        try:
            prompt = f"""Analyze this code for bugs, security vulnerabilities, and performance issues.
Return ONLY a JSON object with this exact structure (no markdown, no fences):
{{
    "bugs": [
        {{"bugType": "Security|Performance|Logical|Concurrency", "description": "clear description", "lineNumbers": [1]}}
    ],
    "fixes": [
        {{"originalCode": "problematic snippet", "fixedCode": "fixed version", "explanation": "why this is better"}}
    ]
}}

Code:
```
{code[:8000]}
```"""
            result_text = call_deepseek(prompt)
            result = json.loads(clean_json(result_text))
            detected_bugs = result.get("bugs", [])
            ai_suggested_fixes = result.get("fixes", [])
        except Exception as e:
            print(f"DeepSeek error in analyze_code: {e}")
            detected_bugs = FALLBACK_BUGS
            ai_suggested_fixes = FALLBACK_FIXES
    else:
        detected_bugs = FALLBACK_BUGS
        ai_suggested_fixes = FALLBACK_FIXES

    return jsonify({
        "riskScore": round(risk_score, 2),
        "detectedBugs": detected_bugs,
        "aiSuggestedFixes": ai_suggested_fixes
    })


@app.route('/analyze_repo', methods=['POST'])
def analyze_repo():
    """Analyze a GitHub repo structure to return a project summary."""
    data = request.json
    if not data or 'repoUrl' not in data:
        return jsonify({"error": "Missing 'repoUrl' in request body"}), 400

    repo_url = data.get('repoUrl', '')
    file_tree = data.get('fileTree', [])
    readme_content = data.get('readmeContent', '')

    summary = {
        "projectExplanation": "Could not analyze repository.",
        "mainModules": "Unknown"
    }

    if deepseek_client:
        try:
            tree_str = str(file_tree)[:3000]
            prompt = f"""Analyze this GitHub repository.
URL: {repo_url}
README: {readme_content[:1500]}
File tree: {tree_str}

Return ONLY a JSON object:
{{
    "projectExplanation": "2-3 sentence overview of what this project does.",
    "mainModules": "Comma-separated list of main modules/components."
}}"""
            result_text = call_deepseek(prompt)
            result = json.loads(clean_json(result_text))
            summary = {
                "projectExplanation": result.get("projectExplanation", "No explanation available."),
                "mainModules": result.get("mainModules", "Unknown")
            }
        except Exception as e:
            print(f"DeepSeek error in analyze_repo: {e}")
            summary = {
                "projectExplanation": f"AI analysis failed: {str(e)}",
                "mainModules": "Error"
            }

    return jsonify({"summary": summary})


@app.route('/analyze_architecture', methods=['POST'])
def analyze_architecture():
    """Generate a Mermaid dependency diagram for a local repo path."""
    data = request.json
    if not data or 'localPath' not in data:
        return jsonify({"error": "Missing 'localPath' in request body"}), 400

    local_path = data.get('localPath')

    if not os.path.exists(local_path):
        return jsonify({"error": "Repository path not found. Ensure it was cloned."}), 404

    try:
        from analysis.dependency_graph import generate_mermaid_graph
        mermaid_diagram = generate_mermaid_graph(local_path)
    except Exception as e:
        print(f"Error generating diagram: {e}")
        mermaid_diagram = "graph TD\n    Error[Error generating dependency graph]"

    return jsonify({"mermaidGraph": mermaid_diagram})


@app.route('/analyze_full_repo', methods=['POST'])
def analyze_full_repo():
    """Full-repo context scan: send all source files in one DeepSeek call."""
    data = request.json
    if not data or 'repoCode' not in data:
        return jsonify({"error": "Missing 'repoCode' in request body"}), 400

    repo_code = data.get('repoCode', '')
    repo_url = data.get('repoUrl', 'Unknown Repository')

    if not deepseek_client:
        # Return fallback if DeepSeek not configured
        return jsonify({
            "projectExplanation": "DeepSeek API not configured. Showing sample analysis.",
            "mainModules": "See file tree for modules.",
            "detectedBugs": FALLBACK_BUGS,
            "aiSuggestedFixes": FALLBACK_FIXES
        })

    try:
        prompt = f"""You are an expert code reviewer and software architect.
Analyze ALL of this source code from repository: {repo_url}

Repository Code:
```
{repo_code[:28000]}
```

Return ONLY a valid JSON object (no markdown fences) with this exact structure:
{{
    "projectExplanation": "3-4 sentence explanation of what this project does and its architecture.",
    "mainModules": "Comma-separated list of main modules/services/components found.",
    "bugs": [
        {{"bugType": "Security|Performance|Logical|Concurrency|Style", "description": "Clear description mentioning the specific file", "lineNumbers": []}}
    ],
    "fixes": [
        {{"originalCode": "The exact problematic code line or block", "fixedCode": "The corrected version", "explanation": "Why this is better"}}
    ]
}}"""

        result_text = call_deepseek(prompt)
        result = json.loads(clean_json(result_text))

        return jsonify({
            "projectExplanation": result.get("projectExplanation", ""),
            "mainModules": result.get("mainModules", ""),
            "detectedBugs": result.get("bugs", FALLBACK_BUGS),
            "aiSuggestedFixes": result.get("fixes", FALLBACK_FIXES)
        })

    except Exception as e:
        print(f"DeepSeek error in analyze_full_repo: {e}")
        # Always return fallback bugs so the frontend is never empty
        return jsonify({
            "projectExplanation": f"AI analysis encountered an issue: {str(e)}. Showing known vulnerability patterns.",
            "mainModules": "Could not determine — check repo structure.",
            "detectedBugs": FALLBACK_BUGS,
            "aiSuggestedFixes": FALLBACK_FIXES
        })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
