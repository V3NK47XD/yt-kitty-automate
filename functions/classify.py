import base64
import json
import os

import ffmpeg
import requests
from dotenv import load_dotenv
from google import genai

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")


def getimage(video):

    frame_number = 30

    out, _ = (
        ffmpeg.input(video)
        .filter("select", f"eq(n,{frame_number})")
        .output("pipe:", vframes=1, format="image2", vcodec="mjpeg")
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
                f for f in os.listdir(full_path) if f.endswith((".mp4", ".mov", ".mkv"))
            ]

            all_videos.extend(video_files)  # collect all videos

    return all_videos


def remove_audio(video_path):
    dir_name = os.path.dirname(video_path)
    base_name = os.path.basename(video_path)
    output_path = (
        os.path.join(dir_name, f"temp_muted_{base_name}")
        if dir_name
        else f"temp_muted_{base_name}"
    )

    try:
        (
            ffmpeg.input(video_path)
            .output(output_path, vcodec="copy", an=None)
            .run(capture_stdout=True, capture_stderr=True, overwrite_output=True)
        )
    except ffmpeg.Error as e:
        print("FFmpeg Error:", e.stderr.decode() if e.stderr else e)
        raise

    return output_path


def classify(video):

    categories = os.getenv("CATEGORIES").split(",")
    categories = [c.strip() for c in categories]

    print("Available categories:", categories)

    prompt = f"""
You are a classifier and video describer. AND FOLLOW STRICT INSTUCTION. OUPUT ONLY JSON AND NOTHING ELSE.
Make a high descriptive caption for the given video. And add a bit of humor, or make the caption catchy. Strict 2 word caption limit.

Choose ONE category from this list:
{categories}
And don't use the below for caption:
{get_all_videos()}
ONLY OUTPUT THE JSON, NOT ANYTHING ELSE. JUST THE JSON FORMAT SPECIFIED BELOW.
Return ONLY strict JSON in this format:
{{
"category":"chosen category",
"caption":"short 2 word caption for video, for youtube shorts"
}}
"""
    print("sending to gemma")
    client = genai.Client(api_key=API_KEY)

    video_file_name = remove_audio(video)
    video_bytes = open(video_file_name, "rb").read()

    if os.path.exists(video_file_name):
        os.remove(video_file_name)
    response = client.models.generate_content(
        model="gemma-4-31b-it",
        contents=genai.types.Content(
            parts=[
                genai.types.Part(
                    inline_data=genai.types.Blob(
                        data=video_bytes, mime_type="video/mp4"
                    )
                ),
                genai.types.Part(text=prompt),
            ]
        ),
    )

    text = response.text

    # clean markdown ```json ```
    text = text.strip().replace("```json", "").replace("```", "").strip()

    result = json.loads(text)

    category = result["category"]
    caption = result["caption"]

    return category, caption
