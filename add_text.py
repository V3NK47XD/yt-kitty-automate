
def get_font():
    import os
    import platform
    import subprocess

    # 1. Try .env
    font = os.getenv("FONT_PATH")
    if font and os.path.isfile(font):
        return font

    # 2. Try fc-match (Linux/macOS)
    try:
        result = subprocess.run(
            ["fc-match", "--format=%{file}", "sans-serif"],
            capture_output=True, text=True
        )
        path = result.stdout.strip()
        if path and os.path.isfile(path):
            return path
    except Exception:
        pass

    # 3. Try common OS font dirs
    system = platform.system()
    if system == "Windows":
        font_dir = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts")
    elif system == "Darwin":
        font_dir = "/Library/Fonts"
    else:
        font_dir = "/usr/share/fonts"

    for root, _, files in os.walk(font_dir):
        for f in files:
            if f.lower().endswith(".ttf"):
                return os.path.join(root, f)

    # 4. Give up, let FFmpeg use its default
    return None

def add_text_to_video(input_video, texts, times):
    import os
    import ffmpeg
    from datetime import datetime
    from dotenv import load_dotenv

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_video = f"output_{now}.mp4"
    font = get_font()
    size = 60
    border = 4

    inp = ffmpeg.input(input_video)

    video = (
        inp.video
        .drawtext(
            fontfile=font,
            text="RANKING ",
            enable=f"between(t,{times[0]},{times[-1]})",
            x=180, y=140,
            fontsize=90,
            borderw=border,
            fontcolor="cyan"
        )
        .drawtext(
            fontfile=font,
            text="BEST ",
            enable=f"between(t,{times[0]},{times[-1]})",
            x=660, y=140,
            fontsize=90,
            borderw=border,
            fontcolor="yellow"
        )
        .drawtext(
            fontfile=font,
            text="KITTY MOMENTS ",
            enable=f"between(t,{times[0]},{times[-1]})",
            x=130, y=220,
            fontsize=100,
            borderw=border,
            fontcolor="#C11C84"
        )
        .drawtext(
            fontfile=font,
            text="1.",
            enable=f"between(t,{times[0]},{times[-1]})",
            x=55, y=535,
            fontsize=size,
            borderw=border,
            fontcolor="yellow"
        )
        .drawtext(
            fontfile=font,
            text=texts[0],
            enable=f"between(t,{times[0]},{times[-1]})",
            x=130, y=535,
            fontsize=size,
            borderw=border,
            fontcolor="white"
        )
        .drawtext(
            fontfile=font,
            text="2.",
            enable=f"between(t,{times[0]},{times[-1]})",
            x=55, y=790,
            fontsize=size,
            borderw=border,
            fontcolor="cyan"
        )
        .drawtext(
            fontfile=font,
            text=texts[1],
            enable=f"between(t,{times[1]},{times[-1]})",
            x=130, y=790,
            fontsize=size,
            borderw=border,
            fontcolor="white"
        )
        .drawtext(
            fontfile=font,
            text="3.",
            enable=f"between(t,{times[0]},{times[-1]})",
            x=55, y=1030,
            fontsize=size,
            borderw=border,
            fontcolor="red"
        )
        .drawtext(
            fontfile=font,
            text=texts[2],
            enable=f"between(t,{times[2]},{times[-1]})",
            x=130, y=1030,
            fontsize=size,
            borderw=border,
            fontcolor="white"
        )
        .drawtext(
            fontfile=font,
            text="4.",
            enable=f"between(t,{times[0]},{times[-1]})",
            x=55, y=1280,
            fontsize=size,
            borderw=border,
            fontcolor="green"
        )
        .drawtext(
            fontfile=font,
            text=texts[3],
            enable=f"between(t,{times[3]},{times[-1]})",
            x=130, y=1280,
            fontsize=size,
            borderw=border,
            fontcolor="white"
        )
        .drawtext(
            fontfile=font,
            text="5.",
            enable=f"between(t,{times[0]},{times[-1]})",
            x=55, y=1550,
            fontsize=size,
            borderw=border,
            fontcolor="#C11C84"
        )
        .drawtext(
            fontfile=font,
            text=texts[4],
            enable=f"between(t,{times[4]},{times[-1]})",
            x=130, y=1550,
            fontsize=size,
            borderw=border,
            fontcolor="white"
        )
    )
    if os.getenv("NVIDIA_GPU", "False").lower() == "true":
        gpu_codec = "h264_nvenc"
    else:
        gpu_codec = "libx264"
        
    out = ffmpeg.output(
        video,
        inp.audio,              # 🔥 audio explicitly mapped
        output_video,
        #vcodec="libx264",
        vcodec=gpu_codec,
        acodec="aac",
        audio_bitrate="192k",
        pix_fmt="yuv420p"
    )

    out.run(overwrite_output=True)
    os.remove(input_video)
    print("Batch done execution")

    return output_video

#example
'''add_text_to_video(
    "combined_temp.mp4",
    ["First Text","Second Text","Third Text","Fourth Text","Fifth Text"],
    [0, 8, 32, 46, 62, 69]
)'''