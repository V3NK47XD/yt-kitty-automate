import asyncio
from combine import combine_buffer
from add_text import add_text_to_video
from get_folders import get_folders_with_5_videos
from discord_bot import send_message_sync, start_bot
import requests
from dotenv import load_dotenv
import os
from upload import upload_to_filebin

def process(folders):
    for folder in folders:
        names, timestamps, output_file = combine_buffer(folder)

        output_video = add_text_to_video(
            output_file,
            ["First Text","Second Text","Third Text","Fourth Text","Fifth Text"],
            timestamps
        )
        url = upload_to_filebin(output_video)

        send_message_sync(
    int(os.getenv("CHANNEL_ID")),
    f"✅ Processing complete. File at {url}"
)
    

def check():
    folders = get_folders_with_5_videos()
    if folders:
        print(f"Processing folders: {folders}")
        process(folders)



async def main():
    signal_queue = asyncio.Queue()

    print("🤖 Bot starting...")

    # Start bot in background
    asyncio.create_task(start_bot(signal_queue))

    print("🤖 Bot started. Waiting for signals...")

    while True:
        signal = await signal_queue.get()

        if signal == "PROCESS":
            print("🚀 Signal received from bot. Processing...")
            await asyncio.to_thread(check)

if __name__ == "__main__":
    asyncio.run(main())