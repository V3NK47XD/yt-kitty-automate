import asyncio
from functions.combine import combine_buffer
from functions.add_text import add_text_to_video
from functions.get_folders import get_folders_with_5_videos
from functions.discord_bot import send_message_sync, start_bot
import os
from functions.upload import upload_to_filebin


def process(folders, captions):
    for folder in folders:
        names, timestamps, output_file = combine_buffer(folder)

        output_video = add_text_to_video(
            output_file,
            captions,
            timestamps
        )
        url = upload_to_filebin(output_video)

        send_message_sync(
            f"✅ Processing complete!\n📎 Download your video here: {url}"
        )


def check(captions):
    folders = get_folders_with_5_videos()
    if folders:
        print(f"Processing folders: {folders}")
        process(folders, captions)
    else:
        send_message_sync(
            "⚠️ No folders with exactly 5 clips found in buffer. "
            "Please re-send the clips."
        )


async def main():
    signal_queue = asyncio.Queue()

    print("🤖 Bot starting...")

    asyncio.create_task(start_bot(signal_queue))

    print("🤖 Bot started. Waiting for signals...")

    while True:
        signal, captions = await signal_queue.get()

        if signal == "PROCESS":
            print("🚀 Signal received from bot. Processing...")
            await asyncio.to_thread(check, captions)


if __name__ == "__main__":
    asyncio.run(main())