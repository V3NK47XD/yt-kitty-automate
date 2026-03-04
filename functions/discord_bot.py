import discord
import asyncio
from discord.ext import commands
import os
from dotenv import load_dotenv
from functions.reel_download import download_instagram_reel

load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")
CHANNEL_ID = int(os.getenv("CHANNEL_ID"))

bot_instance = None

# ─── Per-channel conversation state ───────────────────────────────────────────
# State keys:
#   step   : int  → current clip number (1–5)
#   phase  : str  → "link" | "caption"
#   captions: list → collected caption strings

conversation_state = {}

def _initial_state():
    return {"step": 1, "phase": "link", "captions": []}


# ─── Bot setup ────────────────────────────────────────────────────────────────

async def start_bot(signal_queue):
    global bot_instance

    intents = discord.Intents.default()
    intents.message_content = True

    bot = commands.Bot(command_prefix="!", intents=intents)
    bot_instance = bot

    @bot.event
    async def on_ready():
        print(f"✅ Bot logged in as {bot.user}")

        channel = bot.get_channel(CHANNEL_ID)
        if channel:
            # Reset state fresh on every startup
            conversation_state[CHANNEL_ID] = _initial_state()
            await channel.send(
                "🤖 **Kitty Bot is online!**\n\n"
                "🎬 Please send the link for **Clip 1:**"
            )

    @bot.event
    async def on_message(message):
        if message.author.bot:
            return

        if message.channel.id != CHANNEL_ID:
            return

        state = conversation_state.get(CHANNEL_ID)
        if state is None:
            # Shouldn't happen, but guard anyway
            conversation_state[CHANNEL_ID] = _initial_state()
            state = conversation_state[CHANNEL_ID]

        content = message.content.strip()
        step = state["step"]
        phase = state["phase"]

        # ── Phase: waiting for an Instagram link ──────────────────────────────
        if phase == "link":
            if "instagram.com" not in content:
                await message.channel.send(
                    f"⚠️ That doesn't look like an Instagram link. "
                    f"Please send a valid Instagram reel URL for **Clip {step}:**"
                )
                return

            await message.channel.send(f"📥 Downloading Clip {step}...")

            try:
                await asyncio.to_thread(download_instagram_reel, content)
                await message.channel.send(
                    f"✅ Clip {step} downloaded!\n\n"
                    f"✏️ Now enter the **caption for Clip {step}:**"
                )
                state["phase"] = "caption"

            except Exception as e:
                await message.channel.send(
                    f"❌ Error downloading Clip {step}: {e}\n"
                    f"Please try again — send the link for **Clip {step}:**"
                )

        # ── Phase: waiting for a caption ──────────────────────────────────────
        elif phase == "caption":
            if not content:
                await message.channel.send(
                    f"⚠️ Caption can't be empty. "
                    f"Please enter a caption for **Clip {step}:**"
                )
                return

            state["captions"].append(content)

            if step < 5:
                # Advance to next clip
                state["step"] = step + 1
                state["phase"] = "link"
                await message.channel.send(
                    f"✅ Caption saved for Clip {step}!\n\n"
                    f"🎬 Please send the link for **Clip {step + 1}:**"
                )
            else:
                # All 5 clips collected — fire processing
                captions = state["captions"][:]
                conversation_state.pop(CHANNEL_ID, None)

                await message.channel.send(
                    "✅ Caption saved for Clip 5!\n\n"
                    "⚙️ **All 5 clips collected. Starting video processing...**"
                )
                await signal_queue.put(("PROCESS", captions))

        await bot.process_commands(message)

    await bot.start(TOKEN)


# ─── Messaging helpers ────────────────────────────────────────────────────────

async def send_message(channel_id, text):
    channel = bot_instance.get_channel(channel_id)
    if channel:
        await channel.send(text)


def send_message_sync(text):
    asyncio.run_coroutine_threadsafe(
        send_message(CHANNEL_ID, text),
        bot_instance.loop
    )