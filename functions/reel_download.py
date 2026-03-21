import os
def get_video_from_folder(folder):

    for file in os.listdir(folder):
        if file.lower().endswith((".mp4", ".mov", ".mkv", ".avi", ".webm")):
            return os.path.join(folder, file)

    raise Exception(f"No video found in {folder}folder")

def move_to_folder(destination="buffer", source="reels_downloads"):
    import shutil
    import os
    from functions.get_folders import get_folders_with_5_videos
    from functions.classify import classify

    video = get_video_from_folder(source)  # Check if video exists, will raise exception if not
    category, caption = classify(video)
    print(category, caption)
    folders = get_folders_with_5_videos()
    folders.sort()
    
    destination = os.path.join(destination, category) 

    if not os.path.exists(destination):
        os.makedirs(destination)

    for filename in os.listdir(source):
        if filename.endswith(".mp4"):
            shutil.move(os.path.join(source, filename), os.path.join(destination, caption + ".mp4"))
            print(f"Moved {filename} to {destination}")

def download_instagram_reel(url):
    import instaloader

    # Create instance
    L = instaloader.Instaloader(
    download_pictures=False,
    download_videos=True,
    download_video_thumbnails=False,
    download_geotags=False,
    download_comments=False,
    save_metadata=False,
    compress_json=False,
    post_metadata_txt_pattern="" 
)

    # Optional: Login (needed for private accounts)
    #L.login("your_username", "your_password")  # Replace with your credentials
    reel_url = url.strip()  # Remove any leading/trailing whitespace

    if reel_url[-1] != "/":
        reel_url = reel_url+"/" 
    # Extract shortcode
    shortcode = reel_url.split("/")[-2]

    # Download reel
    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        L.download_post(post, target="reels_downloads")

        move_to_folder()  # Move downloaded reels to buffer folder
        print("Reel downloaded successfully!")
    except Exception as e:
        print(f"Error downloading reel: {e}")

    print(" . ")
#download_instagram_reel("https://www.instagram.com/p/DU-mfZooJE8/")
