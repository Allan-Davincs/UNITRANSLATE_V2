import os
from flask import Flask, request, jsonify, render_template, send_from_directory
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

DEEPL_API_KEY = os.getenv('DEEPL_API_KEY')
DEEPL_URL = "https://api-free.deepl.com/v2/translate"

# Serve static files
@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

# Serve service worker from root scope (required for PWA)
@app.route('/sw.js')
def service_worker():
    return send_from_directory('static/js', 'sw.js')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/offline')
def offline():
    return render_template('offline.html')

@app.route('/translate', methods=['POST'])
def translate():
    data = request.get_json() or {}
    text = (data.get('text') or '').strip()
    target_lang = (data.get('target_lang') or '').strip()
    source_lang = (data.get('source_lang') or '').strip()
    tone = (data.get('tone') or 'neutral').strip().lower()

    if not text or not target_lang:
        return jsonify({'error': 'Missing text or target language'}), 400

    formality_map = {
        'formal': 'prefer_more',
        'casual': 'prefer_less',
        'neutral': 'default'
    }

    headers = {
        'Authorization': f'DeepL-Auth-Key {DEEPL_API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {'text': [text], 'target_lang': target_lang.upper()}
    if source_lang:
        payload['source_lang'] = source_lang.upper()
    if tone in formality_map:
        payload['formality'] = formality_map[tone]

    try:
        response = requests.post(DEEPL_URL, json=payload, headers=headers, timeout=20)
        response.raise_for_status()
        result = response.json()
        translation = result['translations'][0]['text']
        return jsonify({'translation': translation})
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
