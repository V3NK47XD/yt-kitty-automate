import os
import base64
import requests
from dotenv import load_dotenv
import ffmpeg

import json

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")


def getimage(video):

    frame_number = 30

    out, _ = (
        ffmpeg
        .input(video)
        .filter('select', f'eq(n,{frame_number})')
        .output('pipe:', vframes=1, format='image2', vcodec='mjpeg')
        .run(capture_stdout=True, capture_stderr=True)
    )

    if not out:
        raise Exception("Failed to extract frame")

    return out

def get_all_videos(base_folder="buffer"):
    if not os.path.exists(base_folder):
        os.makedirs(base_folder)
        print(f"📁 Created base folder: {base_folder}")

    all_videos = []

    for folder in os.listdir(base_folder):
        full_path = os.path.join(base_folder, folder)

        if os.path.isdir(full_path):
            video_files = [
                f for f in os.listdir(full_path)
                if f.endswith((".mp4", ".mov", ".mkv"))
            ]

            all_videos.extend(video_files)  # collect all videos

    return all_videos

def classify(video):

    categories = os.getenv("CATEGORIES").split(",")
    categories = [c.strip() for c in categories]

    print("Available categories:", categories)

    img = getimage(video)
    img_b64 = base64.b64encode(img).decode()

    prompt = f"""
You are a classifier.

Choose ONE category from this list:
{categories}
And don't use the below for caption:
{get_all_videos()}

Return ONLY strict JSON in this format:
{{
"category":"chosen category",
"caption":"short 2 word caption for video"
}}
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={API_KEY}"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": img_b64
                        }
                    }
                ]
            }
        ]
    }

    r = requests.post(url, json=payload)
    data = r.json()

    text = data["candidates"][0]["content"]["parts"][0]["text"]

    print(type(text))   # usually str

    result = json.loads(text)

    category = result["category"]
    caption = result["caption"]

    return category, caption