def combine_buffer(folder):
    import os
    import ffmpeg

    BUFFER_FOLDER = os.path.join("buffer", folder)
    OUTPUT_FILE = f"combined_{folder}.mp4"

    TARGET_WIDTH = 1080
    TARGET_HEIGHT = 1920

    videos = sorted(os.listdir(BUFFER_FOLDER))
    videos = [v for v in videos if v.endswith((".mp4", ".mov", ".mkv"))][:5]

    if len(videos) < 5:
        raise Exception("Less than 5 videos found.")

    names_array = []
    timestamps = [0]
    total_time = 0

    streams = []

    for video in videos:
        path = os.path.join(BUFFER_FOLDER, video)

        probe = ffmpeg.probe(path)
        duration = float(probe["format"]["duration"])

        total_time += duration
        timestamps.append(round(total_time))
        names_array.append(video)

        inp = ffmpeg.input(path)

        # Normalize video to 1080x1920
        v = (
    inp.video
    .filter(
        "scale",
        "if(gt(a,9/16),1080,-1)",
        "if(gt(a,9/16),-1,1920)"
    )
    .filter("pad", 1080, 1920, "(ow-iw)/2", "(oh-ih)/2")
    .filter("setsar", 1)
)

        # Check if audio exists
        has_audio = any(s["codec_type"] == "audio" for s in probe["streams"])

        if has_audio:
            a = inp.audio
        else:
            # 🔥 Create silent audio if missing
            a = ffmpeg.input(
                "anullsrc=channel_layout=stereo:sample_rate=44100",
                f="lavfi",
                t=duration
            )

        streams.extend([v, a])

    # CONCAT (now ALWAYS safe)
    joined = (
        ffmpeg
        .concat(*streams, v=1, a=1)
        .output(
            OUTPUT_FILE,
            #vcodec="libx264",
            vcodec="h264_nvenc",
            acodec="aac",
            pix_fmt="yuv420p"
        )
    )

    joined.run(overwrite_output=True)

    # Delete processed videos
    for video in names_array:
        os.remove(os.path.join(BUFFER_FOLDER, video))
    os.rmdir(BUFFER_FOLDER)

    return names_array, timestamps ,OUTPUT_FILE
