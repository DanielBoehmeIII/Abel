#!/usr/bin/env bash
# Hero animation pipeline — encode, inspect, and scrub any .mp4 for web playback.
#
# Usage:
#   ./scrub_frames.sh web     <input.mp4> [max_width]   # 1080p H.264 faststart (default 1920)
#   ./scrub_frames.sh poster  <input.mp4> [time]        # extract frame as JPEG (default: 0.5s)
#   ./scrub_frames.sh probe   <input.mp4>               # show codec/resolution/bitrate
#   ./scrub_frames.sh extract <input.mp4> [fps]         # extract PNG frames (default 24fps)
#   ./scrub_frames.sh sheet   <input.mp4> [fps]         # contact sheet of frames
#   ./scrub_frames.sh rebuild <name-no-ext> [fps]       # rebuild MP4 from frames/name/ PNGs
#
# Web encode targets Netflix-style hero quality:
#   - H.264 high profile for max browser compat
#   - CRF 20 (visually lossless at 1080p)
#   - -preset slow for best compression ratio
#   - -movflags +faststart: moov atom first, plays before full download
#   - 1920 x auto scale (or custom max_width); forces even pixel dimensions
#   - yuv420p: required for Safari / iOS hardware decode
#   - No audio track (hero videos are always muted)
#
# Drop any .mp4 into animations/ and run web to get a browser-ready hero.

set -euo pipefail

MODE="${1:-}"
INPUT="${2:-}"

if [ -z "$MODE" ] || ([ "$MODE" != "help" ] && [ "$MODE" != "--help" ] && [ "$MODE" != "-h" ] && [ -z "$INPUT" ]); then
  echo "Usage:"
  echo "  $0 web     <input.mp4> [max_width]"
  echo "  $0 poster  <input.mp4> [time_secs]"
  echo "  $0 probe   <input.mp4>"
  echo "  $0 extract <input.mp4> [fps]"
  echo "  $0 sheet   <input.mp4> [fps]"
  echo "  $0 rebuild <name-no-ext> [fps]"
  exit 1
fi

BASE="$(basename "${INPUT:-}")"
NAME="${BASE%.*}"
FRAMES_DIR="frames/$NAME"

# ── Helpers ───────────────────────────────────────────────────────────────────

require_input() {
  if [ ! -f "$INPUT" ]; then
    echo "Error: file not found: $INPUT"
    exit 1
  fi
}

video_info() {
  ffprobe -v quiet -print_format json -show_streams "$1" 2>/dev/null \
    | python3 -c "
import json, sys
d = json.load(sys.stdin)
for s in d['streams']:
    if s.get('codec_type') == 'video':
        br = s.get('bit_rate','?')
        br_mb = f'{int(br)//1_000_000:.1f} Mbps' if br != '?' else '?'
        dur = float(s.get('duration', 0))
        print(f'  codec:    {s.get(\"codec_name\",\"?\")}')
        print(f'  size:     {s.get(\"width\",\"?\")}x{s.get(\"height\",\"?\")}')
        print(f'  fps:      {s.get(\"r_frame_rate\",\"?\")}')
        print(f'  bitrate:  {br_mb}')
        print(f'  duration: {dur:.2f}s')
        print(f'  pix_fmt:  {s.get(\"pix_fmt\",\"?\")}')
"
}

# ── Commands ──────────────────────────────────────────────────────────────────

case "$MODE" in

# ---------------------------------------------------------------------------
# web — 1080p H.264 optimised for browser streaming
# ---------------------------------------------------------------------------
web)
  require_input
  MAX_W="${3:-1920}"
  OUT="${NAME}_web.mp4"

  echo "Web-encoding: $INPUT"
  echo "  target width : max ${MAX_W}px (height auto, even dimensions enforced)"
  echo "  output       : $OUT"
  echo ""

  # Scale to fit MAX_W, keep aspect ratio.
  # scale=-2 ensures height is divisible by 2 (required for yuv420p).
  VF="scale='min(${MAX_W},iw)':-2"

  ffmpeg -y -i "$INPUT" \
    -vf "$VF" \
    -c:v libx264 \
    -profile:v high \
    -level:v 4.0 \
    -preset slow \
    -crf 20 \
    -pix_fmt yuv420p \
    -movflags +faststart \
    -an \
    "$OUT"

  echo ""
  echo "Done: $OUT"
  echo ""
  video_info "$OUT"

  SIZE_IN=$(  du -sh "$INPUT" | cut -f1)
  SIZE_OUT=$( du -sh "$OUT"   | cut -f1)
  echo ""
  echo "  original : $SIZE_IN"
  echo "  web      : $SIZE_OUT"
  ;;

# ---------------------------------------------------------------------------
# poster — extract a single frame as a JPEG hero poster image
# ---------------------------------------------------------------------------
poster)
  require_input
  TIME="${3:-0.5}"
  OUT="${NAME}_poster.jpg"

  echo "Extracting poster frame at ${TIME}s from $INPUT..."

  ffmpeg -y -ss "$TIME" -i "$INPUT" \
    -vframes 1 \
    -vf "scale='min(1920,iw)':-2" \
    -q:v 2 \
    "$OUT"

  echo "Done: $OUT  ($(du -sh "$OUT" | cut -f1))"
  ;;

# ---------------------------------------------------------------------------
# probe — print codec / resolution / bitrate summary
# ---------------------------------------------------------------------------
probe)
  require_input
  echo "=== $INPUT  ($(du -sh "$INPUT" | cut -f1)) ==="
  video_info "$INPUT"
  ;;

# ---------------------------------------------------------------------------
# extract — dump PNG frames for scrub sequences or manual editing
# ---------------------------------------------------------------------------
extract)
  require_input
  FPS="${3:-24}"
  mkdir -p "$FRAMES_DIR"

  echo "Extracting frames from $INPUT  fps=$FPS  → $FRAMES_DIR/frame_%04d.png"

  ffmpeg -y -i "$INPUT" -vf "fps=$FPS" "$FRAMES_DIR/frame_%04d.png"

  COUNT=$(ls "$FRAMES_DIR"/*.png 2>/dev/null | wc -l)
  echo "Done.  $COUNT frames extracted."
  ;;

# ---------------------------------------------------------------------------
# sheet — tiled contact sheet for quick visual review
# ---------------------------------------------------------------------------
sheet)
  require_input
  FPS="${3:-24}"
  OUT="${NAME}_sheet.png"

  echo "Creating contact sheet for $INPUT  fps=$FPS..."

  ffmpeg -y -i "$INPUT" \
    -vf "fps=$FPS,scale=320:-1,tile=5x6" \
    "$OUT"

  echo "Done: $OUT"
  ;;

# ---------------------------------------------------------------------------
# rebuild — reassemble edited PNGs back into a web-ready MP4
# ---------------------------------------------------------------------------
rebuild)
  FPS="${3:-24}"

  if [ ! -d "$FRAMES_DIR" ]; then
    echo "Frames folder not found: $FRAMES_DIR"
    exit 1
  fi

  OUT="${NAME}_rebuilt.mp4"
  echo "Rebuilding from $FRAMES_DIR  fps=$FPS  → $OUT"

  ffmpeg -y -framerate "$FPS" \
    -i "$FRAMES_DIR/frame_%04d.png" \
    -c:v libx264 \
    -profile:v high \
    -level:v 4.0 \
    -preset slow \
    -crf 20 \
    -pix_fmt yuv420p \
    -movflags +faststart \
    -an \
    "$OUT"

  echo "Done: $OUT"
  echo ""
  video_info "$OUT"
  ;;

# ---------------------------------------------------------------------------
# help
# ---------------------------------------------------------------------------
help|--help|-h)
  sed -n '2,/^set -/{ /^set -/d; s/^# \?//; p }' "$0"
  ;;

*)
  echo "Unknown mode: $MODE"
  echo "Run: $0 help"
  exit 1
  ;;

esac
