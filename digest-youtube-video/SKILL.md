---
name: Digest YouTube Video
description: This skill should be used when the user asks to "digest a YouTube video", "interpret this video", "summarize this YouTube video", or sends a message like "explain this video https://youtube.com/..." or uses Chinese phrases like "解读这个视频", "分析这个视频", "总结这个视频". The skill downloads subtitles and transforms video content into a comprehensive blog-style article.
---

# Digest YouTube Video

Transform YouTube video content into comprehensive, readable articles by downloading and analyzing subtitles.

## Workflow

### Step 1: Download Subtitles

Run the bundled script to download subtitles:

```bash
~/.klaude/skills/digest-youtube-video/scripts/download_subtitles.sh "VIDEO_URL" [output_dir]
```

The script will:
- Auto-install yt-dlp if not present (via brew or uv)
- Fetch video metadata (ID, title, uploader)
- Download auto-generated subtitles in SRT format
- Output the path to the downloaded SRT file

### Step 2: Analyze Subtitles

Read the downloaded SRT file and rewrite the video content into a "reading version" article, organized by thematic sections. The goal is to allow readers to fully understand the video content through reading alone, as if reading a blog post version of the video.

## Analysis Output Template

### 1. Metadata

- Title (from video)
- Author (from video uploader)
- URL (the original video link)

### 2. Overview

Write a single paragraph that highlights the core thesis and conclusions of the video.

### 3. Thematic Sections

Organize content by themes derived from the video:

- Each section must be detailed enough that the reader does not need to watch the video for details
- Each section should be at least 500 words
- If methods/frameworks/processes appear, rewrite them as clear steps or structured paragraphs
- Preserve key numbers, definitions, and original quotes with annotations in parentheses where needed

### 4. Framework & Mindset

Extract abstract frameworks and mental models from the video:

- Identify reusable frameworks, methodologies, or thinking patterns
- Rewrite each as clear, structured steps or paragraphs
- Each framework/mindset section should be at least 500 words

## Style and Constraints

- Never over-condense content - expand thoroughly
- Do not add facts not present in the video
- If expressions are ambiguous, preserve original meaning and note uncertainty
- Keep technical terms in English with Chinese translations in parentheses
- Do not explicitly show requirements like "> 500 words" in output
- Break long paragraphs into multiple logical paragraphs using bullet points
- Think in English, respond in Chinese, preserve English technical terms
