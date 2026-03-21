
# ⚙️ What it does

### Once the bot runs:

1. 🔍 Scans a Discord channel for recent reel/video links
2. ⬇️ Downloads all detected videos
3. 🎞️ Merges them into a single compiled video
4. 🤖 Uses Gemini API to generate:
    -Caption ✍️
    -Category 🏷️
5. ☁️ Uploads the final video to Filebin
6. 🔗 Sends the downloadable link back to Discord

# 🔧 Configuration

### All settings are easily configurable via a .env file:

- Discord bot token 🔑
- Channel ID 📡
- Gemini API key 🤖
- File handling settings ⚙️
- Categories / titles mapping 🏷️
- NVIDIA GPU usage for video processing (optional) 🚀
- Font path for text overlay (optional) 🎨


# Setup the project with 
```bash
python setup.py
```
### ⚠️ Reopen New Terminal to make it work good. ⚠️

## Install dependencies with 
```bash
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file in the project root with the following format:

```env
# Discord Bot Configuration
DISCORD_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"

# Filebin settings
FILEBIN_KEY="smalltext"

# Channel / IDs
CHANNEL_ID=1234567890

# Font path (optional, for add_text.py)
FONT_PATH = "fonts/OpenSansExtraBold.ttf"

# NVIDIA GPU usage (optional, for combine.py)
NVIDIA_GPU = False

CATEGORIES = "cats, dogs , other"

TITLE = '{"cats":"KITTY MOMENTS","dogs":"PUPPY MOMENTS","other":"WORTHY MOMENTS" }'

GEMINI_API_KEY = "API-KEY-HERE"
```


## Run the bot with 
```bash
python main.py
```