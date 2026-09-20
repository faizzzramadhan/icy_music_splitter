# ICY MUSIC SPLITTER 🎵

A source separation web studio designed to isolate audio into **Vocals, Drums, Bass, Guitar, Piano, Strings, and Others** with a dark workstation interface inspired by modern studio software (Moises.ai).

![App UI Preview](preview.png)

---

## 🚀 Features

### 🎚️ Multi-Track Stem Mixer
- Real-time Web Audio synchronized playback across all isolated stems.
- Stem channels with matching neon color accents and custom iconography:
  - 🎤 **Vocals** (Crimson Red `#ef4444`)
  - 🥁 **Drums** (Emerald Green `#10b981`)
  - 🎸 **Bass** (Purple `#a855f7`)
  - 🎸 **Guitar** (Amber `#f59e0b`)
  - 🎹 **Piano** (Cyan `#06b6d4`)
  - 🎻 **Strings** (Rose `#f43f5e`)
  - 🎵 **Others** (Electric Blue `#3b82f6`)
- **Mute (M)** & **Solo (S)** logic matrix with multi-solo support.
- Color-coded draggable volume faders with live percentage readouts.
- Track mode switcher: **4 tracks**, **6 tracks**, or **7 tracks (Full Studio)**.

### 🌊 Interactive Waveform & Player
- High-resolution amber/gold glowing audio waveform with interactive scrubhead.
- Instant click-to-seek, hover time tooltip, and time duration counters.
- **Speed controller**: `[- 1.00 x +]` (0.5x to 2.0x playback rate).
- **Loop toggle**: Smooth seamless looping of current song.
- **Key / Pitch Transpose**: `[b  0 st  #]` (-12 to +12 semitones transposition).
- **Audio Intelligence**: Automatic BPM tempo detection & Musical Key identification (e.g. `Gb major`).

### 📦 Stems Download Modal
- Modal interface matching the reference design.
- Multi-selection checkable track cards for all isolated stems.
- **Select All** & **Clear All** controls.
- Single-click **ZIP export** with both **MP3 (Compact)** and **WAV (16-bit Lossless)** audio formats.

### 🎧 Built-in Sample Project
- Launches ready-to-play with the sample song `act viii_ i hate to be alone.mp3` with 7 pre-separated stems so you can immediately audition and mix!

---

## 🛠️ How to Run

### 1. Launch with Batch Script (Windows)
Double-click `run.bat` in the folder:
```bash
run.bat
```

### 2. Or Run with Python Command Line
```bash
cd "d:\1-Documents\PROJECT ISENG AI\ICY MUSIC SPLITTER"
python server.py
```

Open your browser and navigate to:
```
http://localhost:7860
```

---

## 📁 Project Structure

```
ICY MUSIC SPLITTER/
├── demo/                   # Pre-rendered demo audio & isolated stems
│   ├── act viii_ i hate to be alone.mp3
│   ├── vocals.mp3, drums.mp3, bass.mp3, guitar.mp3, piano.mp3, strings.mp3, others.mp3
│   └── generate_demo.py
├── output/                 # Output directories for separated user audio files
├── public/                 # Modern web client
│   ├── index.html          # Semantic dark studio HTML
│   ├── style.css           # Glassmorphism & studio layout styles
│   └── app.js              # Web Audio API engine, mixing matrix & UI handlers
├── uploads/                # Temporary uploaded user songs
├── run.bat                 # 1-click Windows launcher
├── separator.py            # FFmpeg DSP filter separation & Demucs integration
├── server.py               # Flask REST API & streaming backend
└── requirements.txt        # Python dependencies
```

---

## 🎼 Separation Engines Supported
1. **Built-in Ultra-Fast DSP/FFmpeg Engine**:
   - Zero-delay multi-band spectral separation and formant mid-side extraction.
   - Works immediately out of the box with no GPU or giant model downloads required.
2. **Meta Demucs AI (`htdemucs_6s`)**:
   - Automatically detected if `demucs` and `torch` are installed.
   - Isolates Drums, Bass, Guitar, Piano, Vocals, Strings, and Others with deep neural networks.

---

## 🌐 Free Cloud Deployment (Go Live 24/7)

### Deploy on Hugging Face Spaces (100% Free with Docker)
1. Push this repository to your GitHub account (`https://github.com/faizzzramadhan/icy-music-splitter`).
2. Visit [Hugging Face Spaces](https://huggingface.co/new-space).
3. Set Space Name: `icy-music-splitter`.
4. Choose **Docker** as the Space SDK (Blank).
5. Link your GitHub repository. It will automatically build and host the studio live for free!

### Deploy on Render / Railway
1. Sign in to [Render.com](https://render.com) or [Railway.app](https://railway.app).
2. Choose **New Web Service** -> Connect GitHub repository.
3. Select **Docker** environment -> Deploy!

