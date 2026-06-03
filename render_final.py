"""
DREADNOUGHT — Final Video Render Script
Run from E:\STORM-PLATFORM with:
    python render_final.py
Requires ffmpeg in PATH. Output: DREADNOUGHT_DEMO_FINAL.mp4
"""
import subprocess, os, sys, shutil

# ── INPUT FILES (must be in same directory as this script) ──────────────────
SCREEN  = r"2026-05-10 18-19-01.mp4"       # 37.633s screen recording
WEBCAM  = r"WIN_20260510_18_52_47_Pro.mp4"  # 70.294s webcam

# ── OUTPUT ───────────────────────────────────────────────────────────────────
FINAL   = "DREADNOUGHT_DEMO_FINAL.mp4"
TMP     = "tmp_render"

# ── FONTS (Windows Arial — always present) ────────────────────────────────────
BOLD    = "C:/Windows/Fonts/arialbd.ttf"
REGULAR = "C:/Windows/Fonts/arial.ttf"

# ── COLOR GRADE ───────────────────────────────────────────────────────────────
GRADE = ("eq=contrast=1.06:brightness=-0.015:saturation=0.87,"
         "colorbalance=rs=-0.04:gs=-0.01:bs=0.05")

def alpha(S, E):
    """Fade-in 0.5s at S, hold, fade-out 0.5s before E."""
    s, e = float(S), float(E)
    return (f"if(lt(t,{s}),0,"
            f"if(lt(t,{s+0.5}),(t-{s})/0.5,"
            f"if(lt(t,{e-0.5}),1,"
            f"if(lt(t,{e}),({e}-t)/0.5,0))))")

def dt(font, text, color, size, y_expr, S, E, box=True):
    box_str = ":box=1:boxcolor=0x00000077:boxborderw=14" if box else ""
    return (f"drawtext=fontfile={font}"
            f":text='{text}'"
            f":fontcolor={color}:fontsize={size}"
            f":x=(w-text_w)/2:y={y_expr}"
            f":alpha='{alpha(S, E)}'"
            f"{box_str}")

def run(cmd, label):
    print(f"\n[{label}] Starting...")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"[{label}] FAILED:\n{r.stderr[-3000:]}")
        sys.exit(1)
    print(f"[{label}] Done.")

os.makedirs(TMP, exist_ok=True)

# ── SEGMENT 1 ─────────────────────────────────────────────────────────────────
# Webcam 0–14s. Two overlays. Color grade.
print("=" * 60)
print("SEGMENT 1 — Webcam intro (0-14s)")
s1_overlays = ",".join([
    dt(REGULAR, "60 days. Rs.50 lakh. One legal adjudication.",
       "white", 36, "h-130", 1.0, 8.5),
    dt(BOLD,    "Watch.",
       "0x22C97A", 52, "h-72", 9.0, 13.5),
])
s1_vf = f"[0:v]{GRADE},{s1_overlays}[v]"
run([
    "ffmpeg", "-y",
    "-i", WEBCAM,
    "-filter_complex", s1_vf,
    "-map", "[v]", "-map", "0:a",
    "-c:v", "libx264", "-preset", "fast", "-crf", "20",
    "-c:a", "aac", "-b:a", "192k",
    "-t", "14",
    f"{TMP}/seg1.mp4"
], "SEG1")

# ── SEGMENT 2 ─────────────────────────────────────────────────────────────────
# Screen recording video + webcam audio (from 14s). Three overlays.
print("=" * 60)
print("SEGMENT 2 — Screen demo (37.633s)")
s2_overlays = ",".join([
    dt(REGULAR, "No special format. Just plain English.",
       "white", 36, "h-90", 3.0, 13.0),
    dt(BOLD,    "Peak wind 51.6 m/s  |  Category 3 Hurricane",
       "0x22C97A", 42, "h-90", 19.0, 30.0),
    dt(REGULAR, "Rule 803(8)  |  US Gov Records  |  Court-Admissible",
       "0x4A90E2", 34, "h-90", 31.0, 37.1),
])
s2_vf = f"[0:v]{GRADE},{s2_overlays}[v]"
run([
    "ffmpeg", "-y",
    "-i", SCREEN,
    "-ss", "14", "-i", WEBCAM,
    "-filter_complex", s2_vf,
    "-map", "[v]", "-map", "1:a",
    "-c:v", "libx264", "-preset", "fast", "-crf", "20",
    "-c:a", "aac", "-b:a", "192k",
    "-t", "37.633",
    f"{TMP}/seg2.mp4"
], "SEG2")

# ── SEGMENT 3 ─────────────────────────────────────────────────────────────────
# Webcam 51.633s → 70.294s (18.661s). Two overlays. Color grade.
print("=" * 60)
print("SEGMENT 3 — Webcam close (18.661s)")
s3_overlays = ",".join([
    dt(REGULAR, "60 days. Rs.50 lakh. Replaced by one button.",
       "white", 36, "h-130", 2.0, 10.0),
    dt(BOLD,    "30-day paid pilot. The system is ready. Today.",
       "0x22C97A", 42, "h-72", 12.0, 18.0),
])
s3_vf = f"[0:v]{GRADE},{s3_overlays}[v]"
run([
    "ffmpeg", "-y",
    "-ss", "51.633", "-i", WEBCAM,
    "-filter_complex", s3_vf,
    "-map", "[v]", "-map", "0:a",
    "-c:v", "libx264", "-preset", "fast", "-crf", "20",
    "-c:a", "aac", "-b:a", "192k",
    "-t", "18.661",
    f"{TMP}/seg3.mp4"
], "SEG3")

# ── CONCAT with XFADE ─────────────────────────────────────────────────────────
# Total runtime after xfades: 14 + 37.633 + 18.661 - 2*0.5 = 69.294s
# xfade1 offset = 14 - 0.5 = 13.5s
# xfade2 offset = 13.5 + 37.633 - 0.5 = 50.633s
print("=" * 60)
print("CONCAT — xfade transitions")
concat_fc = (
    "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=13.5[x1v];"
    "[0:a][1:a]acrossfade=d=0.5[x1a];"
    "[x1v][2:v]xfade=transition=fade:duration=0.5:offset=50.633[x2v];"
    "[x1a][2:a]acrossfade=d=0.5[x2a]"
)
run([
    "ffmpeg", "-y",
    "-i", f"{TMP}/seg1.mp4",
    "-i", f"{TMP}/seg2.mp4",
    "-i", f"{TMP}/seg3.mp4",
    "-filter_complex", concat_fc,
    "-map", "[x2v]", "-map", "[x2a]",
    "-c:v", "libx264", "-preset", "fast", "-crf", "20",
    "-c:a", "aac", "-b:a", "192k",
    f"{TMP}/concat.mp4"
], "CONCAT")

# ── FINAL FADE IN / FADE OUT ──────────────────────────────────────────────────
# Total = ~69.294s. Fade-out starts at 67.3s for 1.8s.
print("=" * 60)
print("FINAL — Fade in/out")
run([
    "ffmpeg", "-y",
    "-i", f"{TMP}/concat.mp4",
    "-vf", "fade=t=in:st=0:d=0.6,fade=t=out:st=67.3:d=1.8",
    "-af", "afade=t=in:st=0:d=0.6,afade=t=out:st=67.3:d=1.8",
    "-c:v", "libx264", "-preset", "fast", "-crf", "20",
    "-c:a", "aac", "-b:a", "192k",
    FINAL
], "FINAL EXPORT")

print("\n" + "=" * 60)
print(f"DONE. Output: {FINAL}")
size_mb = os.path.getsize(FINAL) / 1_048_576
print(f"File size: {size_mb:.1f} MB")
