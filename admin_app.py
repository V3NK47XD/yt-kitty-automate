import os
from flask import Flask, request, jsonify

app = Flask(__name__)
ENV_FILE = ".env"

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Config Manager</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #121212;
            color: #e0e0e0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            background-color: #1e1e1e;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            width: 80%;
            max-width: 800px;
        }
        h1 {
            text-align: center;
            color: #bb86fc;
            margin-bottom: 1.5rem;
        }
        textarea {
            width: 100%;
            height: 400px;
            background-color: #2d2d2d;
            color: #cfcfcf;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 1rem;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 14px;
            resize: none;
            box-sizing: border-box;
            outline: none;
        }
        textarea:focus {
            border-color: #bb86fc;
        }
        .actions {
            display: flex;
            justify-content: flex-end;
            margin-top: 1.5rem;
        }
        button {
            background-color: #bb86fc;
            color: #000;
            border: none;
            padding: 0.75rem 1.5rem;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s;
        }
        button:hover {
            background-color: #9965f4;
        }
        #status {
            text-align: center;
            margin-top: 1rem;
            font-size: 0.9rem;
            height: 1.2rem;
        }
        .success { color: #03dac6; }
        .error { color: #cf6679; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚙️ Configuration Manager</h1>
        <textarea id="envContent" spellcheck="false"></textarea>
        <div class="actions">
            <button onclick="saveChanges()">Save & Restart</button>
        </div>
        <div id="status"></div>
    </div>

    <script>
        async function loadEnv() {
            try {
                const res = await fetch('/get-env');
                const data = await res.text();
                document.getElementById('envContent').value = data;
            } catch (e) {
                showStatus('Failed to load .env', 'error');
            }
        }

        async function saveChanges() {
            const content = document.getElementById('envContent').value;
            const statusDiv = document.getElementById('status');
            
            try {
                const res = await fetch('/save-env', {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: content
                });
                
                if (res.ok) {
                    showStatus('Changes saved! System restarting...', 'success');
                } else {
                    showStatus('Failed to save changes', 'error');
                }
            } catch (e) {
                showStatus('Error connecting to server', 'error');
            }
        }

        function showStatus(msg, type) {
            const statusDiv = document.getElementById('status');
            statusDiv.innerText = msg;
            statusDiv.className = type;
            if (type === 'success') {
                setTimeout(() => { statusDiv.innerText = ''; }, 5000);
            }
        }

        window.onload = loadEnv;
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return HTML_TEMPLATE

@app.route('/get-env')
def get_env():
    try:
        with open(ENV_FILE, 'r') as f:
            return f.read()
    except Exception as e:
        return str(e), 500

@app.route('/save-env', methods=['POST'])
def save_env():
    try:
        content = request.data.decode('utf-8')
        with open(ENV_FILE, 'w') as f:
            f.write(content)
        
        # Create a flag file to signal the launcher to restart the main app
        with open("restart.flag", "w") as f:
            f.write("restart")
            
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    # Run on localhost:5000, disable debug to avoid double process start
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
