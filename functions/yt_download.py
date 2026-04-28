import os
import yt_dlp

def get_video_from_folder(folder):

    for file in os.listdir(folder):
        if file.lower().endswith((".mp4", ".mov", ".mkv", ".avi", ".webm")):
            return os.path.join(folder, file)

    raise Exception(f"No video found in {folder} folder")

def move_to_folder(destination="buffer", source="yt_downloads"):
    import shutil
    import os
    from functions.get_folders import get_folders_with_5_videos
    from functions.classify import classify

    video = get_video_from_folder(source)  # Check if video exists, will raise exception if not
    category, caption = classify(video)
    print(category, caption)
    folders = get_folders_with_5_videos()
    folders.sort()
    
    destination_path = os.path.join(destination, category) 

    if not os.path.exists(destination_path):
        os.makedirs(destination_path)

    for filename in os.listdir(source):
        if filename.endswith(".mp4"):
            shutil.move(os.path.join(source, filename), os.path.join(destination_path, caption + ".mp4"))
            print(f"Moved {filename} to {destination_path}")

def download_youtube_video(url):
    # Create downloads folder if it doesn't exist
    source_folder = "yt_downloads"
    if not os.path.exists(source_folder):
        os.makedirs(source_folder)

    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': f'{source_folder}/%(title)s.%(ext)s',
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url.strip()])
        
        move_to_folder()  # Move downloaded videos to buffer folder
        print("YouTube video downloaded successfully!")
    except Exception as e:
        print(f"Error downloading YouTube video: {e}")

    print(" . ")
