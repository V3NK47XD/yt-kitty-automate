import os
import shutil
import subprocess


def get_next_buffer_folder(base="buffer"):
    """Determine the next available buffer folder number."""
    if not os.path.exists(base):
        os.makedirs(base)

    existing = [
        int(d) for d in os.listdir(base)
        if os.path.isdir(os.path.join(base, d)) and d.isdigit()
    ]
    return os.path.join(base, str(max(existing, default=0) + 1))


def move_to_folder(destination, source="reels_downloads"):
    """Move downloaded .mp4 files from source into the given destination folder."""
    if not os.path.exists(destination):
        os.makedirs(destination)

    for filename in os.listdir(source):
        if filename.endswith(".mp4"):
            existing = [f for f in os.listdir(destination) if f.endswith(".mp4")]
            new_name = f"clip_{len(existing) + 1:03d}.mp4"
            shutil.move(
                os.path.join(source, filename),
                os.path.join(destination, new_name),
            )
            print(f"Moved {filename} → {new_name} in {destination}")


def download_instagram_reel(url, buffer_folder):
    """Download an Instagram reel using yt-dlp and move it to buffer_folder."""
    reel_url = url.strip()
    download_dir = "reels_downloads"

    os.makedirs(download_dir, exist_ok=True)

    # Use yt-dlp to download the reel
    cmd = [
        "yt-dlp",
        "--no-warnings",
        "--no-playlist",
        "-f", "mp4/best",
        "--merge-output-format", "mp4",
        "-o", os.path.join(download_dir, "%(id)s.%(ext)s"),
        reel_url,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        error_msg = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"yt-dlp failed: {error_msg}")

    # Move downloaded file into the buffer folder
    move_to_folder(buffer_folder, source=download_dir)
    print("Reel downloaded successfully!")
