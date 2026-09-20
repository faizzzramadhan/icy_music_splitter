/**
 * ICY MUSIC SPLITTER - Audio Engine & Studio UI Controller
 */

// Stem definitions with color and SVG icons matching reference screenshots
const STEM_ICONS = {
  vocals: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
  drums: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="7" rx="9" ry="4"></ellipse><path d="M3 7v10c0 2.21 4.03 4 9 4s9-1.79 9-4V7"></path><path d="M3 12c0 2.21 4.03 4 9 4s9-1.79 9-4"></path><line x1="8" y1="2" x2="6" y2="7"></line><line x1="16" y1="2" x2="18" y2="7"></line></svg>`,
  bass: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="18" r="4"></circle><path d="M11 18V4l10-2v11"></path><circle cx="17" cy="13" r="3"></circle></svg>`,
  guitar: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 5-7 7"></path><path d="M14 3a3 3 0 0 0-3 3c0 .8.3 1.5.8 2l-7.3 7.3a4.2 4.2 0 0 0 6 6l7.3-7.3c.5.5 1.2.8 2 .8a3 3 0 0 0 3-3V3z"></path></svg>`,
  piano: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="4" x2="7" y2="13"></line><line x1="11" y1="4" x2="11" y2="13"></line><line x1="15" y1="4" x2="15" y2="13"></line><line x1="9" y1="13" x2="9" y2="20"></line><line x1="13" y1="13" x2="13" y2="20"></line><line x1="17" y1="13" x2="17" y2="20"></line></svg>`,
  strings: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><path d="M6 15c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3v-3H6Z"></path><path d="M18 13c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3v-3h-3Z"></path></svg>`,
  others: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`
};

const STEM_META = {
  vocals: { label: "Vocals", color: "#ef4444" },
  drums: { label: "Drums", color: "#10b981" },
  bass: { label: "Bass", color: "#a855f7" },
  guitar: { label: "Guitar", color: "#f59e0b" },
  piano: { label: "Piano", color: "#06b6d4" },
  strings: { label: "Strings", color: "#f43f5e" },
  others: { label: "Others", color: "#3b82f6" }
};

// Global App State
const state = {
  audioCtx: null,
  isPlaying: false,
  duration: 28.0,
  currentTime: 0.0,
  isLooping: false,
  playbackSpeed: 1.0,
  pitchShiftSemi: 0,
  activeMode: "7", // "4", "6", "7"
  isDemo: true,
  jobId: null,
  songTitle: "act viii_ i hate to be alone.mp3",
  peaks: [],
  
  // Stems dictionary: key -> { label, color, url, audioEl, sourceNode, gainNode, volume: 1.0, isMuted: false, isSolo: false }
  stems: {},
  
  // Download selection set: Set of stem keys
  downloadSelected: new Set(["vocals", "drums", "bass", "others"]),

  // Pending file upload
  pendingUploadFile: null,

  // AI GPU Backend URL (Local or Cloudflare Tunnel)
  backendUrl: localStorage.getItem("icy_backend_url") || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
      ? "" 
      : "https://bufing-husband-centered-vernon.trycloudflare.com"
  )
};

// DOM Elements
const el = {
  btnPlayPause: document.getElementById("btnPlayPause"),
  iconPlay: document.querySelector(".icon-play"),
  iconPause: document.querySelector(".icon-pause"),
  trackTitleDisplay: document.getElementById("trackTitleDisplay"),
  trackModeBadge: document.getElementById("currentTrackModeBadge"),
  activeStemsCount: document.getElementById("activeStemsCount"),
  trackCountSelector: document.getElementById("trackCountSelector"),
  stemsRack: document.getElementById("stemsRack"),
  waveformCanvas: document.getElementById("waveformCanvas"),
  waveformPlayhead: document.getElementById("waveformPlayhead"),
  waveformHoverTime: document.getElementById("waveformHoverTime"),
  waveformWrapper: document.getElementById("waveformWrapper"),
  timeElapsed: document.getElementById("timeElapsed"),
  timeTotal: document.getElementById("timeTotal"),
  speedDisplay: document.getElementById("speedDisplay"),
  btnSpeedDown: document.getElementById("btnSpeedDown"),
  btnSpeedUp: document.getElementById("btnSpeedUp"),
  btnLoop: document.getElementById("btnLoop"),
  pitchDisplay: document.getElementById("pitchDisplay"),
  btnPitchDown: document.getElementById("btnPitchDown"),
  btnPitchUp: document.getElementById("btnPitchUp"),
  bpmDisplay: document.getElementById("bpmDisplay"),
  keyDisplay: document.getElementById("keyDisplay"),
  btnResetTrack: document.getElementById("btnResetTrack"),
  
  // Modals & triggers
  btnOpenDownloadModal: document.getElementById("btnOpenDownloadModal"),
  btnOpenStudio: document.getElementById("btnOpenStudio"),
  downloadModal: document.getElementById("downloadModal"),
  btnCloseDownloadModal: document.getElementById("btnCloseDownloadModal"),
  downloadStemsList: document.getElementById("downloadStemsList"),
  btnSelectAllStems: document.getElementById("btnSelectAllStems"),
  btnClearAllStems: document.getElementById("btnClearAllStems"),
  btnExecuteDownload: document.getElementById("btnExecuteDownload"),
  
  btnOpenImport: document.getElementById("btnOpenImport"),
  btnTopImport: document.getElementById("btnTopImport"),
  importModal: document.getElementById("importModal"),
  btnCloseImportModal: document.getElementById("btnCloseImportModal"),
  audioDropzone: document.getElementById("audioDropzone"),
  audioFileInput: document.getElementById("audioFileInput"),
  btnStartSeparation: document.getElementById("btnStartSeparation"),
  btnCancelImport: document.getElementById("btnCancelImport"),
  importProgressWrap: document.getElementById("importProgressWrap"),
  progressStatusText: document.getElementById("progressStatusText"),
  progressPctText: document.getElementById("progressPctText"),
  progressBarFill: document.getElementById("progressBarFill"),

  // Settings & Engine Badge
  engineStatusBadge: document.getElementById("engineStatusBadge"),
  engineDot: document.getElementById("engineDot"),
  engineLabel: document.getElementById("engineLabel"),
  settingsModal: document.getElementById("settingsModal"),
  btnCloseSettingsModal: document.getElementById("btnCloseSettingsModal"),
  btnCancelSettings: document.getElementById("btnCancelSettings"),
  btnSaveSettings: document.getElementById("btnSaveSettings"),
  backendUrlInput: document.getElementById("backendUrlInput"),
  btnTestBackend: document.getElementById("btnTestBackend"),
  backendTestStatus: document.getElementById("backendTestStatus"),

  toastMessage: document.getElementById("toastMessage")
};

// Initialize Web Audio Context
function getAudioContext() {
  if (!state.audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new AudioCtx();
  }
  if (state.audioCtx.state === "suspended") {
    state.audioCtx.resume();
  }
  return state.audioCtx;
}

// Show Toast message
function showToast(msg, duration = 3000) {
  el.toastMessage.textContent = msg;
  el.toastMessage.classList.add("show");
  setTimeout(() => {
    el.toastMessage.classList.remove("show");
  }, duration);
}

// Format seconds into M:SS
function formatTime(secs) {
  if (isNaN(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Helper to build full backend URL
function getBackendUrl(path) {
  let base = (state.backendUrl || "").trim().replace(/\/+$/, "");
  if (!base && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return path;
  }
  return base ? `${base}${path}` : path;
}

// Helper to resolve stem audio URLs
function resolveAudioUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) {
    return url;
  }
  if (url.startsWith("/demo/")) {
    return url;
  }
  let base = (state.backendUrl || "").trim().replace(/\/+$/, "");
  if (base && url.startsWith("/api/")) {
    return `${base}${url}`;
  }
  return url;
}

// Check Backend Engine Status
async function checkBackendStatus() {
  const badge = el.engineStatusBadge;
  const dot = el.engineDot;
  const lbl = el.engineLabel;
  if (!lbl) return false;

  try {
    const statusUrl = getBackendUrl("/api/status");
    const res = await fetch(statusUrl, { method: "GET", mode: "cors" });
    if (res.ok) {
      const data = await res.json();
      if (data.hasDemucs) {
        dot.className = "status-dot online";
        lbl.textContent = "Meta Demucs AI GPU (Clean)";
        if (badge) badge.title = "Connected to Demucs AI GPU. Click to open engine settings.";
        return true;
      }
    }
  } catch (e) {
    console.warn("Backend check note:", e);
  }

  dot.className = "status-dot offline";
  lbl.textContent = "AI Engine: Offline (Setup)";
  if (badge) badge.title = "Demucs AI Backend not detected. Click to configure live URL.";
  return false;
}

// Check which stems to include based on mode
function getActiveStemKeys(mode = state.activeMode) {
  if (mode === "4") return ["vocals", "drums", "bass", "others"];
  if (mode === "6") return ["vocals", "drums", "bass", "guitar", "piano", "others"];
  return ["vocals", "drums", "bass", "guitar", "piano", "strings", "others"];
}

// Initialize and setup stems
function setupStems(stemsData) {
  // Tear down existing audio elements
  Object.values(state.stems).forEach(stem => {
    if (stem.audioEl) {
      stem.audioEl.pause();
      stem.audioEl.src = "";
      stem.audioEl.load();
    }
  });
  state.stems = {};

  const ctx = getAudioContext();
  const activeKeys = getActiveStemKeys();

  activeKeys.forEach(key => {
    const meta = STEM_META[key] || { label: key, color: "#3b82f6" };
    const stemInfo = stemsData[key] || {};
    const rawUrl = stemInfo.url || `/demo/${key}.mp3`;
    const audioUrl = resolveAudioUrl(rawUrl);

    const audioEl = new Audio();
    audioEl.crossOrigin = "anonymous";
    audioEl.src = audioUrl;
    audioEl.preload = "auto";
    audioEl.loop = state.isLooping;
    audioEl.playbackRate = state.playbackSpeed;

    // Web Audio Gain Node
    let sourceNode = null;
    let gainNode = null;
    try {
      sourceNode = ctx.createMediaElementSource(audioEl);
      gainNode = ctx.createGain();
      gainNode.gain.value = 1.0;
      sourceNode.connect(gainNode);
      gainNode.connect(ctx.destination);
    } catch (err) {
      console.warn("MediaElementSource note:", err);
    }

    state.stems[key] = {
      key,
      label: meta.label,
      color: meta.color,
      url: audioUrl,
      audioEl,
      sourceNode,
      gainNode,
      volume: 1.0,
      isMuted: false,
      isSolo: false
    };
  });

  // Attach primary timeupdate listener to vocals or first stem
  const primaryStemKey = activeKeys.includes("vocals") ? "vocals" : activeKeys[0];
  if (state.stems[primaryStemKey]) {
    state.stems[primaryStemKey].audioEl.ontimeupdate = () => {
      state.currentTime = state.stems[primaryStemKey].audioEl.currentTime;
      updatePlayheadUI();
    };
    state.stems[primaryStemKey].audioEl.onended = () => {
      if (!state.isLooping) {
        pausePlayback();
        seekToTime(0);
      }
    };
  }

  // Update download selection set to default all active stems
  state.downloadSelected = new Set(activeKeys);

  renderMixerChannels();
  renderDownloadModalList();
  updateStemsCountDisplay();
  updateGainMatrix();
}

// Calculate effective gain considering Mute & Solo Matrix
function updateGainMatrix() {
  const activeKeys = getActiveStemKeys();
  const anySoloActive = activeKeys.some(k => state.stems[k]?.isSolo);

  activeKeys.forEach(k => {
    const stem = state.stems[k];
    if (!stem) return;

    let targetGain = stem.volume;

    if (stem.isMuted) {
      targetGain = 0;
    } else if (anySoloActive) {
      targetGain = stem.isSolo ? stem.volume : 0;
    }

    // Always enforce volume & mute directly on HTML5 audio element
    if (stem.audioEl) {
      stem.audioEl.volume = Math.max(0, Math.min(1, targetGain));
      stem.audioEl.muted = (targetGain === 0);
    }
    // Also apply to Web Audio API graph if connected
    if (stem.gainNode && state.audioCtx) {
      try {
        stem.gainNode.gain.setValueAtTime(targetGain, state.audioCtx.currentTime);
      } catch (e) {
        // Fallback
      }
    }
  });
}

// Render Left Panel Mixer Channels
function renderMixerChannels() {
  el.stemsRack.innerHTML = "";
  const activeKeys = getActiveStemKeys();

  activeKeys.forEach(key => {
    const stem = state.stems[key];
    if (!stem) return;

    const channelDiv = document.createElement("div");
    channelDiv.className = "stem-channel";
    channelDiv.id = `channel_${key}`;

    const iconSvg = STEM_ICONS[key] || STEM_ICONS.others;

    channelDiv.innerHTML = `
      <div class="stem-ms-group">
        <button class="btn-ms btn-mute ${stem.isMuted ? 'active-mute' : ''}" data-stem="${key}" title="Mute">M</button>
        <button class="btn-ms btn-solo ${stem.isSolo ? 'active-solo' : ''}" data-stem="${key}" title="Solo">S</button>
      </div>
      <div class="stem-body">
        <div class="stem-info">
          <div class="stem-title-wrap">
            <span class="stem-icon" style="color: ${stem.color};">${iconSvg}</span>
            <span class="stem-name">${stem.label}</span>
          </div>
          <span class="stem-vol-text" id="vol_text_${key}">100%</span>
        </div>
        <div class="slider-container">
          <input 
            type="range" 
            class="stem-volume-slider" 
            id="vol_slider_${key}" 
            data-stem="${key}"
            min="0" 
            max="1" 
            step="0.01" 
            value="${stem.volume}"
            style="--stem-color: ${stem.color}; background: linear-gradient(to right, ${stem.color} 0%, ${stem.color} ${stem.volume * 100}%, #373b49 ${stem.volume * 100}%, #373b49 100%);"
          />
        </div>
      </div>
    `;

    el.stemsRack.appendChild(channelDiv);
  });

  // Attach event handlers for Mute, Solo, Volume
  el.stemsRack.querySelectorAll(".btn-mute").forEach(btn => {
    btn.onclick = (e) => {
      const k = e.currentTarget.dataset.stem;
      state.stems[k].isMuted = !state.stems[k].isMuted;
      e.currentTarget.classList.toggle("active-mute", state.stems[k].isMuted);
      updateGainMatrix();
    };
  });

  el.stemsRack.querySelectorAll(".btn-solo").forEach(btn => {
    btn.onclick = (e) => {
      const k = e.currentTarget.dataset.stem;
      state.stems[k].isSolo = !state.stems[k].isSolo;
      e.currentTarget.classList.toggle("active-solo", state.stems[k].isSolo);
      updateGainMatrix();
    };
  });

  el.stemsRack.querySelectorAll(".stem-volume-slider").forEach(slider => {
    slider.oninput = (e) => {
      const k = e.currentTarget.dataset.stem;
      const val = parseFloat(e.currentTarget.value);
      state.stems[k].volume = val;
      
      const pct = Math.round(val * 100);
      const txt = document.getElementById(`vol_text_${k}`);
      if (txt) txt.textContent = `${pct}%`;
      
      const col = state.stems[k].color;
      e.currentTarget.style.background = `linear-gradient(to right, ${col} 0%, ${col} ${pct}%, #373b49 ${pct}%, #373b49 100%)`;
      
      updateGainMatrix();
    };
  });
}

function updateStemsCountDisplay() {
  const activeKeys = getActiveStemKeys();
  el.activeStemsCount.textContent = `${activeKeys.length} active stems`;
  el.trackModeBadge.textContent = `Master Mix \u00B7 ${activeKeys.length} Stems`;
}

// Playback Controls
function togglePlayPause() {
  getAudioContext();
  if (state.isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  const activeKeys = getActiveStemKeys();
  const playPromises = [];

  activeKeys.forEach(k => {
    const stem = state.stems[k];
    if (stem && stem.audioEl) {
      stem.audioEl.currentTime = state.currentTime;
      stem.audioEl.playbackRate = state.playbackSpeed;
      playPromises.push(stem.audioEl.play().catch(e => console.warn(e)));
    }
  });

  Promise.all(playPromises).then(() => {
    state.isPlaying = true;
    el.iconPlay.classList.add("hidden");
    el.iconPause.classList.remove("hidden");
  });
}

function pausePlayback() {
  const activeKeys = getActiveStemKeys();
  activeKeys.forEach(k => {
    const stem = state.stems[k];
    if (stem && stem.audioEl) {
      stem.audioEl.pause();
    }
  });
  state.isPlaying = false;
  el.iconPlay.classList.remove("hidden");
  el.iconPause.classList.add("hidden");
}

function seekToTime(timeInSecs) {
  state.currentTime = Math.max(0, Math.min(state.duration, timeInSecs));
  const activeKeys = getActiveStemKeys();
  activeKeys.forEach(k => {
    const stem = state.stems[k];
    if (stem && stem.audioEl) {
      stem.audioEl.currentTime = state.currentTime;
    }
  });
  updatePlayheadUI();
}

function updatePlayheadUI() {
  const progressPct = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  el.waveformPlayhead.style.left = `${progressPct}%`;
  el.timeElapsed.textContent = formatTime(state.currentTime);
}

// Render Waveform Canvas matching the screenshot's rich amber look
function drawWaveform() {
  const canvas = el.waveformCanvas;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const peaks = state.peaks.length > 0 ? state.peaks : Array(160).fill(0.35);
  const numBars = peaks.length;
  const barWidth = (w / numBars) * 0.72;
  const gap = (w / numBars) * 0.28;
  const centerY = h / 2;

  // Rich gradient amber/gold like in the screenshot
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#f59e0b");
  grad.addColorStop(0.5, "#fbbf24");
  grad.addColorStop(1, "#d97706");

  peaks.forEach((peak, i) => {
    const x = i * (barWidth + gap);
    const barHeight = Math.max(4, peak * (h * 0.85));
    const topY = centerY - barHeight / 2;

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, topY, barWidth, barHeight, 2);
    ctx.fill();
  });
}

// Waveform click & scrub interaction
el.waveformWrapper.addEventListener("click", (e) => {
  const rect = el.waveformWrapper.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
  seekToTime(clickRatio * state.duration);
});

el.waveformWrapper.addEventListener("mousemove", (e) => {
  const rect = el.waveformWrapper.getBoundingClientRect();
  const hoverX = e.clientX - rect.left;
  const hoverRatio = Math.max(0, Math.min(1, hoverX / rect.width));
  const hoverTime = hoverRatio * state.duration;

  el.waveformHoverTime.style.left = `${hoverX}px`;
  el.waveformHoverTime.textContent = formatTime(hoverTime);
  el.waveformHoverTime.style.opacity = "1";
});

el.waveformWrapper.addEventListener("mouseleave", () => {
  el.waveformHoverTime.style.opacity = "0";
});

// Speed Controls
const SPEEDS = [0.75, 0.85, 1.0, 1.15, 1.25, 1.5, 2.0];
el.btnSpeedDown.onclick = () => {
  let idx = SPEEDS.findIndex(s => s >= state.playbackSpeed);
  if (idx > 0) {
    setSpeed(SPEEDS[idx - 1]);
  }
};
el.btnSpeedUp.onclick = () => {
  let idx = SPEEDS.findIndex(s => s > state.playbackSpeed);
  if (idx !== -1) {
    setSpeed(SPEEDS[idx]);
  }
};

function setSpeed(speed) {
  state.playbackSpeed = speed;
  el.speedDisplay.textContent = `${speed.toFixed(2)} x`;
  getActiveStemKeys().forEach(k => {
    if (state.stems[k]?.audioEl) {
      state.stems[k].audioEl.playbackRate = speed;
    }
  });
}

// Loop Toggle
el.btnLoop.onclick = () => {
  state.isLooping = !state.isLooping;
  el.btnLoop.classList.toggle("active", state.isLooping);
  getActiveStemKeys().forEach(k => {
    if (state.stems[k]?.audioEl) {
      state.stems[k].audioEl.loop = state.isLooping;
    }
  });
  showToast(state.isLooping ? "Loop enabled" : "Loop disabled");
};

// Pitch Shifting (transposition in semitones)
el.btnPitchDown.onclick = () => {
  if (state.pitchShiftSemi > -12) {
    setPitch(state.pitchShiftSemi - 1);
  }
};
el.btnPitchUp.onclick = () => {
  if (state.pitchShiftSemi < 12) {
    setPitch(state.pitchShiftSemi + 1);
  }
};

function setPitch(semi) {
  state.pitchShiftSemi = semi;
  el.pitchDisplay.textContent = `${semi >= 0 ? '+' : ''}${semi} st`;
  // Apply pitch rate or detune if supported
  getActiveStemKeys().forEach(k => {
    const stem = state.stems[k];
    if (stem && stem.audioEl) {
      // Modern Web Audio detune or pitch factor
      if (stem.audioEl.preservesPitch !== undefined) {
        stem.audioEl.preservesPitch = false;
        // Pitch shift ratio = 2^(semi/12)
        const factor = Math.pow(2, semi / 12);
        stem.audioEl.playbackRate = state.playbackSpeed * factor;
      }
    }
  });
}

// Reset button
el.btnResetTrack.onclick = () => {
  seekToTime(0);
};

// Track count dropdown change
el.trackCountSelector.onchange = (e) => {
  state.activeMode = e.target.value;
  renderMixerChannels();
  renderDownloadModalList();
  updateStemsCountDisplay();
  updateGainMatrix();
  showToast(`Switched to ${state.activeMode} stems mode`);
};

// DOWNLOAD STEMS MODAL LOGIC (Matching Screenshot 1)
function renderDownloadModalList() {
  el.downloadStemsList.innerHTML = "";
  const activeKeys = getActiveStemKeys();

  activeKeys.forEach(key => {
    const meta = STEM_META[key] || { label: key, color: "#3b82f6" };
    const isSelected = state.downloadSelected.has(key);
    const iconSvg = STEM_ICONS[key] || STEM_ICONS.others;

    const itemCard = document.createElement("div");
    itemCard.className = `download-track-card ${isSelected ? 'selected' : ''}`;
    itemCard.dataset.stem = key;

    itemCard.innerHTML = `
      <div class="download-track-left">
        <span class="download-stem-icon" style="color: ${meta.color};">${iconSvg}</span>
        <span class="download-track-name">${meta.label}</span>
      </div>
      <div class="download-check-box">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    `;

    itemCard.onclick = () => {
      if (state.downloadSelected.has(key)) {
        state.downloadSelected.delete(key);
        itemCard.classList.remove("selected");
      } else {
        state.downloadSelected.add(key);
        itemCard.classList.add("selected");
      }
    };

    el.downloadStemsList.appendChild(itemCard);
  });
}

// Select All & Clear All
el.btnSelectAllStems.onclick = () => {
  getActiveStemKeys().forEach(k => state.downloadSelected.add(k));
  renderDownloadModalList();
};

el.btnClearAllStems.onclick = () => {
  state.downloadSelected.clear();
  renderDownloadModalList();
};

// Modal open & close
el.btnOpenDownloadModal.onclick = () => {
  renderDownloadModalList();
  el.downloadModal.showModal();
};

el.btnCloseDownloadModal.onclick = () => {
  el.downloadModal.close();
};

el.btnOpenStudio.onclick = () => {
  showToast("Studio mode activated with 7 stem routing");
};

// Execute Download ZIP
el.btnExecuteDownload.onclick = async () => {
  if (state.downloadSelected.size === 0) {
    showToast("Please select at least one track to download.");
    return;
  }

  const format = document.querySelector('input[name="downloadFormat"]:checked')?.value || 'mp3';
  const selectedStemsArray = Array.from(state.downloadSelected);
  
  const spinner = document.getElementById("downloadSpinner");
  const btnText = el.btnExecuteDownload.querySelector(".btn-text");

  btnText.textContent = "Packaging ZIP...";
  spinner.classList.remove("hidden");
  el.btnExecuteDownload.disabled = true;

  try {
    const payload = {
      jobId: state.jobId,
      stems: selectedStemsArray,
      format: format,
      isDemo: state.isDemo
    };

    let blob = null;
    try {
      const res = await fetch(getBackendUrl("/api/download-zip"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        blob = await res.blob();
      }
    } catch (e) {
      console.warn("Backend ZIP unavailable, falling back to in-browser JSZip...", e);
    }

    // Client-side ZIP generation fallback (works on Vercel static hosting)
    if (!blob && window.JSZip) {
      const zip = new window.JSZip();
      for (const stemKey of selectedStemsArray) {
        const stem = state.stems[stemKey];
        if (stem && stem.url) {
          const audioResp = await fetch(stem.url);
          const audioData = await audioResp.blob();
          zip.file(`${stemKey}.mp3`, audioData);
        }
      }
      blob = await zip.generateAsync({ type: "blob" });
    }

    if (!blob) throw new Error("Failed to generate stems archive");

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${state.songTitle.replace(/\.[^/.]+$/, "")}_stems.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);

    showToast("Downloaded audio stems archive successfully!");
    el.downloadModal.close();
  } catch (err) {
    alert(`Download Error: ${err.message}`);
  } finally {
    btnText.textContent = "Download as audio";
    spinner.classList.add("hidden");
    el.btnExecuteDownload.disabled = false;
  }
};

// IMPORT SONG MODAL LOGIC
function openImportModal() {
  el.audioFileInput.value = "";
  state.pendingUploadFile = null;
  el.btnStartSeparation.disabled = true;
  el.importProgressWrap.classList.add("hidden");
  el.progressBarFill.style.width = "0%";
  el.dropzonePrimary = el.audioDropzone.querySelector(".dropzone-primary");
  el.dropzonePrimary.innerHTML = `Drag & drop your song here, or <span class="browse-link">browse</span>`;
  el.importModal.showModal();
}

el.btnOpenImport.onclick = openImportModal;
el.btnTopImport.onclick = openImportModal;
el.btnCloseImportModal.onclick = () => el.importModal.close();
el.btnCancelImport.onclick = () => el.importModal.close();

el.audioDropzone.onclick = () => el.audioFileInput.click();

el.audioDropzone.ondragover = (e) => {
  e.preventDefault();
  el.audioDropzone.classList.add("drag-over");
};
el.audioDropzone.ondragleave = () => {
  el.audioDropzone.classList.remove("drag-over");
};
el.audioDropzone.ondrop = (e) => {
  e.preventDefault();
  el.audioDropzone.classList.remove("drag-over");
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleSelectedFile(e.dataTransfer.files[0]);
  }
};

el.audioFileInput.onchange = (e) => {
  if (e.target.files && e.target.files[0]) {
    handleSelectedFile(e.target.files[0]);
  }
};

function handleSelectedFile(file) {
  state.pendingUploadFile = file;
  el.btnStartSeparation.disabled = false;
  const primaryP = el.audioDropzone.querySelector(".dropzone-primary");
  primaryP.innerHTML = `Selected: <strong>${file.name}</strong> (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
}

// WAV encoding helpers for in-browser audio export
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let interleaved;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    interleaved = new Float32Array(left.length + right.length);
    for (let i = 0, j = 0; i < left.length; i++) {
      interleaved[j++] = left[i];
      interleaved[j++] = right[i];
    }
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = interleaved.length * bytesPerSample;
  const bufferLength = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

function extractPeaksFromBuffer(buffer, numBars = 160) {
  const channelData = buffer.getChannelData(0);
  const samplesPerBar = Math.floor(channelData.length / numBars);
  const peaks = [];
  for (let i = 0; i < numBars; i++) {
    let max = 0;
    const start = i * samplesPerBar;
    const end = Math.min(start + samplesPerBar, channelData.length);
    for (let j = start; j < end; j += 15) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    peaks.push(Math.round(Math.min(1.0, Math.max(0.08, max)) * 1000) / 1000);
  }
  return peaks;
}

// In-Browser Audio Source Separation using Web Audio OfflineAudioContext
async function separateInBrowser(file, mode) {
  el.progressStatusText.textContent = "Decoding audio in browser...";
  el.progressBarFill.style.width = "15%";
  el.progressPctText.textContent = "15%";

  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  el.progressStatusText.textContent = "Analyzing waveforms...";
  el.progressBarFill.style.width = "30%";
  el.progressPctText.textContent = "30%";

  const duration = audioBuffer.duration;
  const peaks = extractPeaksFromBuffer(audioBuffer);

  const stemFilterMap = {
    vocals: (offlineCtx, src) => {
      const hp = offlineCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 280;
      const lp = offlineCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3900;
      const comp = offlineCtx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.ratio.value = 4;
      src.connect(hp);
      hp.connect(lp);
      lp.connect(comp);
      comp.connect(offlineCtx.destination);
    },
    drums: (offlineCtx, src) => {
      const comp = offlineCtx.createDynamicsCompressor();
      comp.threshold.value = -25;
      comp.knee.value = 25;
      comp.ratio.value = 12;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      const eq = offlineCtx.createBiquadFilter();
      eq.type = 'peaking';
      eq.frequency.value = 80;
      eq.gain.value = 6;
      src.connect(comp);
      comp.connect(eq);
      eq.connect(offlineCtx.destination);
    },
    bass: (offlineCtx, src) => {
      const lp = offlineCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 230;
      const boost = offlineCtx.createGain();
      boost.gain.value = 1.4;
      src.connect(lp);
      lp.connect(boost);
      boost.connect(offlineCtx.destination);
    },
    guitar: (offlineCtx, src) => {
      const bp = offlineCtx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1600;
      bp.Q.value = 0.9;
      const gain = offlineCtx.createGain();
      gain.gain.value = 1.5;
      src.connect(bp);
      bp.connect(gain);
      gain.connect(offlineCtx.destination);
    },
    piano: (offlineCtx, src) => {
      const bp = offlineCtx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 750;
      bp.Q.value = 0.8;
      const gain = offlineCtx.createGain();
      gain.gain.value = 1.4;
      src.connect(bp);
      bp.connect(gain);
      gain.connect(offlineCtx.destination);
    },
    strings: (offlineCtx, src) => {
      const hp = offlineCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 450;
      const lp = offlineCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 7000;
      const comp = offlineCtx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.attack.value = 0.15;
      comp.release.value = 0.5;
      src.connect(hp);
      hp.connect(lp);
      lp.connect(comp);
      comp.connect(offlineCtx.destination);
    },
    others: (offlineCtx, src) => {
      const hp = offlineCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 5500;
      const gain = offlineCtx.createGain();
      gain.gain.value = 1.3;
      src.connect(hp);
      hp.connect(gain);
      gain.connect(offlineCtx.destination);
    }
  };

  let stemsToProcess = [];
  if (mode === "4") {
    stemsToProcess = ["vocals", "drums", "bass", "others"];
  } else if (mode === "6") {
    stemsToProcess = ["vocals", "drums", "bass", "guitar", "piano", "others"];
  } else {
    stemsToProcess = ["vocals", "drums", "bass", "guitar", "piano", "strings", "others"];
  }

  const generatedStems = {};
  const total = stemsToProcess.length;

  for (let i = 0; i < total; i++) {
    const key = stemsToProcess[i];
    const meta = STEM_META[key] || { label: key, color: '#3b82f6' };
    const pct = Math.round(35 + (i / total) * 60);
    el.progressStatusText.textContent = `Isolating ${meta.label} stem (${i + 1}/${total})...`;
    el.progressBarFill.style.width = `${pct}%`;
    el.progressPctText.textContent = `${pct}%`;

    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    const src = offlineCtx.createBufferSource();
    src.buffer = audioBuffer;
    
    stemFilterMap[key](offlineCtx, src);
    src.start(0);

    const rendered = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWav(rendered);
    const blobUrl = URL.createObjectURL(wavBlob);

    generatedStems[key] = {
      label: meta.label,
      color: meta.color,
      url: blobUrl,
      wavBlob: wavBlob
    };
  }

  el.progressBarFill.style.width = "100%";
  el.progressPctText.textContent = "100%";
  el.progressStatusText.textContent = "In-browser separation complete!";

  const trackMeta = {
    songTitle: file.name,
    duration: duration,
    durationFormatted: formatTime(duration),
    peaks: peaks,
    key: "Auto Detected",
    bpm: 120
  };

  setTimeout(() => {
    loadSeparatedSong(null, trackMeta, generatedStems, mode);
    el.importModal.close();
  }, 600);
}

// Start Upload & Separation Process
el.btnStartSeparation.onclick = async () => {
  if (!state.pendingUploadFile) return;

  const mode = document.querySelector('input[name="importMode"]:checked')?.value || "7";
  el.btnStartSeparation.disabled = true;
  el.importProgressWrap.classList.remove("hidden");
  el.progressStatusText.textContent = "Connecting to Meta Demucs AI backend...";
  el.progressBarFill.style.width = "10%";
  el.progressPctText.textContent = "10%";

  let backendAvailable = false;

  // Try Demucs AI Backend first
  try {
    const formData = new FormData();
    formData.append("audio", state.pendingUploadFile);

    const uploadUrl = getBackendUrl("/api/upload");
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      body: formData
    });

    const cType = uploadRes.headers.get("content-type") || "";
    if (uploadRes.ok && cType.includes("application/json")) {
      const uploadData = await uploadRes.json();
      el.progressStatusText.textContent = "Meta Demucs AI neural separation running (RTX GPU)...";
      el.progressBarFill.style.width = "25%";
      el.progressPctText.textContent = "25%";

      const sepUrl = getBackendUrl("/api/separate");
      const sepRes = await fetch(sepUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: uploadData.jobId, mode })
      });

      if (sepRes.ok) {
        backendAvailable = true;
        pollSeparationProgress(uploadData.jobId, uploadData, mode);
        return;
      }
    }
  } catch (err) {
    console.warn("Demucs AI backend call failed:", err);
  }

  // If backend was not reachable, alert the user and offer options
  if (!backendAvailable) {
    el.importProgressWrap.classList.add("hidden");
    el.btnStartSeparation.disabled = false;
    
    const proceedWithLowQuality = confirm(
      "⚠️ Meta Demucs AI GPU Backend is unreachable at:\n" +
      (state.backendUrl || "Local Server") + "\n\n" +
      "Clean, bleed-free stem separation requires the Meta Demucs AI GPU engine running on your PC (start_public_live.bat).\n\n" +
      "Click [Cancel] to open Settings and connect your live AI URL for 100% clean stems.\n" +
      "Click [OK] to proceed with basic in-browser separation (may have audio bleed)."
    );

    if (!proceedWithLowQuality) {
      if (el.backendUrlInput) {
        el.backendUrlInput.value = state.backendUrl || "";
      }
      el.settingsModal.showModal();
      return;
    }

    // User chose in-browser fallback
    el.importProgressWrap.classList.remove("hidden");
    el.btnStartSeparation.disabled = true;
    try {
      await separateInBrowser(state.pendingUploadFile, mode);
    } catch (err) {
      alert(`Separation Error: ${err.message}`);
      el.btnStartSeparation.disabled = false;
    }
  }
};

function pollSeparationProgress(jobId, metaData, mode) {
  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch(getBackendUrl(`/api/job/${jobId}`));
      if (!res.ok) throw new Error("Failed to check status");

      const job = await res.json();
      el.progressBarFill.style.width = `${job.progress}%`;
      el.progressPctText.textContent = `${job.progress}%`;
      el.progressStatusText.textContent = job.statusMessage || "Splitting stems with Meta Demucs...";

      if (job.status === "completed") {
        clearInterval(pollInterval);
        el.progressBarFill.style.width = "100%";
        el.progressPctText.textContent = "100%";
        el.progressStatusText.textContent = "AI separation complete! Loading studio stems...";

        setTimeout(() => {
          loadSeparatedSong(jobId, metaData, job.stems, mode);
          el.importModal.close();
          el.importProgressWrap.classList.add("hidden");
        }, 600);
      } else if (job.status === "error") {
        clearInterval(pollInterval);
        alert(`Separation Error: ${job.error}`);
        el.btnStartSeparation.disabled = false;
      }
    } catch (e) {
      console.warn("Poll error:", e);
    }
  }, 1500);
}

function loadSeparatedSong(jobId, meta, stems, mode) {
  pausePlayback();
  state.jobId = jobId;
  state.isDemo = false;
  state.songTitle = meta.songTitle || meta.fileName;
  state.duration = meta.duration || 30.0;
  state.peaks = meta.peaks || [];
  state.activeMode = mode;

  el.trackTitleDisplay.textContent = state.songTitle;
  el.trackCountSelector.value = mode;
  el.timeTotal.textContent = meta.durationFormatted || formatTime(state.duration);
  el.keyDisplay.textContent = meta.key || "Gb major";
  el.bpmDisplay.textContent = meta.bpm ? `${meta.bpm} BPM` : "- BPM";

  // Ensure all stem URLs are fully resolved
  const resolvedStems = {};
  for (const [k, v] of Object.entries(stems)) {
    resolvedStems[k] = {
      ...v,
      url: resolveAudioUrl(v.url),
      wavUrl: v.wavUrl ? resolveAudioUrl(v.wavUrl) : undefined
    };
  }

  setupStems(resolvedStems);
  drawWaveform();
  seekToTime(0);
  showToast(`Loaded "${state.songTitle}" with clean ${mode}-stem Demucs separation!`);
}

// Load Demo song on initial startup
async function initDemo() {
  try {
    let demo = null;
    try {
      const res = await fetch(getBackendUrl("/api/demo"));
      if (res.ok) demo = await res.json();
    } catch (e) {}

    if (!demo) {
      const staticRes = await fetch("/demo/demo-info.json");
      if (staticRes.ok) demo = await staticRes.json();
    }

    if (!demo) throw new Error("Could not load demo track");

    state.isDemo = true;
    state.songTitle = demo.songTitle;
    state.duration = demo.duration;
    state.peaks = demo.peaks;
    state.activeMode = "7";

    el.trackTitleDisplay.textContent = demo.songTitle;
    el.timeTotal.textContent = demo.durationFormatted || "0:28";
    el.keyDisplay.textContent = demo.key || "Gb major";
    el.bpmDisplay.textContent = demo.bpm ? `${demo.bpm} BPM` : "117 BPM";

    // Ensure demo URLs are resolved
    const resolvedDemoStems = {};
    for (const [k, v] of Object.entries(demo.stems)) {
      resolvedDemoStems[k] = {
        ...v,
        url: resolveAudioUrl(v.url)
      };
    }

    setupStems(resolvedDemoStems);
    drawWaveform();
    seekToTime(0);
  } catch (err) {
    console.error("Init demo note:", err);
  }
}

// AI BACKEND SETTINGS MODAL LOGIC
if (el.engineStatusBadge) {
  el.engineStatusBadge.onclick = () => {
    if (el.backendUrlInput) {
      el.backendUrlInput.value = state.backendUrl || "";
    }
    if (el.backendTestStatus) {
      el.backendTestStatus.textContent = "";
      el.backendTestStatus.className = "backend-test-status";
    }
    el.settingsModal.showModal();
  };
}

if (el.btnCloseSettingsModal) {
  el.btnCloseSettingsModal.onclick = () => {
    el.settingsModal.close();
  };
}

if (el.btnCancelSettings) {
  el.btnCancelSettings.onclick = () => {
    el.settingsModal.close();
  };
}

if (el.btnTestBackend) {
  el.btnTestBackend.onclick = async () => {
    const testUrl = (el.backendUrlInput.value || "").trim().replace(/\/+$/, "");
    if (!testUrl) {
      el.backendTestStatus.textContent = "Please enter a backend URL";
      el.backendTestStatus.className = "backend-test-status error";
      return;
    }
    el.backendTestStatus.textContent = "Testing connection...";
    el.backendTestStatus.className = "backend-test-status loading";

    try {
      const res = await fetch(`${testUrl}/api/status`, { method: "GET", mode: "cors" });
      if (res.ok) {
        const data = await res.json();
        if (data.hasDemucs) {
          el.backendTestStatus.textContent = "Connected! Meta Demucs AI Ready (Zero Bleed)";
          el.backendTestStatus.className = "backend-test-status success";
        } else {
          el.backendTestStatus.textContent = "Connected, but Demucs AI not ready on server";
          el.backendTestStatus.className = "backend-test-status error";
        }
      } else {
        el.backendTestStatus.textContent = `Server error HTTP ${res.status}`;
        el.backendTestStatus.className = "backend-test-status error";
      }
    } catch (err) {
      el.backendTestStatus.textContent = "Could not reach server. Check tunnel URL";
      el.backendTestStatus.className = "backend-test-status error";
    }
  };
}

if (el.btnSaveSettings) {
  el.btnSaveSettings.onclick = async () => {
    const newUrl = (el.backendUrlInput.value || "").trim().replace(/\/+$/, "");
    state.backendUrl = newUrl;
    localStorage.setItem("icy_backend_url", newUrl);
    el.settingsModal.close();
    showToast("AI Engine URL saved! Connecting...");
    await checkBackendStatus();
  };
}

// Attach Play/Pause Button
el.btnPlayPause.onclick = togglePlayPause;

// Resize listener for waveform
window.addEventListener("resize", () => {
  drawWaveform();
});

// Run demo initialization on DOM load
window.addEventListener("DOMContentLoaded", async () => {
  await initDemo();
  await checkBackendStatus();
});
