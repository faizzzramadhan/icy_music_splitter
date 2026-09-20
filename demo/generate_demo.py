"""
Ultra-fast vectorized demo generator using NumPy for ICY MUSIC SPLITTER.
Produces:
- Vocals
- Drums
- Bass
- Guitar
- Piano
- Strings
- Others
- Master Mix (act viii_ i hate to be alone.mp3)
"""
import os
import subprocess
import numpy as np
import wave

DEMO_DIR = os.path.dirname(os.path.abspath(__file__))
SAMPLE_RATE = 44100
DURATION = 28.0  # 28 seconds demo
BPM = 120
BEAT_DUR = 60.0 / BPM  # 0.5s

def generate():
    t = np.linspace(0, DURATION, int(SAMPLE_RATE * DURATION), endpoint=False)
    n_samples = len(t)
    
    # 1. DRUMS
    drums = np.zeros(n_samples, dtype=np.float32)
    beat_t = t % BEAT_DUR
    beat_idx = (t / BEAT_DUR).astype(int)
    
    # Kick on beat 0 and 2
    kick_mask = np.isin(beat_idx % 4, [0, 2]) & (beat_t < 0.22)
    k_env = np.exp(-beat_t * 18.0)
    k_freq = 120.0 * np.exp(-beat_t * 22.0) + 42.0
    drums += (kick_mask * 0.85 * k_env * np.sin(2 * np.pi * k_freq * beat_t)).astype(np.float32)
    
    # Snare on beat 1 and 3
    snare_mask = np.isin(beat_idx % 4, [1, 3]) & (beat_t < 0.25)
    s_env = np.exp(-beat_t * 16.0)
    s_tone = np.sin(2 * np.pi * 185.0 * beat_t) * 0.4
    s_noise = np.random.uniform(-0.6, 0.6, n_samples)
    drums += (snare_mask * s_env * (s_tone + s_noise)).astype(np.float32)
    
    # Hi-hat on 8th notes
    hh_t = t % (BEAT_DUR / 2.0)
    hh_mask = hh_t < 0.06
    hh_noise = np.random.uniform(-0.3, 0.3, n_samples) * np.exp(-hh_t * 70.0)
    drums += (hh_mask * hh_noise).astype(np.float32)

    # Chords in Gb Major: Gb (185.0), Db (138.59), Ebm (155.56), B (123.47)
    chord_len = 4 * BEAT_DUR  # 2.0s
    prog_len = 4 * chord_len  # 8.0s
    t_prog = t % prog_len
    chord_idx = (t_prog / chord_len).astype(int)
    t_chord = t_prog % chord_len
    
    roots = np.array([185.00, 138.59, 155.56, 123.47])
    current_root = roots[chord_idx]

    # 2. BASS
    bass = np.zeros(n_samples, dtype=np.float32)
    # Syncopated bass pulse
    b_step = t_chord % 0.5
    b_env = np.exp(-b_step * 6.5)
    bass += (0.7 * b_env * (np.sin(2 * np.pi * (current_root / 2.0) * t) + 
             0.35 * np.sin(2 * np.pi * current_root * t))).astype(np.float32)

    # 3. PIANO
    # Triad chords on beats
    p_step = t_chord % 0.5
    p_env = np.exp(-p_step * 8.0)
    piano = np.zeros(n_samples, dtype=np.float32)
    # Gb major chords
    for semi in [0, 4, 7, 11]:
        freq = current_root * (2.0 ** (semi / 12.0))
        piano += 0.18 * p_env * np.sin(2 * np.pi * freq * t)

    # 4. GUITAR
    # Arpeggio
    gtr_step = t_chord % 0.25
    gtr_idx = ((t_chord / 0.25).astype(int)) % 4
    gtr_offsets = np.array([0, 7, 12, 16])
    gtr_freq = current_root * (2.0 ** (gtr_offsets[gtr_idx] / 12.0))
    gtr_env = np.exp(-gtr_step * 9.0)
    guitar = (0.28 * gtr_env * (np.sin(2 * np.pi * gtr_freq * t) + 
              0.4 * np.sin(4 * np.pi * gtr_freq * t))).astype(np.float32)

    # 5. STRINGS
    # Smooth swelling orchestral chords
    str_env = 0.5 + 0.5 * np.sin(2 * np.pi * t / chord_len - np.pi/2)
    strings = np.zeros(n_samples, dtype=np.float32)
    for semi in [12, 16, 19, 24]:
        freq = current_root * (2.0 ** (semi / 12.0))
        # vibrato
        vib = 1.0 + 0.006 * np.sin(2 * np.pi * 5.5 * t)
        strings += 0.15 * str_env * np.sin(2 * np.pi * freq * vib * t)

    # 6. VOCALS
    # Soulful synth vocal melody in Gb
    # Notes: Gb4 (369.99), Ab4 (415.3), Bb4 (466.16), Db5 (554.37)
    v_melody = np.array([369.99, 415.30, 466.16, 415.30, 369.99, 311.13, 277.18, 369.99])
    v_step_len = 1.0
    v_idx = ((t % 8.0) / v_step_len).astype(int)
    v_freq = v_melody[v_idx]
    v_t = t % v_step_len
    v_env = np.clip(v_t / 0.08, 0.0, 1.0) * np.clip((v_step_len - v_t) / 0.1, 0.0, 1.0)
    v_vib = 1.0 + 0.008 * np.sin(2 * np.pi * 6.0 * t)
    vocals = (0.42 * v_env * (np.sin(2 * np.pi * v_freq * v_vib * t) + 
              0.35 * np.sin(4 * np.pi * v_freq * v_vib * t) +
              0.15 * np.sin(6 * np.pi * v_freq * v_vib * t))).astype(np.float32)

    # 7. OTHERS
    # Ambient risers & reverb bells
    sweep_t = t % 8.0
    sweep_mask = sweep_t > 5.5
    sweep_p = np.clip((sweep_t - 5.5) / 2.5, 0.0, 1.0)
    sweep_f = 250.0 + sweep_p * 2800.0
    riser = sweep_mask * 0.18 * sweep_p * np.sin(2 * np.pi * sweep_f * t)
    bell_f = 1174.66
    bell_env = np.exp(-(t_chord % 1.0) * 4.0)
    bell = 0.12 * bell_env * np.sin(2 * np.pi * bell_f * t)
    others = (riser + bell).astype(np.float32)

    # Stems dict
    stems = {
        'vocals': vocals,
        'drums': drums,
        'bass': bass,
        'guitar': guitar,
        'piano': piano,
        'strings': strings,
        'others': others
    }

    # Master mix
    master = sum(stems.values())
    max_amp = max(np.max(np.abs(master)), 0.001)
    scale = 0.92 / max_amp
    master *= scale
    for k in stems:
        stems[k] *= scale

    def save_wav(name, audio):
        path = os.path.join(DEMO_DIR, f"{name}.wav")
        audio_int = np.clip(audio * 32767.0, -32767.0, 32767.0).astype(np.int16)
        stereo = np.column_stack((audio_int, audio_int))
        with wave.open(path, 'wb') as wf:
            wf.setnchannels(2)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes(stereo.tobytes())
        return path

    print("Saving WAV stems...")
    master_path = save_wav("master", master)
    for k in stems:
        save_wav(k, stems[k])

    print("Converting to MP3 via ffmpeg...")
    mp3_target = os.path.join(DEMO_DIR, "act viii_ i hate to be alone.mp3")
    subprocess.run(["ffmpeg", "-y", "-i", master_path, "-b:a", "192k", mp3_target], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for k in stems:
        stem_wav = os.path.join(DEMO_DIR, f"{k}.wav")
        stem_mp3 = os.path.join(DEMO_DIR, f"{k}.mp3")
        subprocess.run(["ffmpeg", "-y", "-i", stem_wav, "-b:a", "192k", stem_mp3], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    print("Done! All demo stems created successfully.")

if __name__ == '__main__':
    generate()
