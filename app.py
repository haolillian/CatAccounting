from flask import Flask, send_from_directory
import os

# Serve the static frontend files from the repository root.
app = Flask(__name__, static_folder='.', static_url_path='')


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def static_proxy(path):
    # Serve any static file (css, js, images, etc.) from repo root
    return send_from_directory('.', path)


if __name__ == '__main__':
    # Local dev fallback
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
