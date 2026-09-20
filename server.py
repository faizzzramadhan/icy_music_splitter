"""
ICY MUSIC SPLITTER - Backend Server
Flask server providing:
- Full Web Audio Player & Stems Mixer Interface
- Track analysis (Waveform peaks, Key, BPM)
- Stem separation orchestration (4, 6, 7 stems)
- Audio streaming with partial-content range support
- Multi-stem ZIP archive exporter
"""

import os
import io
import sys
import zipfile
import threading
import uuid
from flask import Flask, request, jsonify, send_file, send_from_directory, Response
from werkzeug.utils import secure_filename
from separator import AudioSeparator

app = Flask(__name__, static_folder="public")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
DEMO_DIR = os.path.join(BASE_DIR, "demo")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DEMO_DIR, exist_ok=True)

separator = AudioSeparator()

# In-memory jobs tracking
jobs = {}

def get_demo_info():
    demo_file = os.path.join(DEMO_DIR, "act viii_ i hate to be alone.mp3")
    if not os.path.exists(demo_file):
        demo_file = os.path.join(DEMO_DIR, "master.wav")
    
    info = separator.get_audio_info(demo_file)
    info["songTitle"] = "act viii_ i hate to be alone.mp3"
    info["isDemo"] = True
    info["stems"] = {
        "vocals": {"label": "Vocals", "color": "#ef4444", "url": "/api/demo/audio/vocals.mp3"},
        "drums": {"label": "Drums", "color": "#10b981", "url": "/api/demo/audio/drums.mp3"},
        "bass": {"label": "Bass", "color": "#a855f7", "url": "/api/demo/audio/bass.mp3"},
        "guitar": {"label": "Guitar", "color": "#f59e0b", "url": "/api/demo/audio/guitar.mp3"},
        "piano": {"label": "Piano", "color": "#06b6d4", "url": "/api/demo/audio/piano.mp3"},
        "strings": {"label": "Strings", "color": "#f43f5e", "url": "/api/demo/audio/strings.mp3"},
        "others": {"label": "Others", "color": "#3b82f6", "url": "/api/demo/audio/others.mp3"}
    }
    return info

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Range"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range, Content-Length, Accept-Ranges"
    return response

@app.route("/")
def index():
    return send_from_directory("public", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("public", path)

@app.route("/api/status")
def get_status():
    return jsonify({
        "status": "ready",
        "hasDemucs": separator.has_demucs,
        "ffmpeg": "available",
        "supportedFormats": [".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac"]
    })

@app.route("/api/demo")
def api_demo():
    try:
        demo_info = get_demo_info()
        return jsonify(demo_info)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/demo/audio/<filename>")
def stream_demo_audio(filename):
    safe_name = secure_filename(filename)
    path = os.path.join(DEMO_DIR, safe_name)
    if not os.path.exists(path):
        return "Audio file not found", 404
    return send_file(path, conditional=True)

@app.route("/api/upload", methods=["POST"])
def upload_file():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    file = request.files["audio"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    filename = secure_filename(file.filename)
    job_id = str(uuid.uuid4())
    job_upload_dir = os.path.join(UPLOAD_DIR, job_id)
    os.makedirs(job_upload_dir, exist_ok=True)
    
    save_path = os.path.join(job_upload_dir, filename)
    file.save(save_path)

    try:
        meta = separator.get_audio_info(save_path)
        meta["jobId"] = job_id
        meta["songTitle"] = filename
        
        jobs[job_id] = {
            "id": job_id,
            "filename": filename,
            "filePath": save_path,
            "meta": meta,
            "status": "uploaded",
            "progress": 0,
            "mode": "7",
            "stems": {}
        }
        return jsonify(meta)
    except Exception as e:
        return jsonify({"error": f"Failed to analyze audio: {str(e)}"}), 500

@app.route("/api/separate", methods=["POST"])
def start_separation():
    data = request.get_json() or {}
    job_id = data.get("jobId")
    mode = str(data.get("mode", "7"))

    if not job_id or job_id not in jobs:
        return jsonify({"error": "Invalid or missing jobId"}), 404

    job = jobs[job_id]
    job["status"] = "processing"
    job["progress"] = 5
    job["mode"] = mode

    def run_worker():
        try:
            job_out_dir = os.path.join(OUTPUT_DIR, job_id)
            os.makedirs(job_out_dir, exist_ok=True)

            def progress_cb(pct, message):
                job["progress"] = pct
                job["statusMessage"] = message

            stems = separator.separate(job["filePath"], job_out_dir, mode=mode, progress_callback=progress_cb)
            
            # Form stem URLs
            formatted_stems = {}
            for stem_key, s_data in stems.items():
                formatted_stems[stem_key] = {
                    "label": s_data["label"],
                    "color": s_data.get("color", "#3b82f6"),
                    "url": f"/api/stems/{job_id}/{s_data['mp3']}",
                    "wavUrl": f"/api/stems/{job_id}/{s_data['wav']}"
                }
            job["stems"] = formatted_stems
            job["status"] = "completed"
            job["progress"] = 100
        except Exception as e:
            job["status"] = "error"
            job["error"] = str(e)
            print(f"Error in separation worker: {e}", file=sys.stderr)

    thread = threading.Thread(target=run_worker, daemon=True)
    thread.start()

    return jsonify({"status": "started", "jobId": job_id})

@app.route("/api/job/<job_id>")
def get_job_status(job_id):
    if job_id not in jobs:
        return jsonify({"error": "Job not found"}), 404
    job = jobs[job_id]
    return jsonify({
        "jobId": job_id,
        "status": job["status"],
        "progress": job.get("progress", 0),
        "statusMessage": job.get("statusMessage", ""),
        "stems": job.get("stems", {}),
        "error": job.get("error", None)
    })

@app.route("/api/stems/<job_id>/<filename>")
def stream_separated_stem(job_id, filename):
    safe_name = secure_filename(filename)
    stem_path = os.path.join(OUTPUT_DIR, job_id, safe_name)
    if not os.path.exists(stem_path):
        return "Stem file not found", 404
    return send_file(stem_path, conditional=True)

@app.route("/api/download-zip", methods=["POST"])
def download_stems_zip():
    data = request.get_json() or {}
    job_id = data.get("jobId")
    selected_stems = data.get("stems", [])
    format_type = data.get("format", "mp3").lower()  # "mp3" or "wav"
    is_demo = data.get("isDemo", False)

    if not selected_stems:
        return jsonify({"error": "No stems selected"}), 400

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        if is_demo:
            source_dir = DEMO_DIR
            title = "act_viii_i_hate_to_be_alone"
        else:
            if not job_id or job_id not in jobs:
                return jsonify({"error": "Invalid job ID"}), 404
            source_dir = os.path.join(OUTPUT_DIR, job_id)
            title = os.path.splitext(jobs[job_id]["filename"])[0]

        added_count = 0
        for stem in selected_stems:
            stem_filename = f"{stem}.{format_type}"
            stem_path = os.path.join(source_dir, stem_filename)
            if not os.path.exists(stem_path):
                # Fallback to wav or mp3
                alt_format = "wav" if format_type == "mp3" else "mp3"
                stem_filename = f"{stem}.{alt_format}"
                stem_path = os.path.join(source_dir, stem_filename)

            if os.path.exists(stem_path):
                zf.write(stem_path, arcname=f"{title}_{stem}.{format_type}")
                added_count += 1

        if added_count == 0:
            return jsonify({"error": "None of the requested stem files were found"}), 404

    zip_buffer.seek(0)
    zip_filename = f"{title}_stems.zip"
    return send_file(
        zip_buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name=zip_filename
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"Starting ICY MUSIC SPLITTER on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
