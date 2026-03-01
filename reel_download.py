def move_to_folder(destination="buffer", source="reels_downloads"):
    import shutil
    import os
    from get_folders import get_folders_with_5_videos

    folders = get_folders_with_5_videos()
    folders.sort()
    if folders:
        destination = os.path.join(destination, str(int(folders[-1])+1))
    else:
        destination = os.path.join(destination, "1") 

    if not os.path.exists(destination):
        os.makedirs(destination)

    for filename in os.listdir(source):
        if filename.endswith(".mp4"):
            shutil.move(os.path.join(source, filename), os.path.join(destination, filename))
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
#download_instagram_reel("https://www.instagram.com/p/DU-mfZooJE8/")
