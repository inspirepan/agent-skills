---
name: download-youtube-subtitles
description: This skill should be used when the user asks to "download YouTube subtitles", "get subtitles from video", or sends a message like "download subtitles https://youtube.com/..." or uses Chinese phrases like "下载字幕", "获取字幕". The skill downloads auto-generated subtitles from YouTube videos.
---

# Download YouTube Subtitles

Download auto-generated subtitles from YouTube videos in SRT format.

## Usage

Run the bundled script to download subtitles:

```bash
~/.klaude/skills/download-youtube-subtitles/scripts/download_subtitles.sh "VIDEO_URL" [output_dir]
```

The script will:
- Auto-install yt-dlp if not present (via brew or uv)
- Fetch video metadata (ID, title, uploader)
- Download auto-generated subtitles in SRT format
- Prefer English subtitles, fallback to Chinese or any available language
- Output the path to the downloaded SRT file

Report the download result to the user, including the file path.
