# 🐱 yt-kitty-automate

An automated Discord bot that collects 5 Instagram cat reels, combines them into a single 1080×1920 vertical video, overlays customizable ranked captions, and uploads the final video to Filebin — all driven from a Discord channel conversation.

---

## 🧠 How It Works

```
Bot comes online
  └─► Prompts Discord channel: "Send the link for Clip 1"
        ↓
  User sends Instagram reel URL
        ↓
  Bot downloads the reel
        ↓
  Bot asks: "Enter the caption for Clip 1"
        ↓
  User types a caption
        ↓
  Repeats for Clips 2 → 5
        ↓
  All 5 clips + captions collected
        ↓
  Clips are combined → 1080×1920 MP4
        ↓
  "RANKING BEST KITTY MOMENTS" header + numbered captions burned in
        ↓
  Video uploaded to Filebin
        ↓
  Bot posts the download link in Discord ✅
```

---

## 📁 Project Structure

```
yt-kitty-automate/
├── main.py                  # Entry point — orchestrates bot + video pipeline
├── setup.py                 # One-time setup: installs ffmpeg, creates .env
├── requirements.txt         # Python dependencies
├── run.sh                   # Quick start script (Linux/macOS)
├── .env                     # Your secrets (not committed)
├── fonts/
│   └── OpenSansExtraBold.ttf
├── buffer/                  # Staging area for downloaded reels (auto-managed)
├── reels_downloads/         # Temporary instaloader download folder (auto-managed)
└── functions/
    ├── discord_bot.py       # Discord bot — interactive conversation flow
    ├── reel_download.py     # Instagram reel downloader (instaloader)
    ├── combine.py           # Combines 5 clips into one vertical MP4 via ffmpeg
    ├── add_text.py          # Burns ranked captions + header onto the video
    ├── get_folders.py       # Scans buffer/ for folders with exactly 5 clips
    └── upload.py            # Uploads final video to Filebin
```

---

## ⚙️ Prerequisites

| Requirement | Notes |
|---|---|
| **Python 3.10+** | Required |
| **ffmpeg** | Installed automatically by `setup.py` |
| **Discord Bot Token** | Create one at [discord.com/developers](https://discord.com/developers/applications) |
| **NVIDIA GPU** *(optional)* | Enables hardware-accelerated encoding (`h264_nvenc`) |

---

## 🚀 Quick Start

### 1. Run setup (installs ffmpeg + creates `.env`)

```bash
python setup.py
```

> Reopen your terminal after this step so ffmpeg is on your PATH.

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Fill in your `.env` file

```env
# Discord Bot Token
DISCORD_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"

# Filebin bin name (used as part of the upload URL)
FILEBIN_KEY="smalltext"

# Discord channel ID where the bot listens and responds
CHANNEL_ID=1234567890

# Font path for caption overlay (relative to project root)
FONT_PATH="fonts/OpenSansExtraBold.ttf"

# Set to True if you have an NVIDIA GPU (faster encoding)
NVIDIA_GPU=False
```

### 4. Run the bot

```bash
python main.py
```

Or on Linux/macOS:

```bash
bash run.sh
```

---

## 💬 Discord Conversation Flow

Once the bot is online, the full interaction happens **inside your Discord channel**:

| Turn | Bot says | You reply |
|---|---|---|
| 1 | `🎬 Please send the link for Clip 1:` | Instagram reel URL |
| 2 | `✏️ Enter the caption for Clip 1:` | Your caption text |
| 3 | `🎬 Please send the link for Clip 2:` | Instagram reel URL |
| 4 | `✏️ Enter the caption for Clip 2:` | Your caption text |
| … | *(repeats through Clip 5)* | … |
| End | `⚙️ All 5 clips collected. Starting video processing...` | *(wait)* |
| Done | `✅ Processing complete! 📎 Download here: <url>` | — |

---

## 🎨 Video Output

- **Resolution:** 1080 × 1920 (portrait/9:16)
- **Header:** `RANKING BEST KITTY MOMENTS` (always visible)
- **Captions:** Numbered 1–5, each appears at the timestamp of its clip
- **Codec:** `h264_nvenc` (NVIDIA GPU) or `libx264` (CPU fallback)
- **Audio:** Preserved from original reels; silent clips get a silent audio track

---

## 🔑 Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ Yes | Your Discord bot's secret token |
| `CHANNEL_ID` | ✅ Yes | Discord channel ID for bot interaction |
| `FILEBIN_KEY` | ✅ Yes | Filebin bin name for uploads |
| `FONT_PATH` | ❌ Optional | Path to `.ttf` font for captions (falls back to system font) |
| `NVIDIA_GPU` | ❌ Optional | `True` to use NVIDIA hardware encoding (default: `False`) |

---

## 📦 Dependencies

```
requests
discord.py
instaloader
ffmpeg-python
python-dotenv
```

---

## ⚠️ Notes

- The bot must have **Message Content Intent** enabled in the Discord Developer Portal.
- Instagram may rate-limit or block downloads for private accounts. Public reels work best.
- Each run processes **one batch of 5 clips**. After processing, restart the bot to collect a new batch.