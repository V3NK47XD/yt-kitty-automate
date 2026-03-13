import re
import discord
import asyncio
from discord.ext import commands, tasks
from functions.reel_download import download_instagram_reel
import os
from dotenv import load_dotenv

load_dotenv()
bot_instance = None
TOKEN = os.getenv("DISCORD_TOKEN")
INSTAGRAM_PATTERN = re.compile(
    r"https?://(www\.)?instagram\.com/(reels|reel|p)/[A-Za-z0-9_-]+/?"
)

POLL_INTERVAL = 10  # seconds between each history check


async def start_bot(signal_queue):

    intents = discord.Intents.default()
    intents.message_content = True

    bot = commands.Bot(command_prefix="!", intents=intents)
    global bot_instance
    bot_instance = bot

    @bot.event
    async def on_ready():
        print(f"✅ Bot logged in as {bot.user}")
        # Start polling message history once bot is ready
        poll_history.start(bot, signal_queue)

    await bot.start(TOKEN)


@tasks.loop(seconds=POLL_INTERVAL)
async def poll_history(bot, signal_queue):
    """Periodically read channel history and process new reel links."""
    channel_id = int(os.getenv("CHANNEL_ID"))
    channel = bot.get_channel(channel_id)
    if not channel:
        print(f"⚠️ Could not find channel {channel_id}")
        return

    # Collect messages from newest → oldest, stopping at "Flagged"
    messages_to_process = []
    async for msg in channel.history(limit=200):
        if msg.content.strip().lower() == "flagged":
            break
        messages_to_process.append(msg)

    # Reverse so we process oldest first
    messages_to_process.reverse()

    if not messages_to_process:
        return

    processed_any = False
    for msg in messages_to_process:
        match = INSTAGRAM_PATTERN.search(msg.content)
        if match:
            reel_link = match.group()

            # Use text alongside the link as the video name,
            # fallback to the reel ID from the URL
            remaining_text = msg.content.replace(reel_link, "").strip()
            if remaining_text:
                video_name = remaining_text
            else:
                video_name = reel_link.rstrip("/").split("/")[-1]

            await channel.send(f"📥 Downloading reel: **{video_name}**...")

            try:
                await asyncio.to_thread(download_instagram_reel, reel_link, video_name)
                await channel.send(f"✅ Downloaded: **{video_name}**")
                processed_any = True
            except Exception as e:
                await channel.send(f"❌ Error downloading {reel_link}: {e}")

    # Mark everything as processed
    await channel.send("Flagged")

    if processed_any:
        await signal_queue.put("PROCESS")


async def send_message(channel_id, text):
    channel = bot_instance.get_channel(channel_id)
    if channel:
        await channel.send(text)


def send_message_sync(text):
    asyncio.run_coroutine_threadsafe(
        send_message(int(os.getenv("CHANNEL_ID")), text), bot_instance.loop
    )