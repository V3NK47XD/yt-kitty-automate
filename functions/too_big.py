import ffmpeg
import os

def get_duration(file):
    probe = ffmpeg.probe(file)
    return float(probe['format']['duration'])


def trim_inplace(file):
    duration = get_duration(file)

    if duration <= 60:
        return  # nothing to do

    temp_file = file + ".tmp.mp4"

    (
        ffmpeg
        .input(file, t=60)
        .output(temp_file, c='copy')
        .overwrite_output()
        .run()
    )

    os.replace(temp_file, file)  # 🔥 overwrite original safely