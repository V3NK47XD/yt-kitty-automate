def get_folders_with_5_videos(base_folder="buffer"):
    import os
    valid_folders = []

    for folder in os.listdir(base_folder):
        full_path = os.path.join(base_folder, folder)

        if os.path.isdir(full_path):
            video_files = [
                f for f in os.listdir(full_path)
                if f.endswith((".mp4", ".mov", ".mkv"))
            ]

            if len(video_files) == 5:
                valid_folders.append(folder)

    return valid_folders