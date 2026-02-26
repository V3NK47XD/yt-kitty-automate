import os
from combine import combine_buffer
from add_text import add_text_to_video
from get_folders import get_folders_with_5_videos


def process(folders):

    for folder in folders:
        names, timestamps, output_file = combine_buffer(folder)

        add_text_to_video(
            output_file,
            ["First Text","Second Text","Third Text","Fourth Text","Fifth Text"],
            timestamps
        )
    
def check():
    folders = get_folders_with_5_videos()
    if folders != []:
        print(f"Processing folders: {folders}")
        process(folders)
check()
