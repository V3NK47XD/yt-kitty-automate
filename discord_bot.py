import re
import discord
import asyncio
from discord.ext import commands
from reel_download import download_instagram_reel
import os
from dotenv import load_dotenv

load_dotenv()
bot_instance = None
TOKEN = os.getenv("DISCORD_TOKEN")
INSTAGRAM_PATTERN = re.compile(
    r"https?://(www\.)?instagram\.com/(reel|p)/[A-Za-z0-9_-]+/?"
)

async def start_bot(signal_queue):
    
    intents = discord.Intents.default()
    intents.message_content = True

    bot = commands.Bot(command_prefix="!", intents=intents)
    global bot_instance
    global event_loop
    bot_instance = bot
    @bot.event
    async def on_ready():
        print(f"✅ Bot logged in as {bot.user}")

    @bot.event
    async def on_message(message):
        if message.author.bot:
            return

        match = INSTAGRAM_PATTERN.search(message.content)

        if match:
            await message.channel.send("📥 Downloading reel...")

            try:
                await asyncio.to_thread(download_instagram_reel, match.group())
                await message.channel.send("✅ Downloaded!")
                await signal_queue.put("PROCESS")

            except Exception as e:
                await message.channel.send(f"❌ Error: {e}")

        await bot.process_commands(message)
    


    await bot.start(TOKEN)   # 🔥 IMPORTANT

async def send_message(channel_id, text):
    channel = bot_instance.get_channel(channel_id)
    if channel:
        await channel.send(text)

def send_message_sync(channel_id, text):
    asyncio.run_coroutine_threadsafe(
        send_message(channel_id, text),
        bot_instance.loop
    )