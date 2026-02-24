#!/bin/bash
# Download YouTube video subtitles to SRT format
# Usage: ./download_subtitles.sh <youtube_url> [output_dir]

URL="$1"
OUTPUT_DIR="${2:-.}"

if [[ -z "$URL" ]]; then
    echo "Usage: $0 <youtube_url> [output_dir]"
    exit 1
fi

# Check if yt-dlp is installed, auto-install if not
if ! command -v yt-dlp &> /dev/null; then
    echo "yt-dlp not found, installing..."
    if command -v brew &> /dev/null; then
        brew install yt-dlp
    elif command -v uv &> /dev/null; then
        uv tool install yt-dlp
    else
        echo "Error: No package manager found (brew/uv)"
        exit 1
    fi
fi

mkdir -p "$OUTPUT_DIR"
cd "$OUTPUT_DIR"

echo "Fetching video metadata..."
VIDEO_ID=$(yt-dlp --print "%(id)s" --skip-download "$URL" 2>/dev/null)
TITLE=$(yt-dlp --print "%(title)s" --skip-download "$URL" 2>/dev/null)
UPLOADER=$(yt-dlp --print "%(uploader)s" --skip-download "$URL" 2>/dev/null)

echo "Video ID: $VIDEO_ID"
echo "Title: $TITLE"
echo "Uploader: $UPLOADER"
echo ""

# Sanitize title for use as filename (slug format: lowercase, hyphens only)
SAFE_TITLE=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed "s/['']//g" | sed 's/[^a-z0-9]/-/g' | sed -E 's/-+/-/g' | sed 's/^-//;s/-$//')
# Fallback to VIDEO_ID if title is empty after sanitization
if [[ -z "$SAFE_TITLE" ]]; then
    SAFE_TITLE="$VIDEO_ID"
fi
OUTPUT_TEMPLATE="${SAFE_TITLE}"

# Download auto-generated subtitles in SRT format
echo "Downloading subtitles..."
yt-dlp --write-auto-subs --sub-format srt --skip-download -o "$OUTPUT_TEMPLATE" "$URL" 2>&1 | grep -E "^(\[info\]|WARNING:.*subtitles)" || true

# Check results - look for any .srt file (yt-dlp may use different naming)
echo ""
echo "Downloaded files:"
ls -la *.srt 2>/dev/null || true

# Find .srt file, preferring en-orig > en > zh-Hans > zh-Hant > any
PRIMARY_SRT=""
for lang in "en-orig" "en" "zh-Hans" "zh-Hant"; do
    FOUND=$(ls *."${lang}.srt" 2>/dev/null | head -1)
    if [[ -n "$FOUND" ]]; then
        PRIMARY_SRT="$FOUND"
        break
    fi
done
# Fallback to any .srt file
if [[ -z "$PRIMARY_SRT" ]]; then
    PRIMARY_SRT=$(ls *.srt 2>/dev/null | head -1)
fi

if [[ -n "$PRIMARY_SRT" ]]; then
    echo ""
    echo "Primary subtitle file: $(pwd)/$PRIMARY_SRT"
    exit 0
else
    echo "Error: Failed to download subtitles"
    exit 1
fi
